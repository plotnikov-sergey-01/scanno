import httpx
from django.conf import settings

from .models import Product


class OpenFoodFactsClient:
    BASE_URL = "https://world.openfoodfacts.org/api/v2"
    SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
    PRODUCT_FIELDS = [
        "code",
        "product_name",
        "product_name_en",
        "generic_name",
        "generic_name_en",
        "brands",
        "categories",
        "image_front_url",
        "image_url",
        "image_small_url",
        "ingredients_text",
        "ingredients_text_en",
        "ingredients_text_uk",
        "stores",
        "purchase_places",
        "unique_scans_n",
        "countries_tags",
    ]

    def __init__(self):
        self.user_agent = settings.OPEN_FOOD_FACTS_USER_AGENT

    def lookup_barcode(self, barcode: str) -> dict | None:
        url = f"{self.BASE_URL}/product/{barcode}.json"
        headers = {"User-Agent": self.user_agent}
        params = {"fields": ",".join(self.PRODUCT_FIELDS)}
        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.get(url, params=params, headers=headers)
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            return None

        if data.get("status") != 1:
            return None

        product = data.get("product") or {}
        return self._normalize(product, barcode=barcode)

    def search_by_name(self, query: str, page_size: int = 12) -> list[dict]:
        headers = {"User-Agent": self.user_agent}
        params = {
            "search_terms": query,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": page_size,
            "fields": ",".join(self.PRODUCT_FIELDS),
        }
        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.get(self.SEARCH_URL, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            return []

        return self._collect(data.get("products") or [])

    def search_popular(
        self,
        *,
        country: str,
        category: str,
        page_size: int = 50,
        page: int = 1,
    ) -> list[dict]:
        """
        Popular products for a country + category, sorted by unique_scans_n (OFF popularity proxy).
        country/category use OFF tag ids without 'en:' prefix, e.g. ukraine, snacks.
        """
        headers = {"User-Agent": self.user_agent}
        params = {
            "action": "process",
            "json": 1,
            "page_size": page_size,
            "page": page,
            "sort_by": "unique_scans_n",
            "tagtype_0": "countries",
            "tag_contains_0": "contains",
            "tag_0": country,
            "tagtype_1": "categories",
            "tag_contains_1": "contains",
            "tag_1": category,
            "fields": ",".join(self.PRODUCT_FIELDS),
        }
        try:
            with httpx.Client(timeout=45.0) as client:
                response = client.get(self.SEARCH_URL, params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            return []

        return self._collect(data.get("products") or [])

    def _collect(self, products: list) -> list[dict]:
        results = []
        for product in products:
            code = str(product.get("code") or "").strip()
            if not code:
                continue
            normalized = self._normalize(product, barcode=code)
            if normalized:
                results.append(normalized)
        return results

    def _normalize(self, product: dict, barcode: str) -> dict | None:
        name = (
            product.get("product_name")
            or product.get("product_name_en")
            or product.get("generic_name")
            or barcode
        )
        brands = product.get("brands") or ""
        categories = product.get("categories") or ""
        image = (
            product.get("image_front_url")
            or product.get("image_url")
            or product.get("image_small_url")
            or ""
        )
        generic = (product.get("generic_name") or product.get("generic_name_en") or "").strip()
        categories_text = categories.replace(",", ", ").strip()
        description = generic
        if not description and categories_text:
            description = categories_text
        if len(description) > 600:
            description = description[:597] + "..."
        ingredients = (
            product.get("ingredients_text_en")
            or product.get("ingredients_text")
            or product.get("ingredients_text_uk")
            or ""
        )
        ingredients_text = " ".join(str(ingredients).split())
        if len(ingredients_text) > 1200:
            ingredients_text = ingredients_text[:1197] + "..."
        lean_raw = {
            "code": barcode,
            "unique_scans_n": product.get("unique_scans_n"),
            "countries_tags": product.get("countries_tags") or [],
            "stores": product.get("stores") or "",
            "purchase_places": product.get("purchase_places") or "",
        }
        return {
            "barcode": barcode,
            "name": str(name)[:255],
            "brand": brands.split(",")[0].strip()[:255] if brands else "",
            "category": categories.split(",")[0].strip()[:255] if categories else "",
            "description": description,
            "ingredients_text": ingredients_text,
            "image_url": image,
            "off_id": str(product.get("code") or barcode),
            "raw_off": lean_raw,
        }


def refresh_missing_off_data(product: Product) -> bool:
    if not product.barcode:
        return False

    raw_off = product.raw_off or {}
    off_backed = product.source == Product.Source.CATALOG or (
        bool(product.off_id) and product.created_by_id is None
    )
    needs_refresh = not product.ingredients_text or off_backed
    if not needs_refresh:
        return False

    payload = OpenFoodFactsClient().lookup_barcode(product.barcode)
    if not payload:
        return False

    changed_fields: set[str] = set()
    ingredients_text = payload.get("ingredients_text") or ""
    if ingredients_text and off_backed and product.ingredients_text != ingredients_text:
        product.ingredients_text = ingredients_text
        changed_fields.add("ingredients_text")

    if payload.get("off_id") and not product.off_id:
        product.off_id = payload["off_id"]
        changed_fields.add("off_id")

    payload_raw = payload.get("raw_off") or {}
    next_raw_off = {**raw_off}
    for key in ("stores", "purchase_places", "unique_scans_n", "countries_tags"):
        value = payload_raw.get(key)
        if value and not next_raw_off.get(key):
            next_raw_off[key] = value

    if next_raw_off != raw_off:
        product.raw_off = next_raw_off
        changed_fields.add("raw_off")

    if not changed_fields:
        return False

    product.save(update_fields=[*changed_fields, "updated_at"])
    return True


def upsert_from_off(payload: dict) -> tuple[Product, bool]:
    existing = Product.objects.select_related("stats").filter(barcode=payload["barcode"]).first()
    if existing:
        changed = False
        if existing.source != Product.Source.CATALOG:
            existing.source = Product.Source.CATALOG
            changed = True
        if payload.get("off_id") and existing.off_id != payload["off_id"]:
            existing.off_id = payload["off_id"]
            changed = True
        for field in ("name", "brand", "category", "description"):
            value = payload.get(field) or ""
            if value and not getattr(existing, field):
                setattr(existing, field, value)
                changed = True
        if (
            existing.source == Product.Source.CATALOG
            and payload.get("ingredients_text")
            and existing.ingredients_text != payload["ingredients_text"]
        ):
            existing.ingredients_text = payload["ingredients_text"]
            changed = True
        if payload.get("image_url") and not existing.image and not existing.image_url:
            existing.image_url = payload["image_url"]
            changed = True
        if payload.get("raw_off"):
            raw_off = existing.raw_off or {}
            next_raw_off = {**raw_off}
            for key, value in payload["raw_off"].items():
                if value and not next_raw_off.get(key):
                    next_raw_off[key] = value
            if next_raw_off != raw_off:
                existing.raw_off = next_raw_off
                changed = True
        if changed:
            existing.save()
        return existing, False

    product = Product.objects.create(
        barcode=payload["barcode"],
        name=payload["name"],
        brand=payload["brand"],
        category=payload["category"],
        description=payload.get("description") or "",
        ingredients_text=payload.get("ingredients_text") or "",
        image_url=payload["image_url"],
        off_id=payload["off_id"],
        raw_off=payload.get("raw_off") or {},
        source=Product.Source.CATALOG,
        created_by=None,
    )
    return product, True
