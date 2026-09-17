from django.conf import settings
from rest_framework import serializers

from accounts.serializers import PublicProfileSerializer
from .models import Comment, CommentReaction, Review, ReviewImage, Visibility


class ReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewImage
        fields = ("id", "image", "created_at")
        read_only_fields = ("id", "created_at")


class CommentSerializer(serializers.ModelSerializer):
    user = PublicProfileSerializer(read_only=True)
    likes = serializers.SerializerMethodField()
    dislikes = serializers.SerializerMethodField()
    my_reaction = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            "id",
            "user",
            "body",
            "likes",
            "dislikes",
            "my_reaction",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "likes",
            "dislikes",
            "my_reaction",
            "created_at",
            "updated_at",
        )

    def get_likes(self, obj):
        return obj.reactions.filter(reaction=CommentReaction.ReactionKind.LIKE).count()

    def get_dislikes(self, obj):
        return obj.reactions.filter(reaction=CommentReaction.ReactionKind.DISLIKE).count()

    def get_my_reaction(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        return (
            obj.reactions.filter(user=request.user)
            .values_list("reaction", flat=True)
            .first()
        )


class ReviewListSerializer(serializers.ModelSerializer):
    user = PublicProfileSerializer(read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_brand = serializers.CharField(source="product.brand", read_only=True)
    product_image_url = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "user",
            "product_id",
            "product_name",
            "product_brand",
            "product_image_url",
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

    def get_product_image_url(self, obj) -> str:
        return obj.product.resolve_image_url(self.context.get("request"))


class ReviewDetailSerializer(ReviewListSerializer):
    comments = serializers.SerializerMethodField()

    class Meta(ReviewListSerializer.Meta):
        fields = ReviewListSerializer.Meta.fields + ("comments",)

    def get_comments(self, obj):
        qs = obj.comments.filter(is_hidden=False).select_related("user", "user__profile")
        return CommentSerializer(qs, many=True, context=self.context).data


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

    def validate_body(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Review text must be at least 3 characters.")
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
