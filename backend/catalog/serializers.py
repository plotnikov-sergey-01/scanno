from rest_framework import serializers

from .models import Product, ProductStats


class ProductStatsSerializer(serializers.ModelSerializer):
    never_again_pct = serializers.FloatField(read_only=True)
    rating_distribution = serializers.SerializerMethodField()

    class Meta:
        model = ProductStats
        fields = (
            "review_count",
            "avg_rating",
            "never_again_count",
            "buy_again_count",
            "neutral_count",
            "never_again_pct",
            "rating_distribution",
            "updated_at",
        )

    def get_rating_distribution(self, obj):
        return {
            "1": obj.rating_1,
            "2": obj.rating_2,
            "3": obj.rating_3,
            "4": obj.rating_4,
            "5": obj.rating_5,
        }


class ProductSerializer(serializers.ModelSerializer):
    stats = ProductStatsSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    can_edit_image = serializers.SerializerMethodField()
    created_by_id = serializers.IntegerField(read_only=True, allow_null=True)
    recent_prices = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "barcode",
            "name",
            "brand",
            "category",
            "description",
            "image_url",
            "off_id",
            "source",
            "created_by_id",
            "can_edit_image",
            "merged_into",
            "stats",
            "recent_prices",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "off_id",
            "source",
            "created_by_id",
            "can_edit_image",
            "merged_into",
            "recent_prices",
            "created_at",
            "updated_at",
        )

    def get_image_url(self, obj):
        return obj.resolve_image_url(self.context.get("request"))

    def get_can_edit_image(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        return obj.can_edit_image(user)

    def get_recent_prices(self, obj):
        from reviews.models import Review, Visibility

        rows = (
            Review.objects.filter(
                product=obj,
                visibility=Visibility.PUBLIC,
                is_hidden=False,
                price_paid__isnull=False,
            )
            .exclude(price_currency="")
            .order_by("-updated_at")
            .values("price_paid", "price_currency", "city", "store_name", "updated_at")[:5]
        )
        return [
            {
                "amount": str(r["price_paid"]),
                "currency": r["price_currency"],
                "city": r["city"],
                "store_name": r["store_name"],
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
            }
            for r in rows
        ]


class ProductLookupSerializer(serializers.Serializer):
    barcode = serializers.CharField(max_length=64)


class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ("barcode", "name", "brand", "category", "description", "image_url")


class ProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ("name", "brand", "category", "description")


class ProductImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()
