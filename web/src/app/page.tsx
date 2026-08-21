"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ProductCardGrid } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export default function HomePage() {
  const { user, loading } = useAuth();
  const diaryHref = !loading && user ? "/diary" : "/register";
  const [best, setBest] = useState<Product[]>([]);
  const [worst, setWorst] = useState<Product[]>([]);
  const [fresh, setFresh] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([
      api.discover("top_rated", { days: 30, limit: 6 }),
      api.discover("most_hated", { days: 30, limit: 6 }),
      api.discover("recent_products", { limit: 6 }),
    ])
      .then(([top, hated, recent]) => {
        setBest((top.results as Product[]) || []);
        setWorst((hated.results as Product[]) || []);
        setFresh((recent.results as Product[]) || []);
      })
      .catch(() => {
        /* empty feeds are fine */
      });
  }, []);

  return (
    <div className="relative overflow-hidden">
      <section className="pb-12 pt-6 md:pt-12">
        <p className="font-display text-5xl font-extrabold tracking-tight text-ink-900 md:text-7xl">
          Scanno
        </p>
        <h1 className="mt-4 max-w-xl font-display text-2xl font-semibold leading-snug text-ink-700 md:text-3xl">
          Scan it before you buy it again.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-ink-700/80">
          Remember what you loved — and what you swore never to buy again. Share ratings so others
          skip the same mistake on the shelf.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/explore"
            className="rounded-lg bg-scan-500 px-5 py-3 font-semibold text-white shadow-md shadow-scan-500/25 hover:bg-scan-600"
          >
            Explore rankings
          </Link>
          <Link
            href="/search"
            className="rounded-lg border border-ink-100 bg-white/70 px-5 py-3 font-semibold text-ink-900 hover:border-scan-400"
          >
            Search or scan
          </Link>
          <Link
            href={diaryHref}
            className="rounded-lg border border-ink-100 bg-white/70 px-5 py-3 font-semibold text-ink-900 hover:border-scan-400"
          >
            {user ? "Open your diary" : "Start your diary"}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 border-t border-ink-100 py-12 md:grid-cols-3">
        {[
          {
            title: "Scan barcode",
            body: "Look up a product in seconds — Open Food Facts plus your own catalog.",
          },
          {
            title: "Verdict, not just stars",
            body: "Mark buy again or never again. That’s the signal you need in the aisle.",
          },
          {
            title: "Public memory",
            body: "Your reviews help others. Private mode keeps a personal blacklist.",
          },
        ].map((item) => (
          <div key={item.title}>
            <h2 className="font-display text-xl font-bold text-ink-900">{item.title}</h2>
            <p className="mt-2 text-ink-700/80">{item.body}</p>
          </div>
        ))}
      </section>

      {best.length > 0 && (
        <section className="border-t border-ink-100 py-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-verdict-buy">Worth buying</h2>
              <p className="text-sm text-ink-700/70">Highest rated products people keep choosing.</p>
            </div>
            <Link href="/explore" className="text-sm font-medium text-scan-600 hover:underline">
              See all
            </Link>
          </div>
          <ProductCardGrid products={best} />
        </section>
      )}

      {worst.length > 0 && (
        <section className="border-t border-ink-100 py-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-verdict-never">Skip these</h2>
              <p className="text-sm text-ink-700/70">Most “never again” verdicts lately — curiosity welcome.</p>
            </div>
            <Link href="/explore" className="text-sm font-medium text-scan-600 hover:underline">
              See all
            </Link>
          </div>
          <ProductCardGrid products={worst} />
        </section>
      )}

      {fresh.length > 0 && (
        <section className="border-t border-ink-100 py-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-900">Just added</h2>
              <p className="text-sm text-ink-700/70">New products in the catalog.</p>
            </div>
            <Link href="/explore" className="text-sm font-medium text-scan-600 hover:underline">
              Explore
            </Link>
          </div>
          <ProductCardGrid products={fresh} />
        </section>
      )}
    </div>
  );
}
