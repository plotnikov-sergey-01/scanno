"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ReviewCard } from "@/components/ReviewCard";
import type { Review } from "@/lib/types";

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

  if (loading || !user) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">My diary</h1>
      <p className="mt-2 text-ink-700/80">Your personal shelf memory.</p>
      <div className="mt-4 flex flex-wrap gap-2">
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
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === f.v ? "bg-scan-500 text-white" : "bg-white text-ink-700 ring-1 ring-ink-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-verdict-never">{error}</p>}
      <div className="mt-6">
        {loadingReviews ? (
          <p className="text-ink-700/70">Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="text-ink-700/70">
            No entries yet. <Link href="/search" className="text-scan-600">Find a product</Link>.
          </p>
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
    </div>
  );
}
