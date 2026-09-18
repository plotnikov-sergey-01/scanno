"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Camera,
  ChevronDown,
  Globe2,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useLoadingRouter as useRouter } from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ReviewCard } from "@/components/ReviewCard";
import { Stars } from "@/components/Verdict";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ImageCropModal } from "@/components/ImageCropModal";
import { LoadingLabel, Spinner } from "@/components/Spinner";
import { GuestActionPrompt } from "@/components/GuestActionPrompt";
import type { Product, Review } from "@/lib/types";
import styles from "./page.module.css";

const DEFAULT_PRICE_CURRENCY = "UAH";
const RATING_LABELS = ["Not for me", "Could be better", "It's okay", "Really good", "Loved it"];
const VERDICT_OPTIONS = [
  { value: "buy_again", label: "Buy again", icon: ThumbsUp },
  { value: "neutral", label: "Neutral", icon: Minus },
  { value: "never_again", label: "Never again", icon: ThumbsDown },
];

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
  const [editingProduct, setEditingProduct] = useState(false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    brand: "",
    category: "",
    description: "",
  });

  async function reload() {
    setError("");
    const [p, r] = await Promise.all([api.getProduct(id, Boolean(user)), api.productReviews(id)]);
    setProduct(p);
    setProductForm({
      name: p.name || "",
      brand: p.brand || "",
      category: p.category || "",
      description: p.description || "",
    });
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
    setReviewFormOpen(false);
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
      setReviewFormOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  }

  async function onProductSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product) return;
    const name = productForm.name.trim();
    if (name.length < 2) {
      setError("Product name must be at least 2 characters.");
      return;
    }

    setSavingProduct(true);
    setError("");
    try {
      const updated = await api.updateProduct(product.id, {
        name,
        brand: productForm.brand.trim(),
        category: productForm.category.trim(),
        description: productForm.description.trim(),
      });
      setProduct(updated);
      setEditingProduct(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update product");
    } finally {
      setSavingProduct(false);
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
  const reviewCount = stats?.review_count || 0;
  const latestReview = reviews[0];
  const latestReviewPrice =
    latestReview?.price_paid != null && latestReview.price_currency
      ? `${latestReview.price_paid} ${latestReview.price_currency}`
      : "No price yet";
  const latestReviewStore = latestReview?.store_name || latestReview?.city || "No store yet";
  const ingredientsText = product.ingredients_text?.trim();
  const canEditImage = Boolean(product.can_edit_image);
  const canEditProduct = canEditImage;

  return (
    <div className={styles.page}>
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
          <div className={styles.verdictStrip} aria-label="Community verdict summary">
            <span className={styles.buyCount}>{stats?.buy_again_count || 0} buy again</span>
            <span className={styles.neverCount}>
              {stats ? stats.never_again_pct : 0}% never again
            </span>
          </div>
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
        <div className={styles.productInfo}>
          <div className={styles.productHeroTop}>
            <div className={styles.productTitleBlock}>
              <h1 className={styles.title}>{product.name}</h1>
              <p className={styles.productMeta}>
                {[product.brand, product.category].filter(Boolean).join(" · ") || "Product"}
              </p>
              {product.barcode && (
                <p className={styles.barcode}>{product.barcode}</p>
              )}
            </div>
            <div className={styles.ratingCard} aria-label="Average product rating">
              {reviewCount > 0 ? (
                <div className={styles.ratingRow}>
                  <Stars rating={Math.round(avg)} />
                  <span className={styles.average}>{avg.toFixed(1)}</span>
                  <span className={styles.reviewCount}>
                    {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                  </span>
                </div>
              ) : (
                <div className={styles.ratingRow}>
                  <span className={styles.noRatingMark}>New</span>
                  <span className={styles.reviewCount}>No reviews yet</span>
                </div>
              )}
            </div>
          </div>
          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}
          {canEditProduct && (
            <button
              type="button"
              className={styles.editProductButton}
              onClick={() => setEditingProduct((value) => !value)}
            >
              <EditIcon />
              {editingProduct ? "Cancel edit" : "Edit product"}
            </button>
          )}
        </div>
        <div className={styles.infoGrid}>
          <section className={styles.apiInfoBlock}>
            <p className={styles.ingredientsLine}>
              <span className={styles.infoLabel}>Ingredients:</span>{" "}
              <span className={styles.ingredientsText}>
                {ingredientsText || "No ingredient list from Open Food Facts yet."}
              </span>
            </p>
          </section>
          <section className={styles.priceBlock}>
            <div className={styles.priceSummary}>
              <span className={styles.priceMetaLabel}>Price:</span>
              <span className={styles.priceValue}>{latestReviewPrice}</span>
              <span className={styles.priceMetaLabel}>Store:</span>
              <span className={styles.priceValue}>{latestReviewStore}</span>
            </div>
          </section>
        </div>
      </div>

      {canEditProduct && editingProduct && (
        <section className={styles.productEditSection}>
          <h2 className={styles.sectionTitle}>Edit product</h2>
          <form onSubmit={onProductSubmit} className={styles.productEditForm}>
            <input
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              placeholder="Product name"
              className={styles.productEditInput}
              required
            />
            <input
              value={productForm.brand}
              onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
              placeholder="Brand"
              className={styles.productEditInput}
            />
            <input
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              placeholder="Category"
              className={styles.productEditInput}
            />
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              placeholder="Description"
              rows={3}
              className={styles.productEditTextarea}
            />
            <button type="submit" disabled={savingProduct} className={styles.saveProductButton}>
              {savingProduct && <Spinner size="sm" onDark />}
              {savingProduct ? "Saving..." : "Save product"}
            </button>
          </form>
        </section>
      )}

      <section className={styles.publicReviews} id="your-review">
        <div className={styles.reviewsHeader}>
          <div className={styles.reviewsHeading}>
            <h2 className={styles.reviewsTitle}>Reviews</h2>
            <span className={styles.reviewsCount}>{reviews.length} total</span>
          </div>
          {reviewFormOpen ? (
            <button
              type="button"
              className={styles.cancelReviewButton}
              onClick={() => setReviewFormOpen(false)}
            >
              Cancel
            </button>
          ) : !myReview ? (
            <button
              type="button"
              className={styles.writeReviewButton}
              onClick={() => setReviewFormOpen(true)}
            >
              <Plus size={18} aria-hidden="true" />
              Write review
            </button>
          ) : null}
        </div>
        {reviewFormOpen && !user ? (
          <GuestActionPrompt text="Log in or create an account to add a review." />
        ) : null}
        {reviewFormOpen && user ? (
          <form onSubmit={onSubmit} className={styles.reviewForm}>
            <div className={styles.compactReviewTop}>
              <div className={styles.ratingControl}>
                <span className={styles.fieldLabel} id="review-rating-label">Your rating</span>
                <div className={styles.ratingButtons} role="radiogroup" aria-labelledby="review-rating-label">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.ratingButton} ${n <= form.rating ? styles.ratingButtonActive : ""}`}
                      aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
                      aria-checked={n === form.rating}
                      role="radio"
                      onClick={() => setForm({ ...form, rating: n })}
                    >
                      <Star size={26} aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <p className={styles.ratingCaption}>
                  <strong>{form.rating}/5</strong> · {RATING_LABELS[form.rating - 1]}
                </p>
              </div>
              <fieldset className={styles.verdictField}>
                <legend className={styles.fieldLabel}>Would you buy it again?</legend>
                <div className={styles.verdictOptions}>
                  {VERDICT_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.verdictOption} ${form.verdict === value ? styles.verdictOptionActive : ""}`}
                      data-verdict={value}
                      aria-pressed={form.verdict === value}
                      onClick={() => setForm({ ...form, verdict: value })}
                    >
                      <Icon size={17} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className={styles.writingSurface}>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="How did it taste? Would you buy it again?"
                rows={5}
                required
                minLength={3}
                className={styles.reviewTextarea}
                aria-label="Your experience"
              />
              <div className={styles.writingToolbar}>
                <label className={styles.photoButton}>
                  <Camera size={17} aria-hidden="true" />
                  Add photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className={styles.fileInput}
                    onChange={(e) => onPickReviewPhotos(e.target.files)}
                  />
                </label>
                <span className={styles.photoNote}>
                  {pendingFiles.length > 0 ? `${pendingFiles.length} photo(s) ready` : "Optional · up to 5"}
                </span>
              </div>
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
            <details className={styles.purchaseDisclosure}>
              <summary>
                <span>
                  <ShoppingBag size={17} aria-hidden="true" />
                  Add purchase details
                  <small>Optional</small>
                </span>
                <ChevronDown size={17} aria-hidden="true" className={styles.purchaseChevron} />
              </summary>
              <div className={styles.purchaseGrid}>
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
                <div className={styles.priceControl}>
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
                    aria-label="Currency"
                  >
                    <option value="UAH">UAH</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="KZT">KZT</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </details>
            {error && <p className={styles.formError}>{error}</p>}
            <div className={styles.reviewFormFooter}>
              <label className={styles.visibilityControl}>
                {form.visibility === "private" ? (
                  <Lock size={17} aria-hidden="true" />
                ) : (
                  <Globe2 size={17} aria-hidden="true" />
                )}
                <span>
                  <span className={styles.visibilityLabel}>Who can see this?</span>
                  <select
                    value={form.visibility}
                    onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                    className={styles.visibilitySelect}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </span>
              </label>
              <button
                type="submit"
                disabled={saving}
                className={styles.submitButton}
              >
                {saving && <Spinner size="sm" onDark />}
                {saving ? "Saving…" : myReview ? "Update review" : "Save review"}
                {!saving && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </div>
          </form>
        ) : null}
        {reviews.length === 0 && !reviewFormOpen ? (
          <p className={styles.noReviews}>No public reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              onOpenImage={(images, index) => setLightbox({ images, index })}
              onEditReview={
                user?.username === r.user.username
                  ? () => {
                      setReviewFormOpen(true);
                      document.getElementById("your-review")?.scrollIntoView({ behavior: "smooth" });
                    }
                  : undefined
              }
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

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.buttonIcon}>
      <path d="m4 16.5-.8 4.3 4.3-.8L18.6 8.9 15.1 5.4 4 16.5Z" />
      <path d="m13.8 6.7 3.5 3.5" />
    </svg>
  );
}
