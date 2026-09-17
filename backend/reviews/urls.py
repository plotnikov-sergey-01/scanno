from django.urls import path

from .views import (
    MyReviewsView,
    ProductReviewListCreateView,
    ReviewCommentListCreateView,
    CommentReactionView,
    ReviewDetailView,
    ReviewImageUploadView,
)

urlpatterns = [
    path("products/<int:product_id>/reviews/", ProductReviewListCreateView.as_view(), name="product-reviews"),
    path("reviews/me/", MyReviewsView.as_view(), name="my-reviews"),
    path("reviews/<int:pk>/", ReviewDetailView.as_view(), name="review-detail"),
    path("reviews/<int:pk>/images/", ReviewImageUploadView.as_view(), name="review-images"),
    path("reviews/<int:pk>/comments/", ReviewCommentListCreateView.as_view(), name="review-comments"),
    path("reviews/comments/<int:comment_id>/reaction/", CommentReactionView.as_view(), name="comment-reaction"),
]
