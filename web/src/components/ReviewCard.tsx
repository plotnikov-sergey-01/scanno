"use client";

import Link from "next/link";
import type { Review } from "@/lib/types";
import { Stars, VerdictBadge } from "./Verdict";

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
    <article className="border-b border-ink-100 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/u/${review.user.username}`} className="font-semibold text-ink-900 hover:text-scan-600">
          {review.user.display_name || review.user.username}
        </Link>
        <VerdictBadge verdict={review.verdict} />
        <Stars rating={review.rating} />
      </div>
      {review.body && <p className="mt-2 whitespace-pre-wrap text-ink-700">{review.body}</p>}
      {(review.store_name || review.city || review.price_paid) && (
        <p className="mt-1 text-xs text-ink-700/60">
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
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              className="shrink-0"
              onClick={() => onOpenImage?.(images, index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-24 w-24 rounded-md bg-ink-100 object-contain" />
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-ink-700/50">
        {updated ? (
          <>
            Updated {new Date(review.updated_at).toLocaleDateString()}
            <span className="text-ink-700/40">
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
