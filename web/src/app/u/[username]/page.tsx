"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { ReviewCard } from "@/components/ReviewCard";
import type { PublicUser, Review } from "@/lib/types";

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

  if (error) return <p className="text-verdict-never">{error}</p>;
  if (!profile) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">
        {profile.display_name || profile.username}
      </h1>
      <p className="text-ink-700/70">@{profile.username}</p>
      {profile.bio && <p className="mt-3 text-ink-700">{profile.bio}</p>}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Public reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-ink-700/70">No public reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id}>
              <a href={`/products/${r.product_id}`} className="text-sm text-scan-600">
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
