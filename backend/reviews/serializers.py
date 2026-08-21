from django.conf import settings
from rest_framework import serializers

from accounts.serializers import PublicProfileSerializer
from .models import Comment, Review, ReviewImage, Visibility


class ReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewImage
        fields = ("id", "image", "created_at")
        read_only_fields = ("id", "created_at")


class CommentSerializer(serializers.ModelSerializer):
    user = PublicProfileSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ("id", "user", "body", "created_at", "updated_at")
        read_only_fields = ("id", "user", "created_at", "updated_at")


class ReviewListSerializer(serializers.ModelSerializer):
    user = PublicProfileSerializer(read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "user",
            "product_id",
            "product_name",
            "rating",
            "verdict",
            "body",
            "visibility",
            "store_name",
            "city",
            "price_paid",
            "price_currency",
            "tasted_at",
            "images",
            "comment_count",
            "created_at",
            "updated_at",
        )

    def get_comment_count(self, obj):
        return obj.comments.filter(is_hidden=False).count()


class ReviewDetailSerializer(ReviewListSerializer):
    comments = serializers.SerializerMethodField()

    class Meta(ReviewListSerializer.Meta):
        fields = ReviewListSerializer.Meta.fields + ("comments",)

    def get_comments(self, obj):
        qs = obj.comments.filter(is_hidden=False).select_related("user", "user__profile")
        return CommentSerializer(qs, many=True).data


class ReviewCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = (
            "rating",
            "verdict",
            "body",
            "visibility",
            "store_name",
            "city",
            "price_paid",
            "price_currency",
            "tasted_at",
        )

    def validate_visibility(self, value):
        if value not in Visibility.values:
            raise serializers.ValidationError("Invalid visibility.")
        return value

    def validate_price_currency(self, value):
        if not value:
            return ""
        value = value.strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Use a 3-letter currency code, e.g. RUB, EUR, USD.")
        return value

    def validate(self, attrs):
        price = attrs.get("price_paid", getattr(self.instance, "price_paid", None) if self.instance else None)
        currency = attrs.get(
            "price_currency",
            getattr(self.instance, "price_currency", "") if self.instance else "",
        )
        if price is not None and not currency:
            raise serializers.ValidationError({"price_currency": "Currency is required when price is set."})
        if price is not None and price < 0:
            raise serializers.ValidationError({"price_paid": "Price cannot be negative."})
        return attrs


class ReviewImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()

    def validate(self, attrs):
        review = self.context["review"]
        max_images = getattr(settings, "MAX_REVIEW_IMAGES", 5)
        if review.images.count() >= max_images:
            raise serializers.ValidationError(f"Maximum {max_images} images per review.")
        return attrs
