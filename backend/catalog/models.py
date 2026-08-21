from django.conf import settings
from django.db import models


class Product(models.Model):
    class Source(models.TextChoices):
        CATALOG = "catalog", "Catalog (Open Food Facts / global)"
        USER = "user", "User-created"

    barcode = models.CharField(max_length=64, unique=True, null=True, blank=True, db_index=True)
    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    off_id = models.CharField(max_length=64, blank=True, db_index=True)
    raw_off = models.JSONField(default=dict, blank=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.USER, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_products",
    )
    # Future: merged_into_id for duplicate → canonical product redirects
    merged_into = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="duplicates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.barcode or 'no-barcode'})"

    @property
    def is_global_catalog(self) -> bool:
        return self.source == self.Source.CATALOG or bool(self.off_id)

    def can_edit_image(self, user) -> bool:
        if not user or not getattr(user, "is_authenticated", False) or not user.is_authenticated:
            return False
        if self.merged_into_id:
            return False
        if self.is_global_catalog:
            return False
        return self.created_by_id == user.id

    def can_edit_details(self, user) -> bool:
        """Name/category/description/photo for user-created products owned by the user."""
        return self.can_edit_image(user)

    def resolve_image_url(self, request=None) -> str:
        if self.image:
            url = self.image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return self.image_url or ""


class ProductStats(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="stats")
    review_count = models.PositiveIntegerField(default=0)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    never_again_count = models.PositiveIntegerField(default=0)
    buy_again_count = models.PositiveIntegerField(default=0)
    neutral_count = models.PositiveIntegerField(default=0)
    rating_1 = models.PositiveIntegerField(default=0)
    rating_2 = models.PositiveIntegerField(default=0)
    rating_3 = models.PositiveIntegerField(default=0)
    rating_4 = models.PositiveIntegerField(default=0)
    rating_5 = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def never_again_pct(self):
        if self.review_count == 0:
            return 0.0
        return round(100.0 * self.never_again_count / self.review_count, 1)

    def __str__(self):
        return f"Stats for {self.product_id}"
