"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LoadingProvider";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ProductCardGrid } from "@/components/ProductCard";
import { LoadingLabel } from "@/components/Spinner";
import type { Product } from "@/lib/types";
import styles from "./page.module.css";

export default function HomePage() {
  const { user, loading } = useAuth();
  const diaryHref = !loading && user ? "/diary" : "/register";
  const [best, setBest] = useState<Product[]>([]);
  const [worst, setWorst] = useState<Product[]>([]);
  const [fresh, setFresh] = useState<Product[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(true);

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
      })
      .finally(() => setFeedsLoading(false));
  }, []);

  return (
    <div className={styles.root}>
      <section className={styles.hero}>
        <p className={styles.brand}>
          Scanno
        </p>
        <h1 className={styles.heroTitle}>
          Scan it before you buy it again.
        </h1>
        <p className={styles.heroCopy}>
          Remember what you loved — and what you swore never to buy again. Share ratings so others
          skip the same mistake on the shelf.
        </p>
        <div className={styles.heroActions}>
          <Link
            href="/explore"
            className={styles.primaryLink}
          >
            Explore rankings
          </Link>
          <Link
            href="/search"
            className={styles.secondaryLink}
          >
            Search or scan
          </Link>
          <Link
            href={diaryHref}
            className={styles.secondaryLink}
          >
            {user ? "Open your diary" : "Start your diary"}
          </Link>
        </div>
      </section>

      <section className={styles.features}>
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
            <h2 className={styles.featureTitle}>{item.title}</h2>
            <p className={styles.featureCopy}>{item.body}</p>
          </div>
        ))}
      </section>

      {feedsLoading && (
        <section className={styles.feedSection}>
          <LoadingLabel />
        </section>
      )}

      {!feedsLoading && best.length > 0 && (
        <section className={styles.feedSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.buyTitle}>Worth buying</h2>
              <p className={styles.sectionCopy}>Highest rated products people keep choosing.</p>
            </div>
            <Link href="/explore" className={styles.sectionLink}>
              See all
            </Link>
          </div>
          <ProductCardGrid products={best} />
        </section>
      )}

      {!feedsLoading && worst.length > 0 && (
        <section className={styles.feedSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.neverTitle}>Skip these</h2>
              <p className={styles.sectionCopy}>Most “never again” verdicts lately — curiosity welcome.</p>
            </div>
            <Link href="/explore" className={styles.sectionLink}>
              See all
            </Link>
          </div>
          <ProductCardGrid products={worst} />
        </section>
      )}

      {!feedsLoading && fresh.length > 0 && (
        <section className={styles.feedSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.feedTitle}>Just added</h2>
              <p className={styles.sectionCopy}>New products in the catalog.</p>
            </div>
            <Link href="/explore" className={styles.sectionLink}>
              Explore
            </Link>
          </div>
          <ProductCardGrid products={fresh} />
        </section>
      )}
    </div>
  );
}
