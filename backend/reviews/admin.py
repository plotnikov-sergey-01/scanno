from django.contrib import admin

from .models import Comment, Review, ReviewImage


class ReviewImageInline(admin.TabularInline):
    model = ReviewImage
    extra = 0


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "user", "rating", "verdict", "visibility", "is_hidden", "created_at")
    list_filter = ("verdict", "visibility", "is_hidden", "rating")
    search_fields = ("body", "user__email", "product__name", "product__barcode")
    inlines = [ReviewImageInline]
    actions = ["hide_reviews", "unhide_reviews"]

    @admin.action(description="Hide selected reviews")
    def hide_reviews(self, request, queryset):
        queryset.update(is_hidden=True)

    @admin.action(description="Unhide selected reviews")
    def unhide_reviews(self, request, queryset):
        queryset.update(is_hidden=False)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "review", "user", "is_hidden", "created_at")
    list_filter = ("is_hidden",)
    search_fields = ("body", "user__email")
    actions = ["hide_comments", "unhide_comments"]

    @admin.action(description="Hide selected comments")
    def hide_comments(self, request, queryset):
        queryset.update(is_hidden=True)

    @admin.action(description="Unhide selected comments")
    def unhide_comments(self, request, queryset):
        queryset.update(is_hidden=False)
