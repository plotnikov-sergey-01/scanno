from django.contrib.auth import get_user_model
from django.conf import settings
from urllib.parse import parse_qs, urlparse
from dj_rest_auth.registration.serializers import SocialLoginSerializer
from rest_framework import serializers

from .models import Profile

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ("display_name", "bio", "avatar", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")


class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "username", "profile")
        read_only_fields = ("id", "email")

    def get_profile(self, obj):
        from django.core.exceptions import ObjectDoesNotExist
        from .models import Profile

        try:
            profile = obj.profile
        except ObjectDoesNotExist:
            profile, _ = Profile.objects.get_or_create(
                user=obj,
                defaults={"display_name": obj.username or obj.email.split("@")[0]},
            )
        return ProfileSerializer(profile).data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=80)

    class Meta:
        model = User
        fields = ("email", "username", "password", "display_name")

    def create(self, validated_data):
        display_name = validated_data.pop("display_name", "")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if display_name:
            profile = user.profile
            profile.display_name = display_name
            profile.save(update_fields=["display_name"])
        return user


class SocialAuthorizationCodeSerializer(SocialLoginSerializer):
    code = serializers.CharField(required=True, allow_blank=False)
    redirect_uri = serializers.URLField(required=True)

    def get_fields(self):
        fields = super().get_fields()
        fields.pop("access_token", None)
        fields.pop("id_token", None)
        return fields

    def validate(self, attrs):
        view = self.context.get("view")
        redirect_uri = attrs.get("redirect_uri")

        self._validate_redirect_uri(redirect_uri, view)
        view.callback_url = redirect_uri

        return super().validate(attrs)

    def _validate_redirect_uri(self, redirect_uri, view):
        if not redirect_uri:
            raise serializers.ValidationError({"redirect_uri": "This field is required."})

        parsed = urlparse(redirect_uri)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        allowed_origins = set(settings.SOCIAL_AUTH_ALLOWED_REDIRECT_ORIGINS)
        provider = getattr(view, "social_provider", "")

        if origin not in allowed_origins:
            raise serializers.ValidationError({"redirect_uri": "This origin is not allowed."})
        if parsed.path != "/auth/social/callback":
            raise serializers.ValidationError({"redirect_uri": "Invalid social callback path."})

        query_provider = parse_qs(parsed.query).get("provider", [""])[0]
        if query_provider != provider:
            raise serializers.ValidationError({"redirect_uri": "Invalid social provider callback."})


class PublicProfileSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "display_name", "bio", "avatar")

    def _profile(self, obj):
        from django.core.exceptions import ObjectDoesNotExist
        from .models import Profile

        try:
            return obj.profile
        except ObjectDoesNotExist:
            profile, _ = Profile.objects.get_or_create(
                user=obj,
                defaults={"display_name": obj.username or obj.email.split("@")[0]},
            )
            return profile

    def get_display_name(self, obj):
        return self._profile(obj).display_name or obj.username

    def get_bio(self, obj):
        return self._profile(obj).bio

    def get_avatar(self, obj):
        avatar = self._profile(obj).avatar
        if not avatar:
            return None
        request = self.context.get("request")
        url = avatar.url
        return request.build_absolute_uri(url) if request else url
