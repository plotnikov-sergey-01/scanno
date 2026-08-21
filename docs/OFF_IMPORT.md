# Open Food Facts import

## Already built into the product

Barcode **lookup** (`POST /api/v1/products/lookup/`) already pulls a product from OFF and saves it into Scanno if missing. Manual create with an existing barcode returns the existing card. You do **not** need a full dump for day-to-day use.

## Seed popular catalog (bulk)

```bash
cd backend
.\venv\Scripts\activate
python manage.py import_off_popular --dry-run
python manage.py import_off_popular --per-combo 40
```

Defaults:

- **Countries:** ukraine, united-states, united-kingdom, france, spain, germany, italy  
- **Categories:** snacks, sweet-snacks, dairies, milks, cheeses, yogurts, meats, desserts, alcoholic-beverages, sodas, chocolates, breakfast-cereals  
- **Sort:** OFF `unique_scans_n` (how often the product is scanned in OFF — popularity proxy)  
- **Pace:** ~1.2s sleep between search requests  

Rough size: 7×10×40 ≈ **up to ~2.8k rows** before dedupe; overlaps cut that down. Metadata-only rows are tiny (KB each). Images stay as remote URLs from OFF until someone uploads locally.

## Why multi-country for Ukraine

Ukrainian shelves mix local + EU/import brands. Seeding DE/FR/IT/US/UK helps barcodes resolve before the first user scans them. OFF `countries` tags mean “sold/known in that country”, not “only produced there”.

## When to use a full OFF dump

Only if you need hundreds of thousands of SKUs offline. Prefer the command above + on-demand lookup for MVP.
