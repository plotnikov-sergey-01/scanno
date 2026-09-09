"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LoadingProvider";
import { useLoadingRouter as useRouter } from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ReviewCard } from "@/components/ReviewCard";
import { LoadingLabel } from "@/components/Spinner";
import type { Review } from "@/lib/types";
import styles from "./page.module.css";

export default function DiaryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [error, setError] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoadingReviews(true);
    setError("");
    api
      .myReviews(filter ? { verdict: filter } : undefined)
      .then((data) => setReviews(data.results))
      .catch((err) => {
        setReviews([]);
        setError(err instanceof Error ? err.message : "Failed to load diary");
      })
      .finally(() => setLoadingReviews(false));
  }, [user, filter]);

  if (loading || !user) return <LoadingLabel />;

  return (
    <div>
      <h1 className={styles.title}>My diary</h1>
      <p className={styles.subtitle}>Your personal shelf memory.</p>
      <div className={styles.filters}>
        {[
          { v: "", label: "All" },
          { v: "never_again", label: "Never again" },
          { v: "buy_again", label: "Buy again" },
          { v: "neutral", label: "Neutral" },
        ].map((f) => (
          <button
            key={f.v || "all"}
            type="button"
            onClick={() => setFilter(f.v)}
            className={filter === f.v ? styles.activeFilterButton : styles.filterButton}
          >
            {f.label}
          </button>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.reviews}>
        {loadingReviews ? (
          <LoadingLabel />
        ) : reviews.length === 0 ? (
          <p className={styles.empty}>
            No entries yet. <Link href="/search" className={styles.link}>Find a product</Link>.
          </p>
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
    </div>
  );
}
