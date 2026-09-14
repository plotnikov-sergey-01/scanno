"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ReviewCard } from "@/components/ReviewCard";
import { LoadingLabel } from "@/components/Spinner";
import type { PublicUser, Review } from "@/lib/types";
import styles from "./page.module.css";

export default function UserProfilePage() {
  const params = useParams();
  const username = String(params.username);
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.getUser(username), api.getUserReviews(username)])
      .then(([u, r]) => {
        setProfile(u as PublicUser);
        setReviews(r.results);
      })
      .catch((err) => setError(err.message));
  }, [username]);

  if (error) return <p className={styles.error}>{error}</p>;
  if (!profile) return <LoadingLabel />;

  const summary = buildProfileSummary(reviews);
  const isOwnProfile = user?.username === profile.username;

  async function onDeleteReview(reviewId: number) {
    setDeletingId(reviewId);
    setOpenMenuId(null);
    try {
      await api.deleteReview(reviewId);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete review");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.identity}>
          <div className={styles.avatar}>
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt="" className={styles.avatarImage} />
            ) : (
              <span>{getInitial(profile)}</span>
            )}
          </div>
          <div>
            <h1 className={styles.title}>{profile.display_name || profile.username}</h1>
            <p className={styles.username}>@{profile.username}</p>
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
            <div className={styles.statsRow}>
              <Stat value={summary.total} label="public reviews" />
              <Stat value={summary.buyAgain} label="buy again" />
              <Stat value={summary.neverAgain} label="never again" />
              <Stat value={summary.neutral} label="neutral" />
            </div>
          </div>
        </div>

        <div className={styles.profileActions}>
          {isOwnProfile && (
            <button type="button" onClick={logout} className={styles.logoutButton}>
              Log out
            </button>
          )}
        </div>
      </section>

      {reviews.length > 0 && (
        <>
          <section className={styles.snapshot}>
            <div className={styles.snapshotMain}>
              <div>
                <h2 className={styles.sectionTitle}>Taste snapshot</h2>
                <p className={styles.sectionLead}>
                  A quick view of {profile.display_name || profile.username}&apos;s product verdicts
                </p>
              </div>
              <div className={styles.snapshotGrid}>
                <div
                  className={styles.donut}
                  style={{
                    background: `conic-gradient(#0d9f6e 0 ${summary.buyPct}%, #e85d4c ${summary.buyPct}% ${
                      summary.buyPct + summary.neverPct
                    }%, #a7b3c5 ${summary.buyPct + summary.neverPct}% 100%)`,
                  }}
                >
                  <span>
                    <strong>{summary.total}</strong>
                    public
                    <br />
                    reviews
                  </span>
                </div>
                <div className={styles.verdictList}>
                  <VerdictStat label="Buy again" value={summary.buyAgain} pct={summary.buyPct} tone="buy" />
                  <VerdictStat
                    label="Never again"
                    value={summary.neverAgain}
                    pct={summary.neverPct}
                    tone="never"
                  />
                  <VerdictStat label="Neutral" value={summary.neutral} pct={summary.neutralPct} tone="neutral" />
                </div>
              </div>
            </div>

            <div className={styles.recentPanel}>
              <h3 className={styles.panelTitle}>Recent activity</h3>
              <div className={styles.recentList}>
                {reviews.slice(0, 2).map((review) => (
                  <Link href={`/products/${review.product_id}`} key={review.id} className={styles.recentItem}>
                    <ReviewThumb review={review} />
                    <span>
                      <strong>{review.product_name}</strong>
                      <small>{formatVerdict(review.verdict)}</small>
                    </span>
                    <time>{formatRelativeDate(review.created_at)}</time>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.insightGrid}>
            <InsightCard
              title="Often buys again"
              body="Categories this profile tends to repurchase"
              value={summary.topBuyAgain || "No pattern yet"}
              count={summary.buyAgain}
              tone="buy"
            />
            <InsightCard
              title="Watch list"
              body="Things to be more cautious about"
              value={summary.watchList || "No warnings yet"}
              count={summary.neverAgain || summary.neutral}
              tone="watch"
            />
          </section>
        </>
      )}

      <section className={styles.reviewsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Latest public reviews</h2>
          <p className={styles.sectionLead}>
            {profile.display_name || profile.username}&apos;s most recent product reviews
          </p>
        </div>
        {reviews.length === 0 ? (
          <p className={styles.empty}>No public reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className={styles.reviewShell}>
              <ReviewThumb review={r} />
              <div className={styles.reviewContent}>
                <div className={styles.reviewTopline}>
                  <Link href={`/products/${r.product_id}`} className={styles.productLink}>
                    {r.product_name}
                  </Link>
                  {isOwnProfile && (
                    <div className={styles.cardMenu}>
                      <button
                        type="button"
                        className={styles.cardMenuButton}
                        onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                        aria-label="Review actions"
                        aria-expanded={openMenuId === r.id}
                      >
                        ...
                      </button>
                      {openMenuId === r.id && (
                        <div className={styles.cardMenuPanel}>
                          <button
                            type="button"
                            onClick={() => onDeleteReview(r.id)}
                            disabled={deletingId === r.id}
                          >
                            {deletingId === r.id ? "Deleting..." : "Видалити"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <ReviewCard review={r} />
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.stat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function VerdictStat({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone: "buy" | "never" | "neutral";
}) {
  return (
    <div className={styles.verdictStat}>
      <span className={`${styles.verdictDot} ${styles[tone]}`} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{pct}%</small>
    </div>
  );
}

function InsightCard({
  title,
  body,
  value,
  count,
  tone,
}: {
  title: string;
  body: string;
  value: string;
  count: number;
  tone: "buy" | "watch";
}) {
  return (
    <section className={`${styles.insightCard} ${styles[tone]}`}>
      <h3>{title}</h3>
      <p>{body}</p>
      <div className={styles.insightValue}>
        <span>{value}</span>
        <strong>{count}</strong>
      </div>
    </section>
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

function buildProfileSummary(reviews: Review[]) {
  const total = reviews.length;
  const buyAgain = reviews.filter((review) => review.verdict === "buy_again").length;
  const neverAgain = reviews.filter((review) => review.verdict === "never_again").length;
  const neutral = reviews.filter((review) => review.verdict === "neutral").length;
  const buyPct = getPct(buyAgain, total);
  const neverPct = getPct(neverAgain, total);
  const neutralPct = Math.max(0, 100 - buyPct - neverPct);
  const topBuyAgain = reviews.find((review) => review.verdict === "buy_again")?.product_name || "";
  const watchList = getWatchList(reviews);

  return { total, buyAgain, neverAgain, neutral, buyPct, neverPct, neutralPct, topBuyAgain, watchList };
}

function getPct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getInitial(profile: PublicUser) {
  return (profile.display_name || profile.username).slice(0, 1).toUpperCase();
}

function getWatchList(reviews: Review[]) {
  const cautionReview = reviews.find((review) => review.verdict === "never_again" || review.verdict === "neutral");
  if (!cautionReview) return "";
  const body = cautionReview.body.toLowerCase();
  if (body.includes("цукр") || body.includes("sugar")) return "Too much sugar";
  return cautionReview.product_name;
}

function formatVerdict(verdict: Review["verdict"]) {
  if (verdict === "buy_again") return "Buy again";
  if (verdict === "never_again") return "Never again";
  return "Neutral";
}

function formatRelativeDate(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.round(diff / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(value).toLocaleDateString();
}
