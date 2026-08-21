from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from catalog.models import Product


class Verdict(models.TextChoices):
    BUY_AGAIN = "buy_again", "Buy again"
    NEVER_AGAIN = "never_again", "Never again"
    NEUTRAL = "neutral", "Neutral"


class Visibility(models.TextChoices):
    PUBLIC = "public", "Public"
    PRIVATE = "private", "Private"


class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    verdict = models.CharField(max_length=20, choices=Verdict.choices, default=Verdict.NEUTRAL)
    body = models.TextField(blank=True)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PUBLIC)
    store_name = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    # What the user paid (crowdsourced). Better than one global product price across regions.
    price_paid = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_currency = models.CharField(max_length=3, blank=True, default="")
    tasted_at = models.DateField(null=True, blank=True)
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "product"], name="unique_user_product_review"),
        ]

    def __str__(self):
        return f"{self.user_id} → {self.product_id} ({self.rating})"


class ReviewImage(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="reviews/")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image {self.pk} for review {self.review_id}"


class Comment(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    body = models.TextField()
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment {self.pk} on review {self.review_id}"
