# Explore review grid preview

Fresh reviews now use product-first cards with the main catalog photo, product
name, brand, author, verdict, a compact single-star rating with a numeric value,
and existing comment/like controls. Comments show an avatar, author, creation
date, and inline like/dislike actions persisted through the API, while the card
action keeps only the Add comment label. Cards stretch to a shared row height so
their bottom actions stay aligned. The grid is one column below 768px,
two columns on tablet, three columns on medium desktop, and four columns from
1200px. The mobile header uses two rows;
discovery filters scroll horizontally. Other discovery feeds remain available;
the old Browse & filter block was removed from this page.

`ReviewList` and `ReviewDetail` API responses add two read-only fields:

- `product_brand`: the product's brand, or an empty string.
- `product_image_url`: the resolved main product photo URL, or an empty string.
  Uploaded photos use the same request-aware URL resolution as `Product`.

These additive fields are included in the generated OpenAPI serializers. Comment
reactions are stored per user in `CommentReaction`, with one active reaction per
user and comment. A database migration is included. Missing/unavailable product
photos show a fallback; the UI does not substitute unrelated demo photos. Review
like counts retain the existing local component state behavior; comment
like/dislike counts are persisted for authenticated users.

## Reverting this preview

The exact pre-preview versions (including earlier uncommitted changes) are saved
locally in `data/design-previews/explore-20260917/before/`. Compare against those
copies when reverting; do not reset the worktree or overwrite any subsequent work.
This document is new to the preview. No commit or deployment has been made.
