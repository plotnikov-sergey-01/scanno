"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Ellipsis,
  ImageOff,
  Pencil,
  PencilLine,
  ShoppingCart,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Comment, Review } from "@/lib/types";
import { GuestActionPrompt } from "./GuestActionPrompt";
import { Stars, VerdictBadge } from "./Verdict";
import styles from "./ReviewCard.module.css";

type CommentReaction = {
  liked: boolean;
  disliked: boolean;
  likes: number;
  dislikes: number;
};

function reactionMap(comments: Comment[]) {
  return Object.fromEntries(
    comments.map((comment) => [
      comment.id,
      {
        liked: comment.my_reaction === "like",
        disliked: comment.my_reaction === "dislike",
        likes: comment.likes,
        dislikes: comment.dislikes,
      },
    ]),
  ) as Record<number, CommentReaction>;
}

function asCommentList(data: Comment[] | { results?: Comment[] } | undefined | null): Comment[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export function ReviewCard({
  review,
  onOpenImage,
  onEditReview,
  productFeed = false,
}: {
  review: Review;
  onOpenImage?: (images: string[], index: number) => void;
  onEditReview?: () => void;
  productFeed?: boolean;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(() =>
    asCommentList(review.comments),
  );
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [visibleCommentCount, setVisibleCommentCount] = useState(2);
  const [liked, setLiked] = useState(Boolean(review.liked));
  const [likeCount, setLikeCount] = useState(review.like_count || 0);
  const [savingLike, setSavingLike] = useState(false);
  const [likeError, setLikeError] = useState("");
  const [commentReactions, setCommentReactions] = useState<
    Record<number, CommentReaction>
  >(() => reactionMap(asCommentList(review.comments)));
  const [savingReactionId, setSavingReactionId] = useState<number | null>(null);
  const [reactionError, setReactionError] = useState("");
  const images = review.images?.map((i) => i.image) || [];
  const visibleComments = comments.slice(-visibleCommentCount);
  const hiddenCommentCount = Math.max(0, comments.length - visibleCommentCount);
  const canEditReview = Boolean(user && user.username === review.user.username);
  const updated =
    review.updated_at &&
    new Date(review.updated_at).getTime() -
      new Date(review.created_at).getTime() >
      60_000;

  useEffect(() => {
    const embedded = asCommentList(review.comments);
    setComments(embedded);
    setCommentReactions(reactionMap(embedded));

    let cancelled = false;
    api
      .getReviewComments(review.id)
      .then((data) => {
        if (cancelled) return;
        const nextComments = asCommentList(data);
        if (!nextComments.length && embedded.length) return;
        setComments(nextComments);
        setCommentReactions(reactionMap(nextComments));
      })
      .catch(() => {
        /* Keep comments already returned with the review. */
      });
    return () => {
      cancelled = true;
    };
  }, [review.id]);

  useEffect(() => {
    setLiked(Boolean(review.liked));
    setLikeCount(review.like_count || 0);
  }, [review.id, review.liked, review.like_count]);

  useEffect(() => {
    setVisibleCommentCount(2);
  }, [review.id, comments.length]);

  async function onCommentSubmit(e: FormEvent) {
    e.preventDefault();
    const body = commentBody.trim();
    if (!body) return;

    setSavingComment(true);
    setCommentError("");
    try {
      const created = await api.addComment(review.id, body);
      try {
        const data = await api.getReviewComments(review.id);
        const nextComments = asCommentList(data);
        setComments(nextComments.length ? nextComments : [...comments, created]);
        setCommentReactions(
          reactionMap(nextComments.length ? nextComments : [...comments, created]),
        );
      } catch {
        const nextComments = [...comments, created];
        setComments(nextComments);
        setCommentReactions(reactionMap(nextComments));
      }
      setCommentBody("");
      setShowCommentForm(false);
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : "Could not save comment",
      );
    } finally {
      setSavingComment(false);
    }
  }

  async function onCommentReaction(
    commentId: number,
    reaction: "like" | "dislike",
  ) {
    if (!user) return;

    setSavingReactionId(commentId);
    setReactionError("");
    try {
      const updatedComment = await api.reactToComment(commentId, reaction);
      setCommentReactions((current) => ({
        ...current,
        [commentId]: {
          liked: updatedComment.my_reaction === "like",
          disliked: updatedComment.my_reaction === "dislike",
          likes: updatedComment.likes,
          dislikes: updatedComment.dislikes,
        },
      }));
    } catch (err) {
      setReactionError(
        err instanceof Error ? err.message : "Could not save reaction",
      );
    } finally {
      setSavingReactionId(null);
    }
  }

  async function onUpdateComment(commentId: number, body: string) {
    const updatedComment = await api.updateComment(commentId, body);
    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId ? updatedComment : comment,
      ),
    );
    setCommentReactions((current) => ({
      ...current,
      [commentId]: {
        liked: updatedComment.my_reaction === "like",
        disliked: updatedComment.my_reaction === "dislike",
        likes: updatedComment.likes,
        dislikes: updatedComment.dislikes,
      },
    }));
  }

  async function onDeleteComment(commentId: number) {
    await api.deleteComment(commentId);
    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    );
    setCommentReactions((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
  }

  async function onToggleLike() {
    if (!user) {
      setLikeError("Log in to like this review.");
      return;
    }
    setSavingLike(true);
    setLikeError("");
    try {
      const result = await api.likeReview(review.id);
      setLiked(result.liked);
      setLikeCount(result.like_count);
    } catch (err) {
      setLikeError(err instanceof Error ? err.message : "Could not save like");
    } finally {
      setSavingLike(false);
    }
  }

  return (
    <article className={`${styles.card} ${productFeed ? styles.feedCard : ""}`}>
      {productFeed && <FeedProductPhoto review={review} />}
      <div className={productFeed ? styles.feedContent : undefined}>
        {productFeed && (
          <div className={styles.feedProductHeading}>
            <div className={styles.feedProductInfo}>
              <h2 className={styles.feedProductTitle}>
                <Link href={`/products/${review.product_id}`}>
                  {review.product_name}
                </Link>
              </h2>
              {review.product_brand && (
                <p className={styles.feedProductBrand}>
                  {review.product_brand}
                </p>
              )}
            </div>
            <FeedReviewMenu review={review} />
          </div>
        )}
        {productFeed ? (
          <div className={styles.feedReviewHeader}>
            <div className={styles.feedIdentity}>
              <FeedAvatar review={review} />
              <div className={styles.feedAuthorInfo}>
                <Link
                  href={`/u/${review.user.username}`}
                  className={styles.author}
                >
                  {review.user.display_name || review.user.username}
                </Link>
                <div
                  className={styles.feedVerdict}
                  data-verdict={review.verdict}
                >
                  <VerdictBadge verdict={review.verdict} />
                </div>
              </div>
            </div>
            <div className={styles.feedRating}>
              <span
                className={styles.feedSingleStar}
                role="img"
                aria-label={`${review.rating} of 5`}
              >
                ★
              </span>
              <span className={styles.feedRatingValue}>
                {review.rating.toFixed(1)}
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.topRow}>
            <div className={styles.reviewIdentity}>
              <ReviewAvatar review={review} />
              <div className={styles.reviewHeading}>
                <div className={styles.header}>
                  <Link
                    href={`/u/${review.user.username}`}
                    className={styles.author}
                  >
                    {review.user.display_name || review.user.username}
                  </Link>
                  <VerdictBadge verdict={review.verdict} />
                  <Stars rating={review.rating} />
                </div>
              </div>
            </div>
            {canEditReview && onEditReview && (
              <button
                type="button"
                onClick={onEditReview}
                className={styles.editButton}
                aria-label="Edit review"
                title="Edit review"
              >
                <PencilLine size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {review.body && <p className={styles.body}>{review.body}</p>}
        {productFeed ? (
          <div className={styles.feedMetaLine}>
            <time
              className={styles.feedDate}
              dateTime={review.created_at}
              title={
                updated
                  ? `Updated ${new Date(review.updated_at).toLocaleDateString("uk-UA")}`
                  : undefined
              }
            >
              {new Date(review.created_at).toLocaleDateString("uk-UA")}
            </time>
            <span className={styles.feedStoreMeta}>
              <ShoppingCart size={16} aria-hidden="true" />
              {review.store_name || review.city || null}
            </span>
            {review.price_paid != null && review.price_paid !== "" && (
              <span>
                paid {review.price_paid} {review.price_currency || ""}
              </span>
            )}
          </div>
        ) : null}
        {!productFeed && (review.store_name || review.city || review.price_paid) && (
          <p className={styles.meta}>
            <span>
              {[review.store_name, review.city].filter(Boolean).join(" · ")}
              {review.price_paid != null && review.price_paid !== "" && (
                <>
                  {(review.store_name || review.city) && " · "}
                  paid {review.price_paid} {review.price_currency || ""}
                </>
              )}
            </span>
          </p>
        )}
        {images.length > 0 && (
          <div className={styles.images}>
            {images.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className={styles.imageButton}
                aria-label={`Open review photo ${index + 1}`}
                onClick={() => onOpenImage?.(images, index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className={styles.image} />
              </button>
            ))}
          </div>
        )}
        {!productFeed && (
          <p className={styles.date}>
            {updated ? (
              <>
                Updated {new Date(review.updated_at).toLocaleDateString()}
                <span className={styles.dateDetail}>
                  {" "}
                  · first posted{" "}
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </>
            ) : (
              new Date(review.created_at).toLocaleDateString()
            )}
            {comments.length ? ` · ${comments.length} comments` : ""}
          </p>
        )}
        <div className={styles.comments}>
          {visibleComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              reaction={commentReactions[comment.id]}
              onReact={onCommentReaction}
              onUpdate={onUpdateComment}
              onDelete={onDeleteComment}
              canManage={Boolean(user && user.username === comment.user.username)}
              disabled={!user || savingReactionId === comment.id}
            />
          ))}

          {reactionError && (
            <p className={styles.commentError}>{reactionError}</p>
          )}

        {hiddenCommentCount > 0 && (
          <button
            type="button"
            className={styles.showMoreComments}
            onClick={() => setVisibleCommentCount((count) => count + 3)}
          >
            Show {Math.min(3, hiddenCommentCount)} more{" "}
            {Math.min(3, hiddenCommentCount) === 1 ? "comment" : "comments"}
          </button>
        )}

        <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.addCommentButton}
              onClick={() => setShowCommentForm((value) => !value)}
              aria-expanded={showCommentForm}
              aria-controls={`comment-form-${review.id}`}
            >
              <CommentIcon />
              {showCommentForm ? "Cancel comment" : "Add comment"}
            </button>
            <button
              type="button"
              className={liked ? styles.likedButton : styles.likeButton}
              onClick={() => {
                void onToggleLike();
              }}
              disabled={savingLike}
              aria-pressed={liked}
              aria-label={`${liked ? "Unlike" : "Like"} review, ${likeCount} likes`}
              title={user ? "Like review" : "Log in to like"}
            >
              <HeartIcon filled={liked} />
              {likeCount}
            </button>
          </div>
          {likeError ? <p className={styles.commentError}>{likeError}</p> : null}

          {user && showCommentForm ? (
            <form
              id={`comment-form-${review.id}`}
              onSubmit={onCommentSubmit}
              className={styles.commentForm}
            >
              <input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write a comment"
                aria-label="Your comment"
                className={styles.commentInput}
              />
              <button
                type="submit"
                disabled={savingComment || !commentBody.trim()}
                className={styles.commentButton}
              >
                {savingComment ? "Saving..." : "Post"}
              </button>
              {commentError && (
                <p className={styles.commentError}>{commentError}</p>
              )}
            </form>
          ) : !user && showCommentForm ? (
            <GuestActionPrompt text="Log in or create an account to write a comment." />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CommentItem({
  comment,
  reaction,
  onReact,
  onUpdate,
  onDelete,
  canManage,
  disabled,
}: {
  comment: Comment;
  reaction?: CommentReaction;
  onReact: (commentId: number, reaction: "like" | "dislike") => void;
  onUpdate: (commentId: number, body: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  canManage: boolean;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const current = reaction ?? {
    liked: false,
    disliked: false,
    likes: 0,
    dislikes: 0,
  };

  async function saveEdit() {
    const body = draft.trim();
    if (!body || body === comment.body) {
      setEditing(false);
      setDraft(comment.body);
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      await onUpdate(comment.id, body);
      setEditing(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not update comment",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeComment() {
    if (!window.confirm("Delete this comment?")) return;
    setSaving(true);
    setActionError("");
    try {
      await onDelete(comment.id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not delete comment",
      );
      setSaving(false);
    }
  }

  return (
    <div className={styles.comment}>
      <CommentAvatar comment={comment} />
      <div className={styles.commentContent}>
        {canManage ? (
          <div className={styles.commentActions}>
            <button
              type="button"
              className={styles.commentActionButton}
              onClick={() => {
                setEditing(true);
                setDraft(comment.body);
                setActionError("");
              }}
              disabled={saving}
              aria-label="Edit comment"
              title="Edit comment"
            >
              <Pencil size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.commentActionDanger}
              onClick={removeComment}
              disabled={saving}
              aria-label="Delete comment"
              title="Delete comment"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <div className={canManage ? styles.commentHeaderOwn : styles.commentHeader}>
          <Link
            href={`/u/${comment.user.username}`}
            className={styles.commentAuthor}
          >
            {comment.user.display_name || comment.user.username}
          </Link>
          <time className={styles.commentDate} dateTime={comment.created_at}>
            {new Date(comment.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
        {editing ? (
          <form
            className={styles.commentEditForm}
            onSubmit={(event) => {
              event.preventDefault();
              void saveEdit();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={styles.commentInput}
              aria-label="Edit comment"
              disabled={saving}
            />
            <button
              type="submit"
              className={styles.commentButton}
              disabled={saving || !draft.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className={styles.commentEditCancel}
              onClick={() => {
                setEditing(false);
                setDraft(comment.body);
                setActionError("");
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className={styles.commentBodyRow}>
            <p>{comment.body}</p>
            <div className={styles.commentReactions}>
              <button
                type="button"
                className={
                  current.liked
                    ? styles.commentReactionActive
                    : styles.commentReaction
                }
                onClick={() => onReact(comment.id, "like")}
                disabled={disabled}
                aria-pressed={current.liked}
                aria-label={`Like comment, ${current.likes} likes`}
                title={disabled ? "Log in to react" : "Like comment"}
              >
                <ThumbsUp size={16} aria-hidden="true" />
                {current.likes}
              </button>
              <button
                type="button"
                className={
                  current.disliked
                    ? styles.commentReactionDislikeActive
                    : styles.commentReaction
                }
                onClick={() => onReact(comment.id, "dislike")}
                disabled={disabled}
                aria-pressed={current.disliked}
                aria-label={`Dislike comment, ${current.dislikes} dislikes`}
                title={disabled ? "Log in to react" : "Dislike comment"}
              >
                <ThumbsDown size={16} aria-hidden="true" />
                {current.dislikes}
              </button>
            </div>
          </div>
        )}
        {actionError ? (
          <p className={styles.commentError}>{actionError}</p>
        ) : null}
      </div>
    </div>
  );
}

function ReviewAvatar({ review }: { review: Review }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const src = review.user.avatar;
  const name = review.user.display_name || review.user.username;

  return (
    <Link
      href={`/u/${review.user.username}`}
      className={styles.reviewAvatar}
      aria-label={`View ${name}'s profile`}
    >
      {src && src !== failedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(src)}
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </Link>
  );
}

function CommentAvatar({ comment }: { comment: Comment }) {
  const name = comment.user.display_name || comment.user.username;

  return (
    <Link
      href={`/u/${comment.user.username}`}
      className={styles.commentAvatar}
      aria-label={`View ${name}'s profile`}
    >
      {comment.user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={comment.user.avatar} alt="" loading="lazy" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </Link>
  );
}

function FeedProductPhoto({ review }: { review: Review }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const src = review.product_image_url;

  return (
    <Link
      href={`/products/${review.product_id}`}
      className={styles.feedPhoto}
      aria-label={`View ${review.product_name}`}
    >
      {src && src !== failedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={review.product_name}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(src)}
        />
      ) : (
        <span className={styles.feedPhotoFallback}>
          <ImageOff size={40} strokeWidth={1.25} aria-hidden="true" />
          <span>No product photo</span>
        </span>
      )}
    </Link>
  );
}

function FeedAvatar({ review }: { review: Review }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const src = review.user.avatar;
  const name = review.user.display_name || review.user.username;

  return (
    <Link
      href={`/u/${review.user.username}`}
      className={styles.feedAvatar}
      aria-label={`View ${name}'s profile`}
    >
      {src && src !== failedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(src)}
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </Link>
  );
}

function FeedReviewMenu({ review }: { review: Review }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      className={styles.feedMenu}
      ref={menuRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.feedMenuButton}
        aria-label={`More options for ${review.product_name}`}
        title="Review options"
        aria-expanded={open}
        aria-controls={`review-options-${review.id}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Ellipsis size={22} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`review-options-${review.id}`}
          className={styles.feedMenuPanel}
        >
          <Link
            href={`/products/${review.product_id}`}
            onClick={() => setOpen(false)}
          >
            <ArrowUpRight size={18} aria-hidden="true" /> View product
          </Link>
          <Link
            href={`/u/${review.user.username}`}
            onClick={() => setOpen(false)}
          >
            <UserRound size={18} aria-hidden="true" /> View profile
          </Link>
        </div>
      )}
    </div>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.actionIcon}>
      <path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 2.5Z" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.actionIcon}>
      <path
        className={filled ? styles.heartFilled : undefined}
        d="M12 20s-7-4.4-9-9.1C1.6 7.6 3.6 5 6.7 5c1.8 0 3.2 1 4.1 2.2C11.7 6 13.1 5 14.9 5c3.1 0 5.1 2.6 3.7 5.9C16.6 15.6 12 20 12 20Z"
      />
    </svg>
  );
}
