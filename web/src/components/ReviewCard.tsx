"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Comment, Review } from "@/lib/types";
import { GuestActionPrompt } from "./GuestActionPrompt";
import { Stars, VerdictBadge } from "./Verdict";
import styles from "./ReviewCard.module.css";

export function ReviewCard({
  review,
  onOpenImage,
}: {
  review: Review;
  onOpenImage?: (images: string[], index: number) => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(review.comments || []);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const images = review.images?.map((i) => i.image) || [];
  const updated =
    review.updated_at &&
    new Date(review.updated_at).getTime() - new Date(review.created_at).getTime() > 60_000;

  useEffect(() => {
    api
      .getReviewComments(review.id)
      .then((data) => setComments(Array.isArray(data) ? data : data.results))
      .catch(() => setComments(review.comments || []));
  }, [review.id, review.comments]);

  async function onCommentSubmit(e: FormEvent) {
    e.preventDefault();
    const body = commentBody.trim();
    if (!body) return;

    setSavingComment(true);
    setCommentError("");
    try {
      await api.addComment(review.id, body);
      const data = await api.getReviewComments(review.id);
      setComments(Array.isArray(data) ? data : data.results);
      setCommentBody("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Could not save comment");
    } finally {
      setSavingComment(false);
    }
  }

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
        {comments.length ? ` · ${comments.length} comments` : ""}
      </p>
      <div className={styles.comments}>
        {comments.map((comment) => (
          <div key={comment.id} className={styles.comment}>
            <Link href={`/u/${comment.user.username}`} className={styles.commentAuthor}>
              {comment.user.display_name || comment.user.username}
            </Link>
            <p>{comment.body}</p>
          </div>
        ))}

        {user ? (
          <form onSubmit={onCommentSubmit} className={styles.commentForm}>
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment"
              className={styles.commentInput}
            />
            <button
              type="submit"
              disabled={savingComment || !commentBody.trim()}
              className={styles.commentButton}
            >
              {savingComment ? "Saving..." : "Post"}
            </button>
            {commentError && <p className={styles.commentError}>{commentError}</p>}
          </form>
        ) : (
          <GuestActionPrompt text="Log in or create an account to write a comment." />
        )}
      </div>
    </article>
  );
}
