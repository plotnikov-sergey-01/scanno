"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { ProductCard, ProductCardGrid } from "@/components/ProductCard";
import { ReviewCard } from "@/components/ReviewCard";
import { LoadingLabel } from "@/components/Spinner";
import type { Product, Review } from "@/lib/types";
import styles from "./page.module.css";

const FEEDS = [
  { id: "recent_reviews", label: "Fresh reviews" },
  { id: "recent_products", label: "New products" },
  { id: "top_rated", label: "Top rated (7d)" },
  { id: "most_hated", label: "Most hated (7d)" },
  { id: "most_discussed", label: "Most discussed (7d)" },
] as const;

export default function ExplorePage() {
  const [feed, setFeed] = useState<string>("recent_reviews");
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [browse, setBrowse] = useState<Product[]>([]);
  const [sort, setSort] = useState("recent");
  const [minRating, setMinRating] = useState("");
  const [minNever, setMinNever] = useState("");
  const [category, setCategory] = useState("");
  const [layout, setLayout] = useState<"list" | "grid">("grid");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [browseLoading, setBrowseLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .discover(feed, { days: 7, limit: 20 })
      .then((data) => {
        if (feed === "recent_reviews") {
          setReviews(data.results as Review[]);
          setProducts([]);
        } else {
          setProducts(data.results as Product[]);
          setReviews([]);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [feed]);

  useEffect(() => {
    const params: Record<string, string> = { sort, has_reviews: "1" };
    if (minRating) params.min_rating = minRating;
    if (minNever) params.min_never_again_pct = minNever;
    if (category.trim()) params.category = category.trim();
    setBrowseLoading(true);
    api
      .browse(params)
      .then((data) => setBrowse(data.results))
      .catch(() => setBrowse([]))
      .finally(() => setBrowseLoading(false));
  }, [sort, minRating, minNever, category]);

  return (
    <div>
      <h1 className={styles.title}>Explore</h1>
      <p className={styles.subtitle}>
        Browse what people loved, hated, and just added — no barcode required.
      </p>

      <div className={styles.feedFilters}>
        {FEEDS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFeed(f.id)}
            className={feed === f.id ? styles.activeFeedButton : styles.feedButton}
          >
            {f.label}
          </button>
        ))}
        {feed !== "recent_reviews" && (
          <div className={styles.layoutControls}>
            <button
              type="button"
              onClick={() => setLayout("list")}
              className={layout === "list" ? styles.activeLayoutButton : styles.layoutButton}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setLayout("grid")}
              className={layout === "grid" ? styles.activeLayoutButton : styles.layoutButton}
            >
              Cards
            </button>
          </div>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <LoadingLabel className={styles.loadingLabel} />
      ) : feed === "recent_reviews" ? (
        <div className={styles.results}>
          {reviews.length === 0 ? (
            <p className={styles.empty}>No public reviews yet.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id}>
                <Link href={`/products/${r.product_id}`} className={styles.productLink}>
                  {r.product_name}
                </Link>
                <ReviewCard review={r} />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={styles.results}>
          {products.length === 0 ? (
            <p className={styles.empty}>Nothing in this feed yet — add a few reviews.</p>
          ) : layout === "grid" ? (
            <ProductCardGrid products={products} />
          ) : (
            products.map((p) => (
              <div key={p.id}>
                {typeof p.period_never_again === "number" && (
                  <p className={styles.neverMeta}>{p.period_never_again} never-again this week</p>
                )}
                {typeof p.period_review_count === "number" && (
                  <p className={styles.reviewMeta}>{p.period_review_count} reviews this week</p>
                )}
                <ProductCard product={p} />
              </div>
            ))
          )}
        </div>
      )}

      <section className={styles.browseSection}>
        <h2 className={styles.browseTitle}>Browse &amp; filter</h2>
        <div className={styles.browseFilters}>
          <label className={styles.fieldLabel}>
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={styles.select}
            >
              <option value="recent">Newest</option>
              <option value="rating">Best rated</option>
              <option value="reviews">Most reviews</option>
              <option value="never_again">Most never-again</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label className={styles.fieldLabel}>
            Min rating
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className={styles.select}
            >
              <option value="">Any</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
            </select>
          </label>
          <label className={styles.fieldLabel}>
            Min never-again %
            <select
              value={minNever}
              onChange={(e) => setMinNever(e.target.value)}
              className={styles.select}
            >
              <option value="">Any</option>
              <option value="25">25%+</option>
              <option value="50">50%+</option>
              <option value="75">75%+</option>
            </select>
          </label>
          <label className={styles.fieldLabel}>
            Category
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Beverages"
              className={styles.categoryInput}
            />
          </label>
          <div className={styles.layoutControls}>
            <button
              type="button"
              onClick={() => setLayout("list")}
              className={layout === "list" ? styles.activeLayoutButton : styles.layoutButton}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setLayout("grid")}
              className={layout === "grid" ? styles.activeLayoutButton : styles.layoutButton}
            >
              Cards
            </button>
          </div>
        </div>
        <div className={styles.browseResults}>
          {browseLoading ? (
            <LoadingLabel />
          ) : layout === "grid" ? (
            <ProductCardGrid products={browse} />
          ) : (
            browse.map((p) => <ProductCard key={p.id} product={p} />)
          )}
        </div>
      </section>
    </div>
  );
}
