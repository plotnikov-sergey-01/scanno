from django.urls import path

from .auth import EmailTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

from .views import HealthView, MeView, PublicUserReviewsView, PublicUserView, RegisterView

auth_urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", EmailTokenObtainPairView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
]

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("users/<str:username>/", PublicUserView.as_view(), name="user-public"),
    path("users/<str:username>/reviews/", PublicUserReviewsView.as_view(), name="user-reviews"),
]
