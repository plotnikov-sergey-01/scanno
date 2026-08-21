"""
Import popular Open Food Facts products by country x category.

Examples:
  python manage.py import_off_popular --dry-run
  python manage.py import_off_popular --per-combo 40
  python manage.py import_off_popular --countries ukraine,germany --categories snacks,dairy
  python manage.py import_off_popular --sleep 1.0

Volume guide (defaults):
  7 countries x 8 categories x 40 products ~ up to 2240 rows
  (less in practice due to overlaps / empty combos)
  ~42-56 HTTP search requests with sleep between them - gentle on OFF.
"""

from __future__ import annotations

import time

from django.core.management.base import BaseCommand

from catalog.services import OpenFoodFactsClient, upsert_from_off

DEFAULT_COUNTRIES = [
    "ukraine",
    "united-states",
    "united-kingdom",
    "france",
    "spain",
    "germany",
    "italy",
]

# OFF category tags (without en: prefix). Prefer tags that actually return rows.
DEFAULT_CATEGORIES = [
    "snacks",
    "sweet-snacks",
    "dairies",
    "milks",
    "cheeses",
    "yogurts",
    "meats",
    "desserts",
    "alcoholic-beverages",
    "sodas",
    "chocolates",
    "breakfast-cereals",
]


class Command(BaseCommand):
    help = "Import popular OFF products for selected countries and categories"

    def add_arguments(self, parser):
        parser.add_argument(
            "--countries",
            type=str,
            default=",".join(DEFAULT_COUNTRIES),
            help="Comma-separated OFF country tags (default: UA + major EU/US markets)",
        )
        parser.add_argument(
            "--categories",
            type=str,
            default=",".join(DEFAULT_CATEGORIES),
            help="Comma-separated OFF category tags",
        )
        parser.add_argument(
            "--per-combo",
            type=int,
            default=40,
            help="Max products per countryxcategory (default 40)",
        )
        parser.add_argument(
            "--sleep",
            type=float,
            default=1.2,
            help="Seconds to sleep between OFF requests (be a good API citizen)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Fetch and print counts without writing to DB",
        )

    def handle(self, *args, **options):
        countries = [c.strip() for c in options["countries"].split(",") if c.strip()]
        categories = [c.strip() for c in options["categories"].split(",") if c.strip()]
        per_combo = max(1, min(options["per_combo"], 100))
        sleep_s = max(0.0, options["sleep"])
        dry_run = options["dry_run"]

        client = OpenFoodFactsClient()
        seen_barcodes: set[str] = set()
        created = 0
        updated = 0
        skipped = 0
        requests_made = 0

        self.stdout.write(
            self.style.NOTICE(
                f"Importing OFF popular: {len(countries)} countries x {len(categories)} categories "
                f"x up to {per_combo}/combo (dry_run={dry_run})"
            )
        )

        for country in countries:
            for category in categories:
                self.stdout.write(f"-> {country} / {category} ...")
                payloads = client.search_popular(
                    country=country,
                    category=category,
                    page_size=per_combo,
                    page=1,
                )
                requests_made += 1
                combo_new = 0

                for payload in payloads:
                    barcode = payload["barcode"]
                    if barcode in seen_barcodes:
                        skipped += 1
                        continue
                    seen_barcodes.add(barcode)

                    if dry_run:
                        created += 1
                        combo_new += 1
                        continue

                    _, was_created = upsert_from_off(payload)
                    if was_created:
                        created += 1
                        combo_new += 1
                    else:
                        updated += 1

                self.stdout.write(
                    f"  got {len(payloads)} from OFF, +{combo_new} unique this combo"
                )
                if sleep_s:
                    time.sleep(sleep_s)

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. requests={requests_made} unique={len(seen_barcodes)} "
                f"created={created} updated={updated} skipped_dupes={skipped}"
            )
        )
        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run - nothing written to DB."))
