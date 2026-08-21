"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ProductCard, ProductCardGrid } from "@/components/ProductCard";
import { ReviewCard } from "@/components/ReviewCard";
import type { Product, Review } from "@/lib/types";

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
    api
      .browse(params)
      .then((data) => setBrowse(data.results))
      .catch(() => setBrowse([]));
  }, [sort, minRating, minNever, category]);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Explore</h1>
      <p className="mt-2 text-ink-700/80">
        Browse what people loved, hated, and just added — no barcode required.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FEEDS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFeed(f.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              feed === f.id ? "bg-scan-500 text-white" : "bg-white text-ink-700 ring-1 ring-ink-100"
            }`}
          >
            {f.label}
          </button>
        ))}
        {feed !== "recent_reviews" && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setLayout("list")}
              className={`rounded-md px-2 py-1 text-sm ${
                layout === "list" ? "bg-ink-900 text-white" : "bg-white ring-1 ring-ink-100"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setLayout("grid")}
              className={`rounded-md px-2 py-1 text-sm ${
                layout === "grid" ? "bg-ink-900 text-white" : "bg-white ring-1 ring-ink-100"
              }`}
            >
              Cards
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-verdict-never">{error}</p>}
      {loading ? (
        <p className="mt-6 text-ink-700/70">Loading…</p>
      ) : feed === "recent_reviews" ? (
        <div className="mt-6">
          {reviews.length === 0 ? (
            <p className="text-ink-700/70">No public reviews yet.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id}>
                <Link href={`/products/${r.product_id}`} className="text-sm font-medium text-scan-600">
                  {r.product_name}
                </Link>
                <ReviewCard review={r} />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="mt-6">
          {products.length === 0 ? (
            <p className="text-ink-700/70">Nothing in this feed yet — add a few reviews.</p>
          ) : layout === "grid" ? (
            <ProductCardGrid products={products} />
          ) : (
            products.map((p) => (
              <div key={p.id}>
                {typeof p.period_never_again === "number" && (
                  <p className="text-xs text-verdict-never">{p.period_never_again} never-again this week</p>
                )}
                {typeof p.period_review_count === "number" && (
                  <p className="text-xs text-ink-700/60">{p.period_review_count} reviews this week</p>
                )}
                <ProductCard product={p} />
              </div>
            ))
          )}
        </div>
      )}

      <section className="mt-14 border-t border-ink-100 pt-10">
        <h2 className="font-display text-2xl font-bold">Browse &amp; filter</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-sm">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="ml-2 rounded border border-ink-100 bg-white px-2 py-1"
            >
              <option value="recent">Newest</option>
              <option value="rating">Best rated</option>
              <option value="reviews">Most reviews</option>
              <option value="never_again">Most never-again</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label className="text-sm">
            Min rating
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="ml-2 rounded border border-ink-100 bg-white px-2 py-1"
            >
              <option value="">Any</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
            </select>
          </label>
          <label className="text-sm">
            Min never-again %
            <select
              value={minNever}
              onChange={(e) => setMinNever(e.target.value)}
              className="ml-2 rounded border border-ink-100 bg-white px-2 py-1"
            >
              <option value="">Any</option>
              <option value="25">25%+</option>
              <option value="50">50%+</option>
              <option value="75">75%+</option>
            </select>
          </label>
          <label className="text-sm">
            Category
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Beverages"
              className="ml-2 w-40 rounded border border-ink-100 bg-white px-2 py-1"
            />
          </label>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setLayout("list")}
              className={`rounded-md px-2 py-1 text-sm ${
                layout === "list" ? "bg-ink-900 text-white" : "bg-white ring-1 ring-ink-100"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setLayout("grid")}
              className={`rounded-md px-2 py-1 text-sm ${
                layout === "grid" ? "bg-ink-900 text-white" : "bg-white ring-1 ring-ink-100"
              }`}
            >
              Cards
            </button>
          </div>
        </div>
        <div className="mt-4">
          {layout === "grid" ? (
            <ProductCardGrid products={browse} />
          ) : (
            browse.map((p) => <ProductCard key={p.id} product={p} />)
          )}
        </div>
      </section>
    </div>
  );
}
