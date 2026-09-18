from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, views
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from catalog.models import Product
from .models import Comment, CommentReaction, Review, ReviewImage, ReviewLike, Visibility, visible_comment_prefetch
from .serializers import (
    CommentSerializer,
    ReviewCreateUpdateSerializer,
    ReviewDetailSerializer,
    ReviewImageSerializer,
    ReviewImageUploadSerializer,
    ReviewListSerializer,
)


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user_id == request.user.id


class ProductReviewListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_product(self):
        return get_object_or_404(Product, pk=self.kwargs["product_id"])

    def get_queryset(self):
        product = self.get_product()
        qs = (
            Review.objects.filter(product=product, is_hidden=False)
            .select_related("user", "user__profile", "product")
            .prefetch_related("images", "likes", visible_comment_prefetch())
        )
        user = self.request.user
        if user.is_authenticated:
            return qs.filter(Q(visibility=Visibility.PUBLIC) | Q(user=user))
        return qs.filter(visibility=Visibility.PUBLIC)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ReviewCreateUpdateSerializer
        return ReviewListSerializer

    def perform_create(self, serializer):
        product = self.get_product()
        if Review.objects.filter(user=self.request.user, product=product).exists():
            raise PermissionDenied("You already reviewed this product. Update your existing review.")
        serializer.save(user=self.request.user, product=product)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        review = serializer.instance
        return Response(
            ReviewDetailSerializer(review, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyReviewsView(generics.ListAPIView):
    serializer_class = ReviewListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            Review.objects.filter(user=self.request.user, is_hidden=False)
            .select_related("user", "user__profile", "product")
            .prefetch_related("images", "likes", visible_comment_prefetch())
        )
        verdict = self.request.query_params.get("verdict")
        if verdict:
            qs = qs.filter(verdict=verdict)
        visibility = self.request.query_params.get("visibility")
        if visibility:
            qs = qs.filter(visibility=visibility)
        return qs


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    queryset = Review.objects.select_related("user", "user__profile", "product").prefetch_related(
        "images", "likes", visible_comment_prefetch()
    )

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ReviewCreateUpdateSerializer
        return ReviewDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        review = self.get_object()
        if review.is_hidden:
            raise PermissionDenied("Review is hidden.")
        if review.visibility == Visibility.PRIVATE and (
            not request.user.is_authenticated or request.user.id != review.user_id
        ):
            raise PermissionDenied("This review is private.")
        return Response(ReviewDetailSerializer(review, context={"request": request}).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        review = self.get_object()
        serializer = ReviewCreateUpdateSerializer(review, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ReviewDetailSerializer(review, context={"request": request}).data)


class ReviewImageUploadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        review = get_object_or_404(Review, pk=pk)
        if review.user_id != request.user.id:
            raise PermissionDenied("Not your review.")
        serializer = ReviewImageUploadSerializer(
            data=request.data, context={"review": review}
        )
        serializer.is_valid(raise_exception=True)
        image = ReviewImage.objects.create(review=review, image=serializer.validated_data["image"])
        return Response(ReviewImageSerializer(image).data, status=status.HTTP_201_CREATED)


class ReviewCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None

    def get_review(self):
        review = get_object_or_404(Review, pk=self.kwargs["pk"], is_hidden=False)
        if review.visibility == Visibility.PRIVATE and (
            not self.request.user.is_authenticated or self.request.user.id != review.user_id
        ):
            raise PermissionDenied("This review is private.")
        return review

    def get_queryset(self):
        review = self.get_review()
        return (
            Comment.objects.filter(review=review, is_hidden=False)
            .select_related("user", "user__profile")
            .prefetch_related("reactions")
        )

    def perform_create(self, serializer):
        review = self.get_review()
        serializer.save(user=self.request.user, review=review)


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    queryset = Comment.objects.select_related(
        "review", "user", "user__profile"
    ).prefetch_related("reactions")
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_object(self):
        comment = super().get_object()
        if comment.is_hidden or comment.review.is_hidden:
            raise PermissionDenied("Comment is hidden.")
        if comment.review.visibility == Visibility.PRIVATE and (
            not self.request.user.is_authenticated
            or self.request.user.id != comment.review.user_id
        ):
            raise PermissionDenied("This review is private.")
        return comment


class CommentReactionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, comment_id):
        comment = get_object_or_404(
            Comment.objects.select_related("review", "user", "user__profile"),
            pk=comment_id,
            is_hidden=False,
            review__is_hidden=False,
        )
        if comment.review.visibility == Visibility.PRIVATE and comment.review.user_id != request.user.id:
            raise PermissionDenied("This review is private.")

        reaction = request.data.get("reaction")
        if reaction not in CommentReaction.ReactionKind.values:
            return Response(
                {"reaction": "Use 'like' or 'dislike'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current = CommentReaction.objects.filter(
            comment=comment,
            user=request.user,
        ).first()
        if current and current.reaction == reaction:
            current.delete()
        elif current:
            current.reaction = reaction
            current.save(update_fields=["reaction", "updated_at"])
        else:
            CommentReaction.objects.create(
                comment=comment,
                user=request.user,
                reaction=reaction,
            )

        return Response(CommentSerializer(comment, context={"request": request}).data)


class ReviewLikeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        review = get_object_or_404(
            Review.objects.select_related("user"),
            pk=pk,
            is_hidden=False,
        )
        if review.visibility == Visibility.PRIVATE and review.user_id != request.user.id:
            raise PermissionDenied("This review is private.")

        existing = ReviewLike.objects.filter(review=review, user=request.user).first()
        if existing:
            existing.delete()
            liked = False
        else:
            ReviewLike.objects.create(review=review, user=request.user)
            liked = True

        return Response(
            {
                "liked": liked,
                "like_count": review.likes.count(),
            }
        )
