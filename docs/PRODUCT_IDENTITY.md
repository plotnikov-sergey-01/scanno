# Product identity & merges

## Rules (current)

- **Barcode is the global key.** Creating/looking up a barcode that already exists always returns the existing product card (`already_exists` on create).
- **`source=catalog`**: from Open Food Facts (or later retailer feeds). Main product photo is **not** user-editable. Photos go on reviews.
- **`source=user`**: created manually by a user. Only `created_by` may change the main product photo — until/unless the product is promoted to catalog (e.g. barcode later matched in OFF).
- **`merged_into`**: reserved for admin merge. Duplicate rows can point at a canonical product; detail API redirects to the canonical card.

## Future merge flow

1. Detect likely duplicates (same barcode always; fuzzy name+brand without barcode).
2. Admin (or automated) sets `duplicate.merged_into = canonical`.
3. Move reviews from duplicate → canonical (recompute stats).
4. Hide duplicate from search (`merged_into__isnull=True` filter already applied).

User-created photos on a merged-away card can become review images on the canonical product in a later migration tool.

## Reviews: one per user per product

Edits overwrite the same review row (`updated_at` changes). Public UI shows the **current** version only, with an "Updated …" label when edited. Full version history is a later feature if needed.
