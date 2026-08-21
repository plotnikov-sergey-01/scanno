from datetime import timedelta

from django.db.models import Count, F, FloatField, Max, Q
from django.db.models.functions import Cast
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from reviews.models import Review, Verdict, Visibility
from reviews.serializers import ReviewListSerializer
from .models import Product
from .serializers import ProductSerializer


class DiscoverFeedView(APIView):
    """Public discovery feeds for browse / explore."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        feed = request.query_params.get("feed", "recent_products")
        limit = min(int(request.query_params.get("limit", 20)), 50)
        days = min(int(request.query_params.get("days", 7)), 90)
        since = timezone.now() - timedelta(days=days)
        ctx = {"request": request}

        if feed == "recent_products":
            qs = (
                Product.objects.filter(merged_into__isnull=True)
                .select_related("stats")
                .order_by("-created_at")[:limit]
            )
            return Response(
                {
                    "feed": feed,
                    "results": ProductSerializer(qs, many=True, context=ctx).data,
                }
            )

        if feed == "recent_reviews":
            qs = (
                Review.objects.filter(
                    visibility=Visibility.PUBLIC,
                    is_hidden=False,
                    product__merged_into__isnull=True,
                )
                .select_related("user", "user__profile", "product")
                .prefetch_related("images")
                .order_by("-created_at")[:limit]
            )
            return Response(
                {
                    "feed": feed,
                    "results": ReviewListSerializer(qs, many=True, context=ctx).data,
                }
            )

        if feed == "top_rated":
            qs = (
                Product.objects.filter(
                    merged_into__isnull=True,
                    stats__review_count__gte=1,
                )
                .select_related("stats")
                .annotate(
                    period_reviews=Count(
                        "reviews",
                        filter=Q(
                            reviews__visibility=Visibility.PUBLIC,
                            reviews__is_hidden=False,
                            reviews__created_at__gte=since,
                        ),
                        distinct=True,
                    )
                )
                .filter(period_reviews__gte=1)
                .order_by("-stats__avg_rating", "-stats__review_count")[:limit]
            )
            return Response(
                {
                    "feed": feed,
                    "days": days,
                    "results": ProductSerializer(qs, many=True, context=ctx).data,
                }
            )

        if feed == "most_hated":
            qs = (
                Product.objects.filter(merged_into__isnull=True, stats__review_count__gte=1)
                .select_related("stats")
                .annotate(
                    period_never=Count(
                        "reviews",
                        filter=Q(
                            reviews__verdict=Verdict.NEVER_AGAIN,
                            reviews__visibility=Visibility.PUBLIC,
                            reviews__is_hidden=False,
                            reviews__created_at__gte=since,
                        ),
                        distinct=True,
                    )
                )
                .filter(period_never__gte=1)
                .order_by("-period_never", "-stats__never_again_count")[:limit]
            )
            data = ProductSerializer(qs, many=True, context=ctx).data
            never_map = {p.id: p.period_never for p in qs}
            for item in data:
                item["period_never_again"] = never_map.get(item["id"], 0)
            return Response({"feed": feed, "days": days, "results": data})

        if feed == "most_discussed":
            qs = (
                Product.objects.filter(merged_into__isnull=True)
                .select_related("stats")
                .annotate(
                    recent_activity=Max(
                        "reviews__created_at",
                        filter=Q(
                            reviews__visibility=Visibility.PUBLIC,
                            reviews__is_hidden=False,
                        ),
                    ),
                    period_reviews=Count(
                        "reviews",
                        filter=Q(
                            reviews__visibility=Visibility.PUBLIC,
                            reviews__is_hidden=False,
                            reviews__created_at__gte=since,
                        ),
                        distinct=True,
                    ),
                )
                .filter(period_reviews__gte=1)
                .order_by("-period_reviews", "-recent_activity")[:limit]
            )
            data = ProductSerializer(qs, many=True, context=ctx).data
            activity = {p.id: p.period_reviews for p in qs}
            for item in data:
                item["period_review_count"] = activity.get(item["id"], 0)
            return Response({"feed": feed, "days": days, "results": data})

        return Response(
            {
                "detail": "Unknown feed. Use recent_products, recent_reviews, top_rated, most_hated, most_discussed."
            },
            status=400,
        )


class ProductBrowseView(generics.ListAPIView):
    """Filterable product browse: category, min rating, sort."""

    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Product.objects.filter(merged_into__isnull=True).select_related("stats")
        category = self.request.query_params.get("category")
        min_rating = self.request.query_params.get("min_rating")
        min_never = self.request.query_params.get("min_never_again_pct")
        sort = self.request.query_params.get("sort", "recent")
        has_reviews = self.request.query_params.get("has_reviews")

        if category:
            qs = qs.filter(category__icontains=category)
        if min_rating:
            qs = qs.filter(stats__avg_rating__gte=min_rating)
        if has_reviews == "1":
            qs = qs.filter(stats__review_count__gte=1)
        if min_never:
            try:
                threshold = float(min_never)
            except ValueError:
                threshold = 0
            qs = (
                qs.filter(stats__review_count__gt=0)
                .annotate(
                    never_pct=Cast(F("stats__never_again_count"), FloatField())
                    * 100.0
                    / Cast(F("stats__review_count"), FloatField())
                )
                .filter(never_pct__gte=threshold)
            )

        if sort == "rating":
            qs = qs.order_by("-stats__avg_rating", "-stats__review_count")
        elif sort == "reviews":
            qs = qs.order_by("-stats__review_count", "-stats__avg_rating")
        elif sort == "never_again":
            qs = qs.order_by("-stats__never_again_count", "-stats__review_count")
        elif sort == "name":
            qs = qs.order_by("name")
        else:
            qs = qs.order_by("-created_at")
        return qs
