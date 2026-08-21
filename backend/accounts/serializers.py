from django.contrib.auth import get_user_model
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
