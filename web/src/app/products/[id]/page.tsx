"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ReviewCard } from "@/components/ReviewCard";
import { Stars } from "@/components/Verdict";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ImageCropModal } from "@/components/ImageCropModal";
import type { Product, Review } from "@/lib/types";

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
    price_currency: "RUB",
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
          price_currency: mine.price_currency || "RUB",
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
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        rating: form.rating,
        verdict: form.verdict,
        body: form.body,
        visibility: form.visibility,
        store_name: form.store_name,
        city: form.city,
      };
      if (form.price_paid.trim()) {
        payload.price_paid = form.price_paid.trim();
        payload.price_currency = form.price_currency.trim().toUpperCase() || "RUB";
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
    return <p className="text-ink-700">Loading…</p>;
  }
  if (!product) {
    return <p className="text-verdict-never">{error}</p>;
  }

  const stats = product.stats;
  const avg = Number(stats?.avg_rating || 0);
  const canEditImage = Boolean(product.can_edit_image);

  return (
    <div>
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="shrink-0">
          <button
            type="button"
            className="block h-52 w-52 overflow-hidden rounded-xl bg-ink-100"
            disabled={!product.image_url}
            onClick={() =>
              product.image_url && setLightbox({ images: gallery, index: 0 })
            }
          >
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt="" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center px-3 text-center text-xs text-ink-700/50">
                No product photo
              </div>
            )}
          </button>
          {canEditImage && (
            <label className="mt-2 block cursor-pointer text-sm text-scan-600 hover:underline">
              {uploadingPhoto ? "Uploading…" : product.image_url ? "Replace photo" : "Add product photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(e) => onPickProductPhoto(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 text-ink-700">
            {[product.brand, product.category].filter(Boolean).join(" · ")}
          </p>
          {product.description && (
            <p className="mt-3 max-w-xl text-ink-700/90">{product.description}</p>
          )}
          {product.barcode && (
            <p className="mt-1 font-mono text-sm text-ink-700/60">{product.barcode}</p>
          )}
          {stats && stats.review_count > 0 ? (
            <div className="mt-4 space-y-1">
              <div className="flex items-center gap-3">
                <Stars rating={Math.round(avg)} />
                <span className="font-display text-2xl font-bold">{avg.toFixed(1)}</span>
                <span className="text-ink-700/70">{stats.review_count} reviews</span>
              </div>
              <p className="text-sm">
                <span className="text-verdict-buy">{stats.buy_again_count} buy again</span>
                {" · "}
                <span className="text-verdict-never">
                  {stats.never_again_pct}% never again
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-ink-700/70">Be the first to review this product.</p>
          )}
          {product.recent_prices && product.recent_prices.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-ink-900">Prices people paid</p>
              <ul className="mt-1 space-y-0.5 text-sm text-ink-700/80">
                {product.recent_prices.map((p, i) => (
                  <li key={`${p.amount}-${p.currency}-${i}`}>
                    {p.amount} {p.currency}
                    {(p.store_name || p.city) && (
                      <span className="text-ink-700/50">
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

      <section className="mt-10 border-t border-ink-100 pt-8">
        <h2 className="font-display text-xl font-bold">
          {myReview ? "Edit your review" : "Your review"}
        </h2>
        {myReview && (
          <p className="mt-1 text-sm text-ink-700/70">
            One review per product — updates replace your previous verdict. History of old versions
            is not shown (for now).
          </p>
        )}
        {!user ? (
          <p className="mt-2 text-ink-700">
            <Link href="/login" className="text-scan-600">
              Log in
            </Link>{" "}
            to add a review.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-4">
              <label className="text-sm">
                Rating
                <select
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                  className="ml-2 rounded border border-ink-100 bg-white px-2 py-1"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Verdict
                <select
                  value={form.verdict}
                  onChange={(e) => setForm({ ...form, verdict: e.target.value })}
                  className="ml-2 rounded border border-ink-100 bg-white px-2 py-1"
                >
                  <option value="buy_again">Buy again</option>
                  <option value="never_again">Never again</option>
                  <option value="neutral">Neutral</option>
                </select>
              </label>
              <label className="text-sm">
                Visibility
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  className="ml-2 rounded border border-ink-100 bg-white px-2 py-1"
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
              className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
            />
            <div className="flex gap-2">
              <input
                value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                placeholder="Store"
                className="flex-1 rounded-lg border border-ink-100 px-3 py-2"
              />
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
                className="flex-1 rounded-lg border border-ink-100 px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={form.price_paid}
                onChange={(e) => setForm({ ...form, price_paid: e.target.value })}
                placeholder="Price paid"
                inputMode="decimal"
                className="flex-1 rounded-lg border border-ink-100 px-3 py-2"
              />
              <select
                value={form.price_currency}
                onChange={(e) => setForm({ ...form, price_currency: e.target.value })}
                className="w-28 rounded-lg border border-ink-100 bg-white px-2 py-2"
              >
                <option value="RUB">RUB</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="UAH">UAH</option>
                <option value="KZT">KZT</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <p className="text-xs text-ink-700/60">
              Price is what you paid (optional). Better than one global price for every country.
            </p>
            <div>
              <label className="text-sm text-ink-700">
                Review photos (cropped before upload)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => onPickReviewPhotos(e.target.files)}
                />
              </label>
              {pendingFiles.length > 0 && (
                <p className="mt-1 text-xs text-ink-700/70">{pendingFiles.length} photo(s) ready</p>
              )}
              {myReview?.images?.length ? (
                <div className="mt-2 flex gap-2 overflow-x-auto">
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
                      <img src={img.image} alt="" className="h-20 w-20 rounded-md object-contain bg-ink-100" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {error && <p className="text-sm text-verdict-never">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-scan-500 px-4 py-2 font-semibold text-white hover:bg-scan-600 disabled:opacity-50"
            >
              {saving ? "Saving…" : myReview ? "Update review" : "Save review"}
            </button>
          </form>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-ink-700/70">No public reviews yet.</p>
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
