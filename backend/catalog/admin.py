from django.contrib import admin

from .models import Product, ProductStats


class ProductStatsInline(admin.StackedInline):
    model = ProductStats
    readonly_fields = (
        "review_count",
        "avg_rating",
        "never_again_count",
        "buy_again_count",
        "neutral_count",
        "rating_1",
        "rating_2",
        "rating_3",
        "rating_4",
        "rating_5",
        "updated_at",
    )
    can_delete = False


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "brand", "barcode", "category", "updated_at")
    search_fields = ("name", "brand", "barcode")
    inlines = [ProductStatsInline]
