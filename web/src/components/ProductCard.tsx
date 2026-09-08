import Link from "@/components/LoadingProvider";
import type { Product } from "@/lib/types";
import { Stars } from "./Verdict";
import styles from "./ProductCard.module.css";

export function ProductCard({
  product,
  layout = "list",
}: {
  product: Product;
  layout?: "list" | "grid";
}) {
  const avg = Number(product.stats?.avg_rating || 0);

  if (layout === "grid") {
    return (
      <Link
        href={`/products/${product.id}`}
        className={styles.gridCard}
      >
        <div className={styles.gridImageWrap}>
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt="" className={styles.gridImage} />
          ) : (
            <span className={styles.noPhoto}>No photo</span>
          )}
        </div>
        <div className={styles.gridContent}>
          <h3 className={styles.gridTitle}>
            {product.name}
          </h3>
          <p className={styles.gridMeta}>
            {[product.brand, product.category].filter(Boolean).join(" · ") || "—"}
          </p>
          {product.description && (
            <p className={styles.gridDescription}>{product.description}</p>
          )}
          <div className={styles.gridStats}>
            {product.stats && product.stats.review_count > 0 ? (
              <div className={styles.statsRow}>
                <Stars rating={Math.round(avg)} />
                <span className={styles.ratingText}>{avg.toFixed(1)}</span>
                {product.stats.never_again_pct > 0 && (
                  <span className={styles.neverShort}>{product.stats.never_again_pct}% never</span>
                )}
              </div>
            ) : (
              <span className={styles.emptyStats}>No reviews yet</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className={styles.listCard}
    >
      <div className={styles.listImageWrap}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className={styles.listImage} />
        ) : (
          <div className={styles.listNoPhoto}>No photo</div>
        )}
      </div>
      <div className={styles.listContent}>
        <h3 className={styles.listTitle}>
          {product.name}
        </h3>
        <p className={styles.listMeta}>
          {[product.brand, product.category].filter(Boolean).join(" · ") || "Unknown brand"}
        </p>
        {product.description && (
          <p className={styles.listDescription}>{product.description}</p>
        )}
        <div className={styles.listStats}>
          {product.stats && product.stats.review_count > 0 ? (
            <>
              <Stars rating={Math.round(avg)} />
              <span className={styles.ratingText}>{avg.toFixed(1)}</span>
              <span className={styles.reviewCount}>{product.stats.review_count} reviews</span>
              {product.stats.never_again_pct > 0 && (
                <span className={styles.neverText}>{product.stats.never_again_pct}% never again</span>
              )}
            </>
          ) : (
            <span className={styles.emptyStats}>No reviews yet</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardGrid({ products }: { products: Product[] }) {
  return (
    <div className={styles.productGrid}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} layout="grid" />
      ))}
    </div>
  );
}
