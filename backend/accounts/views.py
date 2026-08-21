from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.utils import extend_schema

from .serializers import (
    ProfileSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)
from reviews.serializers import ReviewListSerializer
from reviews.models import Review, Visibility

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        user = self.request.user
        from .models import Profile

        Profile.objects.get_or_create(
            user=user,
            defaults={"display_name": user.username or user.email.split("@")[0]},
        )
        return User.objects.select_related("profile").get(pk=user.pk)

    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        profile_data = {
            k: v
            for k, v in request.data.items()
            if k in ("display_name", "bio", "avatar")
        }
        if "username" in request.data:
            user.username = request.data["username"]
            user.save(update_fields=["username"])
        if profile_data:
            serializer = ProfileSerializer(user.profile, data=profile_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(UserSerializer(user).data)


class PublicUserView(generics.RetrieveAPIView):
    queryset = User.objects.select_related("profile").all()
    serializer_class = PublicProfileSerializer
    lookup_field = "username"
    permission_classes = [permissions.AllowAny]


class PublicUserReviewsView(generics.ListAPIView):
    serializer_class = ReviewListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        username = self.kwargs["username"]
        qs = (
            Review.objects.filter(user__username=username, is_hidden=False)
            .select_related("product", "user", "user__profile")
            .prefetch_related("images")
        )
        if self.request.user.is_authenticated and self.request.user.username == username:
            return qs
        return qs.filter(visibility=Visibility.PUBLIC)


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: {"type": "object", "properties": {"status": {"type": "string"}}}})
    def get(self, request):
        return Response({"status": "ok"})
