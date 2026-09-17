"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { api } from "@/lib/api";
import { ProductCard, ProductCardGrid } from "@/components/ProductCard";
import { ReviewCard } from "@/components/ReviewCard";
import { LoadingLabel } from "@/components/Spinner";
import { ImageLightbox } from "@/components/ImageLightbox";
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
  const [layout, setLayout] = useState<"list" | "grid">("grid");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .discover(feed, { days: 7, limit: 20 })
      .then((data) => {
        if (!active) return;
        if (feed === "recent_reviews") {
          setReviews(data.results as Review[]);
          setProducts([]);
        } else {
          setProducts(data.results as Product[]);
          setReviews([]);
        }
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [feed]);

  return (
    <div className={styles.page}>
      <nav className={styles.feedFilters} aria-label="Explore feeds">
        {FEEDS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={(event) => {
              setFeed(f.id);
              event.currentTarget.scrollIntoView({
                block: "nearest",
                inline: "nearest",
              });
            }}
            aria-pressed={feed === f.id}
            className={
              feed === f.id ? styles.activeFeedButton : styles.feedButton
            }
          >
            {f.label}
          </button>
        ))}
      </nav>
      <div className={styles.headingRow}>
        <h1 className={styles.title}>
          {FEEDS.find((item) => item.id === feed)?.label}
        </h1>
        {feed !== "recent_reviews" && (
          <div className={styles.layoutControls}>
            <button
              type="button"
              onClick={() => setLayout("list")}
              aria-label="List view"
              title="List view"
              aria-pressed={layout === "list"}
              className={
                layout === "list"
                  ? styles.activeLayoutButton
                  : styles.layoutButton
              }
            >
              <List size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setLayout("grid")}
              aria-label="Grid view"
              title="Grid view"
              aria-pressed={layout === "grid"}
              className={
                layout === "grid"
                  ? styles.activeLayoutButton
                  : styles.layoutButton
              }
            >
              <LayoutGrid size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <LoadingLabel className={styles.loadingLabel} />
      ) : feed === "recent_reviews" ? (
        <div className={styles.reviewGrid}>
          {reviews.length === 0 ? (
            <p className={styles.empty}>No public reviews yet.</p>
          ) : (
            reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                productFeed
                onOpenImage={(images, index) => setLightbox({ images, index })}
              />
            ))
          )}
        </div>
      ) : (
        <div className={styles.results}>
          {products.length === 0 ? (
            <p className={styles.empty}>
              Nothing in this feed yet — add a few reviews.
            </p>
          ) : layout === "grid" ? (
            <ProductCardGrid products={products} />
          ) : (
            products.map((p) => (
              <div key={p.id}>
                {typeof p.period_never_again === "number" && (
                  <p className={styles.neverMeta}>
                    {p.period_never_again} never-again this week
                  </p>
                )}
                {typeof p.period_review_count === "number" && (
                  <p className={styles.reviewMeta}>
                    {p.period_review_count} reviews this week
                  </p>
                )}
                <ProductCard product={p} />
              </div>
            ))
          )}
        </div>
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) =>
            setLightbox((current) => (current ? { ...current, index } : null))
          }
        />
      )}
    </div>
  );
}
