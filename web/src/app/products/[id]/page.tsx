"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "@/components/LoadingProvider";
import { useParams } from "next/navigation";
import { useLoadingRouter as useRouter } from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ReviewCard } from "@/components/ReviewCard";
import { Stars } from "@/components/Verdict";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ImageCropModal } from "@/components/ImageCropModal";
import { LoadingLabel, Spinner } from "@/components/Spinner";
import type { Product, Review } from "@/lib/types";
import styles from "./page.module.css";

const DEFAULT_PRICE_CURRENCY = "UAH";

export default function ProductPage() {
  const params = useParams();
  const id = Number(params.id);
  const { user } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    rating: 3,
    verdict: "neutral",
    body: "",
    visibility: "public",
    store_name: "",
    city: "",
    price_paid: "",
    price_currency: DEFAULT_PRICE_CURRENCY,
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<"product" | "review" | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  async function reload() {
    const [p, r] = await Promise.all([api.getProduct(id), api.productReviews(id)]);
    setProduct(p);
    setReviews(r.results);
    if (user) {
      const mine = r.results.find((rev) => rev.user.username === user.username) || null;
      setMyReview(mine);
      if (mine) {
        setForm({
          rating: mine.rating,
          verdict: mine.verdict,
          body: mine.body || "",
          visibility: mine.visibility,
          store_name: mine.store_name || "",
          city: mine.city || "",
          price_paid: mine.price_paid != null ? String(mine.price_paid) : "",
          price_currency: mine.price_currency === "RUB" ? DEFAULT_PRICE_CURRENCY : mine.price_currency || DEFAULT_PRICE_CURRENCY,
        });
      }
    } else {
      setMyReview(null);
    }
  }

  useEffect(() => {
    if (!id) return;
    reload().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.username]);

  const gallery = useMemo(() => {
    const urls: string[] = [];
    if (product?.image_url) urls.push(product.image_url);
    return urls;
  }, [product]);

  async function uploadProductBlob(blob: Blob) {
    if (!user) {
      router.push("/login");
      return;
    }
    setUploadingPhoto(true);
    setError("");
    try {
      const file = new File([blob], "product.jpg", { type: blob.type || "image/jpeg" });
      const updated = await api.uploadProductImage(id, file);
      setProduct(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      setCropFile(null);
      setCropTarget(null);
    }
  }

  function onPickProductPhoto(file: File | null) {
    if (!file) return;
    setCropTarget("product");
    setCropFile(file);
  }

  function onPickReviewPhotos(list: FileList | null) {
    if (!list?.length) return;
    const first = list[0];
    const rest = Array.from(list).slice(1);
    setPendingFiles((prev) => [...prev, ...rest]);
    setCropTarget("review");
    setCropFile(first);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    const reviewBody = form.body.trim();
    if (reviewBody.length < 3) {
      setError("Review text must be at least 3 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        rating: form.rating,
        verdict: form.verdict,
        body: reviewBody,
        visibility: form.visibility,
        store_name: form.store_name,
        city: form.city,
      };
      if (form.price_paid.trim()) {
        payload.price_paid = form.price_paid.trim();
        payload.price_currency = form.price_currency.trim().toUpperCase() || DEFAULT_PRICE_CURRENCY;
      } else {
        payload.price_paid = null;
        payload.price_currency = "";
      }
      const review = myReview
        ? await api.updateReview(myReview.id, payload)
        : await api.createReview(id, payload);
      for (const file of pendingFiles.slice(0, 5)) {
        await api.uploadReviewImage(review.id, file);
      }
      setPendingFiles([]);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  }

  if (!product && !error) {
    return <LoadingLabel />;
  }
  if (!product) {
    return <p className={styles.error}>{error}</p>;
  }

  const stats = product.stats;
  const avg = Number(stats?.avg_rating || 0);
  const canEditImage = Boolean(product.can_edit_image);

  return (
    <div>
      <div className={styles.productHeader}>
        <div className={styles.mediaColumn}>
          <button
            type="button"
            className={styles.productImageButton}
            disabled={!product.image_url}
            onClick={() =>
              product.image_url && setLightbox({ images: gallery, index: 0 })
            }
          >
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt="" className={styles.productImage} />
            ) : (
              <div className={styles.noProductPhoto}>
                No product photo
              </div>
            )}
          </button>
          {canEditImage && (
            <label className={styles.productPhotoLabel}>
              {uploadingPhoto && <Spinner size="sm" />}
              {uploadingPhoto ? "Uploading…" : product.image_url ? "Replace photo" : "Add product photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.hiddenInput}
                disabled={uploadingPhoto}
                onChange={(e) => onPickProductPhoto(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>
        <div>
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.productMeta}>
            {[product.brand, product.category].filter(Boolean).join(" · ")}
          </p>
          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}
          {product.barcode && (
            <p className={styles.barcode}>{product.barcode}</p>
          )}
          {stats && stats.review_count > 0 ? (
            <div className={styles.stats}>
              <div className={styles.ratingRow}>
                <Stars rating={Math.round(avg)} />
                <span className={styles.average}>{avg.toFixed(1)}</span>
                <span className={styles.reviewCount}>{stats.review_count} reviews</span>
              </div>
              <p className={styles.verdictStats}>
                <span className={styles.buyCount}>{stats.buy_again_count} buy again</span>
                {" · "}
                <span className={styles.neverCount}>
                  {stats.never_again_pct}% never again
                </span>
              </p>
            </div>
          ) : (
            <p className={styles.emptyStats}>Be the first to review this product.</p>
          )}
          {product.recent_prices && product.recent_prices.length > 0 && (
            <div className={styles.prices}>
              <p className={styles.pricesTitle}>Prices people paid</p>
              <ul className={styles.pricesList}>
                {product.recent_prices.map((p, i) => (
                  <li key={`${p.amount}-${p.currency}-${i}`}>
                    {p.amount} {p.currency}
                    {(p.store_name || p.city) && (
                      <span className={styles.priceLocation}>
                        {" "}
                        · {[p.store_name, p.city].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <section className={styles.reviewSection}>
        <h2 className={styles.sectionTitle}>
          {myReview ? "Edit your review" : "Your review"}
        </h2>
        {myReview && (
          <p className={styles.reviewHint}>
            One review per product — updates replace your previous verdict. History of old versions
            is not shown (for now).
          </p>
        )}
        {!user ? (
          <p className={styles.loginPrompt}>
            <Link href="/login" className={styles.link}>
              Log in
            </Link>{" "}
            to add a review.
          </p>
        ) : (
          <form onSubmit={onSubmit} className={styles.reviewForm}>
            <div className={styles.selectRow}>
              <label className={styles.fieldLabel}>
                Rating
                <select
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                  className={styles.inlineSelect}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldLabel}>
                Verdict
                <select
                  value={form.verdict}
                  onChange={(e) => setForm({ ...form, verdict: e.target.value })}
                  className={styles.inlineSelect}
                >
                  <option value="buy_again">Buy again</option>
                  <option value="never_again">Never again</option>
                  <option value="neutral">Neutral</option>
                </select>
              </label>
              <label className={styles.fieldLabel}>
                Visibility
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  className={styles.inlineSelect}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>
            </div>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="How did it taste? Would you buy it again?"
              rows={4}
              required
              minLength={3}
              className={styles.reviewTextarea}
            />
            <div className={styles.locationGrid}>
              <input
                value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                placeholder="Store"
                className={styles.locationInput}
              />
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                className={styles.locationInput}
              />
            </div>
            <div className={styles.priceRow}>
              <input
                value={form.price_paid}
                onChange={(e) => setForm({ ...form, price_paid: e.target.value })}
                placeholder="Price paid"
                inputMode="decimal"
                className={styles.priceInput}
              />
              <select
                value={form.price_currency}
                onChange={(e) => setForm({ ...form, price_currency: e.target.value })}
                className={styles.currencySelect}
              >
                <option value="UAH">UAH</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="KZT">KZT</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <p className={styles.priceHint}>
              Price is what you paid (optional). Better than one global price for every country.
            </p>
            <div>
              <label className={styles.fileLabel}>
                Review photos (cropped before upload)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className={styles.fileInput}
                  onChange={(e) => onPickReviewPhotos(e.target.files)}
                />
              </label>
              {pendingFiles.length > 0 && (
                <p className={styles.photoReady}>{pendingFiles.length} photo(s) ready</p>
              )}
              {myReview?.images?.length ? (
                <div className={styles.reviewImages}>
                  {myReview.images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() =>
                        setLightbox({
                          images: myReview.images.map((i) => i.image),
                          index: idx,
                        })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.image} alt="" className={styles.reviewImage} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {error && <p className={styles.formError}>{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className={styles.submitButton}
            >
              {saving && <Spinner size="sm" onDark />}
              {saving ? "Saving…" : myReview ? "Update review" : "Save review"}
            </button>
          </form>
        )}
      </section>

      <section className={styles.publicReviews}>
        <h2 className={styles.sectionTitle}>Reviews</h2>
        {reviews.length === 0 ? (
          <p className={styles.noReviews}>No public reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              onOpenImage={(images, index) => setLightbox({ images, index })}
            />
          ))
        )}
      </section>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox({ ...lightbox, index })}
        />
      )}

      {cropFile && cropTarget && (
        <ImageCropModal
          file={cropFile}
          onCancel={() => {
            setCropFile(null);
            setCropTarget(null);
          }}
          onConfirm={(blob) => {
            if (cropTarget === "product") {
              uploadProductBlob(blob);
              return;
            }
            const file = new File([blob], "review.jpg", { type: blob.type || "image/jpeg" });
            setPendingFiles((prev) => [...prev, file]);
            setCropFile(null);
            setCropTarget(null);
          }}
        />
      )}
    </div>
  );
}
