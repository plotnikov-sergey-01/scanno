"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { ReviewCard } from "@/components/ReviewCard";
import { LoadingLabel } from "@/components/Spinner";
import type { PublicUser, Review } from "@/lib/types";
import styles from "./page.module.css";

export default function UserProfilePage() {
  const params = useParams();
  const username = String(params.username);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");

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

  return (
    <div>
      <h1 className={styles.title}>
        {profile.display_name || profile.username}
      </h1>
      <p className={styles.username}>@{profile.username}</p>
      {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
      <section className={styles.reviewsSection}>
        <h2 className={styles.sectionTitle}>Public reviews</h2>
        {reviews.length === 0 ? (
          <p className={styles.empty}>No public reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id}>
              <a href={`/products/${r.product_id}`} className={styles.productLink}>
                {r.product_name}
              </a>
              <ReviewCard review={r} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
