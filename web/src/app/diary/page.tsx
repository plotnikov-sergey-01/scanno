"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoadingLabel } from "@/components/Spinner";
import { GuestActionPrompt } from "@/components/GuestActionPrompt";
import { Stars, VerdictBadge } from "@/components/Verdict";
import type { Review } from "@/lib/types";
import styles from "./page.module.css";

type VerdictFilter = "" | Review["verdict"];
type PriceFilter = "" | "with_price" | "without_price";

export default function DiaryPage() {
  const { user, loading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<VerdictFilter>("");
  const [query, setQuery] = useState("");
  const [store, setStore] = useState("");
  const [city, setCity] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingReviews(true);
    setError("");
    api
      .myReviews()
      .then((data) => setReviews(data.results))
      .catch((err) => {
        setReviews([]);
        setError(err instanceof Error ? err.message : "Failed to load diary");
      })
      .finally(() => setLoadingReviews(false));
  }, [user]);

  const summary = useMemo(() => buildSummary(reviews), [reviews]);
  const stores = useMemo(() => getUnique(reviews.map((review) => review.store_name)), [reviews]);
  const cities = useMemo(() => getUnique(reviews.map((review) => review.city)), [reviews]);
  const filteredReviews = useMemo(
    () =>
      reviews.filter((review) => {
        const matchesVerdict = !filter || review.verdict === filter;
        const matchesStore = !store || review.store_name === store;
        const matchesCity = !city || review.city === city;
        const hasPrice = review.price_paid != null && review.price_paid !== "";
        const matchesPrice =
          !priceFilter ||
          (priceFilter === "with_price" && hasPrice) ||
          (priceFilter === "without_price" && !hasPrice);
        const searchable = [
          review.product_name,
          review.body,
          review.store_name,
          review.city,
          formatVerdict(review.verdict),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesQuery = !query.trim() || searchable.includes(query.trim().toLowerCase());

        return matchesVerdict && matchesStore && matchesCity && matchesPrice && matchesQuery;
      }),
    [city, filter, priceFilter, query, reviews, store]
  );

  if (loading) return <LoadingLabel />;

  if (!user) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>My diary</h1>
        <p className={styles.subtitle}>Your personal shelf memory.</p>
        <GuestActionPrompt text="Log in or create an account to keep your private diary." />
      </div>
    );
  }

  async function onDeleteReview(reviewId: number) {
    setDeletingId(reviewId);
    setOpenMenuId(null);
    setError("");
    try {
      await api.deleteReview(reviewId);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete review");
    } finally {
      setDeletingId(null);
    }
  }

  function clearFilters() {
    setFilter("");
    setQuery("");
    setStore("");
    setCity("");
    setPriceFilter("");
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>My diary</h1>
          <p className={styles.subtitle}>Your personal shelf memory.</p>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Diary summary">
        <SummaryTile value={summary.total} label="saved reviews" tone="saved" />
        <SummaryTile value={summary.buyAgain} label="buy again" tone="buy" />
        <SummaryTile value={summary.neverAgain} label="never again" tone="never" />
        <SummaryTile value={summary.neutral} label="neutral" tone="neutral" />
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <h2>Shelf filters</h2>
          <label>
            <span>Store</span>
            <select value={store} onChange={(event) => setStore(event.target.value)}>
              <option value="">All stores</option>
              {stores.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>City</span>
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="">All cities</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Price noted</span>
            <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}>
              <option value="">All</option>
              <option value="with_price">With price</option>
              <option value="without_price">Without price</option>
            </select>
          </label>
          <button type="button" className={styles.clearButton} onClick={clearFilters}>
            Clear filters
          </button>
        </aside>

        <main className={styles.entries}>
          <div className={styles.searchWrap}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your diary"
            />
          </div>

          <div className={styles.filters}>
            {[
              { v: "", label: "All" },
              { v: "never_again", label: "Never again" },
              { v: "buy_again", label: "Buy again" },
              { v: "neutral", label: "Neutral" },
            ].map((item) => (
              <button
                key={item.v || "all"}
                type="button"
                onClick={() => setFilter(item.v as VerdictFilter)}
                className={filter === item.v ? styles.activeFilterButton : styles.filterButton}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={styles.entriesHeader}>
            <h2>Latest entries</h2>
            <span>{filteredReviews.length} shown</span>
          </div>

          {loadingReviews ? (
            <LoadingLabel />
          ) : filteredReviews.length === 0 ? (
            <p className={styles.empty}>
              No entries found. <Link href="/search" className={styles.link}>Find a product</Link>.
            </p>
          ) : (
            <div className={styles.reviewList}>
              {filteredReviews.map((review) => (
                <article key={review.id} className={styles.reviewCard}>
                  <ReviewThumb review={review} />
                  <div className={styles.reviewMain}>
                    <div className={styles.reviewTitleRow}>
                      <div>
                        <Link href={`/products/${review.product_id}`} className={styles.productLink}>
                          {review.product_name}
                        </Link>
                        <span className={styles.visibilityPill}>
                          {review.visibility === "public" ? "Public" : "Private"}
                        </span>
                      </div>
                      <CardMenu
                        isOpen={openMenuId === review.id}
                        isDeleting={deletingId === review.id}
                        productId={review.product_id}
                        onToggle={() => setOpenMenuId(openMenuId === review.id ? null : review.id)}
                        onDelete={() => onDeleteReview(review.id)}
                      />
                    </div>

                    <div className={styles.reviewMetaRow}>
                      <VerdictBadge verdict={review.verdict} />
                      <Stars rating={review.rating} />
                    </div>

                    {review.body && <p className={styles.reviewBody}>{review.body}</p>}
                  </div>
                  <div className={styles.reviewAside}>
                    <p>{formatPlace(review)}</p>
                    <time>{formatDate(review.updated_at || review.created_at)}</time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryTile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "saved" | "buy" | "never" | "neutral";
}) {
  return (
    <div className={styles.summaryTile}>
      <span className={`${styles.summaryIcon} ${styles[tone]}`}>
        <SummaryIcon tone={tone} />
      </span>
      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}

function SummaryIcon({ tone }: { tone: "saved" | "buy" | "never" | "neutral" }) {
  if (tone === "buy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6h15l-2 8H8L6 3H3" />
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
      </svg>
    );
  }

  if (tone === "never") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="m7 7 10 10" />
      </svg>
    );
  }

  if (tone === "neutral") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M8 12h8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h8l4 4v14H7V3Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

function CardMenu({
  isOpen,
  isDeleting,
  productId,
  onToggle,
  onDelete,
}: {
  isOpen: boolean;
  isDeleting: boolean;
  productId: number;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={styles.cardMenu}>
      <button
        type="button"
        className={styles.cardMenuButton}
        onClick={onToggle}
        aria-label="Review actions"
        aria-expanded={isOpen}
      >
        ...
      </button>
      {isOpen && (
        <div className={styles.cardMenuPanel}>
          <Link href={`/products/${productId}`}>Edit</Link>
          <button type="button" onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewThumb({ review }: { review: Review }) {
  const src = review.images?.[0]?.image;

  return (
    <div className={styles.reviewThumb}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <span>{review.product_name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function buildSummary(reviews: Review[]) {
  return {
    total: reviews.length,
    buyAgain: reviews.filter((review) => review.verdict === "buy_again").length,
    neverAgain: reviews.filter((review) => review.verdict === "never_again").length,
    neutral: reviews.filter((review) => review.verdict === "neutral").length,
  };
}

function getUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function formatVerdict(verdict: Review["verdict"]) {
  if (verdict === "buy_again") return "Buy again";
  if (verdict === "never_again") return "Never again";
  return "Neutral";
}

function formatPlace(review: Review) {
  const parts = [review.store_name, review.city].filter(Boolean);
  if (review.price_paid != null && review.price_paid !== "") {
    parts.push(`paid ${review.price_paid} ${review.price_currency || ""}`.trim());
  }
  return parts.join(" · ") || "No place noted";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
