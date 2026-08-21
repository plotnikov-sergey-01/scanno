from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Product, ProductStats


@receiver(post_save, sender=Product)
def ensure_stats(sender, instance, created, **kwargs):
    if created:
        ProductStats.objects.get_or_create(product=instance)
