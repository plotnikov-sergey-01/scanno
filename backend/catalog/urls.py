from django.urls import path

from .discover import DiscoverFeedView, ProductBrowseView
from .views import (
    ProductDetailView,
    ProductImageUploadView,
    ProductListCreateView,
    ProductLookupView,
)

urlpatterns = [
    path("discover/", DiscoverFeedView.as_view(), name="discover-feed"),
    path("browse/", ProductBrowseView.as_view(), name="product-browse"),
    path("products/", ProductListCreateView.as_view(), name="product-list"),
    path("products/lookup/", ProductLookupView.as_view(), name="product-lookup"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/<int:pk>/image/", ProductImageUploadView.as_view(), name="product-image"),
]
