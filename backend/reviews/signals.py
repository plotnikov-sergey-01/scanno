from django.db.models import Avg, Count, Q
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from catalog.models import ProductStats
from .models import Review, Verdict, Visibility


def recompute_product_stats(product_id: int) -> None:
    stats, _ = ProductStats.objects.get_or_create(product_id=product_id)
    qs = Review.objects.filter(
        product_id=product_id,
        visibility=Visibility.PUBLIC,
        is_hidden=False,
    )
    agg = qs.aggregate(
        review_count=Count("id"),
        avg_rating=Avg("rating"),
        never_again_count=Count("id", filter=Q(verdict=Verdict.NEVER_AGAIN)),
        buy_again_count=Count("id", filter=Q(verdict=Verdict.BUY_AGAIN)),
        neutral_count=Count("id", filter=Q(verdict=Verdict.NEUTRAL)),
        rating_1=Count("id", filter=Q(rating=1)),
        rating_2=Count("id", filter=Q(rating=2)),
        rating_3=Count("id", filter=Q(rating=3)),
        rating_4=Count("id", filter=Q(rating=4)),
        rating_5=Count("id", filter=Q(rating=5)),
    )
    stats.review_count = agg["review_count"] or 0
    stats.avg_rating = round(agg["avg_rating"] or 0, 2)
    stats.never_again_count = agg["never_again_count"] or 0
    stats.buy_again_count = agg["buy_again_count"] or 0
    stats.neutral_count = agg["neutral_count"] or 0
    stats.rating_1 = agg["rating_1"] or 0
    stats.rating_2 = agg["rating_2"] or 0
    stats.rating_3 = agg["rating_3"] or 0
    stats.rating_4 = agg["rating_4"] or 0
    stats.rating_5 = agg["rating_5"] or 0
    stats.save()


@receiver(post_save, sender=Review)
def review_saved(sender, instance, **kwargs):
    recompute_product_stats(instance.product_id)


@receiver(post_delete, sender=Review)
def review_deleted(sender, instance, **kwargs):
    recompute_product_stats(instance.product_id)
