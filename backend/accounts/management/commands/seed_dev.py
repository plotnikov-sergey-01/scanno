from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from catalog.models import Product
from reviews.models import Review, Verdict, Visibility

User = get_user_model()


class Command(BaseCommand):
    help = "Seed development admin user and sample products/reviews"

    def handle(self, *args, **options):
        admin, created = User.objects.get_or_create(
            email="admin@scanno.local",
            defaults={
                "username": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("admin123")
            admin.save()
            self.stdout.write(self.style.SUCCESS("Created admin@scanno.local / admin123"))
        else:
            self.stdout.write("Admin user already exists")

        demo, demo_created = User.objects.get_or_create(
            email="demo@scanno.local",
            defaults={"username": "demo"},
        )
        if demo_created:
            demo.set_password("demo12345")
            demo.save()
            demo.profile.display_name = "Demo Taster"
            demo.profile.save()

        samples = [
            {
                "barcode": "3017620422003",
                "name": "Nutella",
                "brand": "Ferrero",
                "category": "Spreads",
                "image_url": "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.jpg",
            },
            {
                "barcode": "5449000000996",
                "name": "Coca-Cola",
                "brand": "Coca-Cola",
                "category": "Beverages",
                "image_url": "",
            },
            {
                "barcode": "5000112589265",
                "name": "Sprite",
                "brand": "Coca-Cola",
                "category": "Beverages",
                "image_url": "",
            },
        ]
        for data in samples:
            product, _ = Product.objects.get_or_create(barcode=data["barcode"], defaults=data)
            Review.objects.get_or_create(
                user=demo,
                product=product,
                defaults={
                    "rating": 4 if product.barcode != "5449000000996" else 2,
                    "verdict": Verdict.BUY_AGAIN
                    if product.barcode != "5449000000996"
                    else Verdict.NEVER_AGAIN,
                    "body": "Seeded sample review for Scanno demo.",
                    "visibility": Visibility.PUBLIC,
                    "city": "Demo City",
                },
            )

        self.stdout.write(self.style.SUCCESS("Seed data ready"))
