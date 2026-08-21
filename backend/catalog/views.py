from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, views
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Product
from .serializers import (
    ProductCreateSerializer,
    ProductImageUploadSerializer,
    ProductLookupSerializer,
    ProductSerializer,
    ProductUpdateSerializer,
)
from .services import OpenFoodFactsClient, upsert_from_off


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    search_fields = ["name", "brand", "barcode", "category"]
    ordering_fields = ["name", "created_at", "stats__avg_rating", "stats__review_count"]

    def get_queryset(self):
        qs = Product.objects.select_related("stats", "created_by").filter(merged_into__isnull=True)
        q = self.request.query_params.get("q")
        barcode = self.request.query_params.get("barcode")
        if barcode:
            qs = qs.filter(barcode=barcode)
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(brand__icontains=q)
                | Q(barcode__icontains=q)
                | Q(category__icontains=q)
            )
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductCreateSerializer
        return ProductSerializer

    def list(self, request, *args, **kwargs):
        q = (request.query_params.get("q") or "").strip()
        queryset = self.filter_queryset(self.get_queryset())
        import_off = request.query_params.get("import_off", "1") != "0"

        if q and import_off and not queryset.exists():
            client = OpenFoodFactsClient()
            for payload in client.search_by_name(q):
                upsert_from_off(payload)
            queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        serializer = ProductSerializer(
            page if page is not None else queryset,
            many=True,
            context={"request": request},
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        barcode = serializer.validated_data.get("barcode")
        if barcode:
            existing = Product.objects.filter(barcode=barcode, merged_into__isnull=True).first()
            if existing:
                return Response(
                    {
                        **ProductSerializer(existing, context={"request": request}).data,
                        "already_exists": True,
                        "detail": "A product with this barcode already exists. Your review should go on that card.",
                    },
                    status=status.HTTP_200_OK,
                )
        product = serializer.save(
            created_by=request.user,
            source=Product.Source.USER,
        )
        return Response(
            ProductSerializer(product, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProductDetailView(generics.RetrieveUpdateAPIView):
    queryset = Product.objects.select_related("stats", "created_by").all()
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ProductUpdateSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def retrieve(self, request, *args, **kwargs):
        product = self.get_object()
        if product.merged_into_id:
            canonical = product.merged_into
            return Response(
                {
                    **ProductSerializer(canonical, context={"request": request}).data,
                    "redirected_from": product.id,
                    "detail": "This product was merged into a canonical card.",
                }
            )
        return Response(ProductSerializer(product, context={"request": request}).data)

    def partial_update(self, request, *args, **kwargs):
        product = self.get_object()
        if not product.can_edit_details(request.user):
            raise PermissionDenied("Only the creator can edit this product.")
        serializer = ProductUpdateSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProductSerializer(product, context={"request": request}).data)


class ProductLookupView(views.APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=ProductLookupSerializer,
        responses={200: ProductSerializer, 201: ProductSerializer, 404: None},
    )
    def post(self, request):
        serializer = ProductLookupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        barcode = serializer.validated_data["barcode"].strip()

        existing = (
            Product.objects.select_related("stats", "created_by")
            .filter(barcode=barcode, merged_into__isnull=True)
            .first()
        )
        if existing:
            return Response(ProductSerializer(existing, context={"request": request}).data)

        client = OpenFoodFactsClient()
        payload = client.lookup_barcode(barcode)
        if not payload:
            return Response(
                {
                    "detail": "Product not found in Open Food Facts. Create it manually.",
                    "barcode": barcode,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        product, created = upsert_from_off(payload)
        return Response(
            ProductSerializer(product, context={"request": request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ProductImageUploadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request=ProductImageUploadSerializer, responses={200: ProductSerializer})
    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        if product.merged_into_id:
            raise PermissionDenied("This product was merged. Edit the canonical product instead.")
        if not product.can_edit_image(request.user):
            if product.is_global_catalog:
                raise PermissionDenied(
                    "Catalog products (Open Food Facts / global) cannot have their main photo changed by users. "
                    "Add photos on your review instead."
                )
            raise PermissionDenied("Only the user who created this product can change its photo.")
        serializer = ProductImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product.image = serializer.validated_data["image"]
        product.save(update_fields=["image", "updated_at"])
        return Response(ProductSerializer(product, context={"request": request}).data)
