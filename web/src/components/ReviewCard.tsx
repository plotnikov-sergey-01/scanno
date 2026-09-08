"use client";

import Link from "@/components/LoadingProvider";
import type { Review } from "@/lib/types";
import { Stars, VerdictBadge } from "./Verdict";
import styles from "./ReviewCard.module.css";

export function ReviewCard({
  review,
  onOpenImage,
}: {
  review: Review;
  onOpenImage?: (images: string[], index: number) => void;
}) {
  const images = review.images?.map((i) => i.image) || [];
  const updated =
    review.updated_at &&
    new Date(review.updated_at).getTime() - new Date(review.created_at).getTime() > 60_000;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <Link href={`/u/${review.user.username}`} className={styles.author}>
          {review.user.display_name || review.user.username}
        </Link>
        <VerdictBadge verdict={review.verdict} />
        <Stars rating={review.rating} />
      </div>
      {review.body && <p className={styles.body}>{review.body}</p>}
      {(review.store_name || review.city || review.price_paid) && (
        <p className={styles.meta}>
          {[review.store_name, review.city].filter(Boolean).join(" · ")}
          {review.price_paid != null && review.price_paid !== "" && (
            <>
              {(review.store_name || review.city) && " · "}
              paid {review.price_paid} {review.price_currency || ""}
            </>
          )}
        </p>
      )}
      {images.length > 0 && (
        <div className={styles.images}>
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              className={styles.imageButton}
              onClick={() => onOpenImage?.(images, index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className={styles.image} />
            </button>
          ))}
        </div>
      )}
      <p className={styles.date}>
        {updated ? (
          <>
            Updated {new Date(review.updated_at).toLocaleDateString()}
            <span className={styles.dateDetail}>
              {" "}
              · first posted {new Date(review.created_at).toLocaleDateString()}
            </span>
          </>
        ) : (
          new Date(review.created_at).toLocaleDateString()
        )}
        {review.comment_count ? ` · ${review.comment_count} comments` : ""}
      </p>
    </article>
  );
}
