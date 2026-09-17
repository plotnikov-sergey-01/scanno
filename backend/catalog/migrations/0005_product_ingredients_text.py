from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0004_product_description"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="ingredients_text",
            field=models.TextField(blank=True),
        ),
    ]
