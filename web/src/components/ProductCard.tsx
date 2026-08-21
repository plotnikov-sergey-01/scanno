import Link from "next/link";
import type { Product } from "@/lib/types";
import { Stars } from "./Verdict";

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
        className="group flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-white/80 transition hover:border-scan-400 hover:shadow-md"
      >
        <div className="flex h-40 items-center justify-center bg-ink-100 p-3">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-ink-700/50">No photo</span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-2 font-display text-base font-semibold text-ink-900 group-hover:text-scan-600">
            {product.name}
          </h3>
          <p className="mt-1 truncate text-xs text-ink-700/70">
            {[product.brand, product.category].filter(Boolean).join(" · ") || "—"}
          </p>
          {product.description && (
            <p className="mt-2 line-clamp-2 text-xs text-ink-700/70">{product.description}</p>
          )}
          <div className="mt-auto pt-2 text-sm">
            {product.stats && product.stats.review_count > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={Math.round(avg)} />
                <span className="text-ink-700">{avg.toFixed(1)}</span>
                {product.stats.never_again_pct > 0 && (
                  <span className="text-xs text-verdict-never">{product.stats.never_again_pct}% never</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-ink-700/60">No reviews yet</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex gap-4 border-b border-ink-100 py-4 transition hover:bg-white/60"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-700/50">No photo</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-lg font-semibold text-ink-900 group-hover:text-scan-600">
          {product.name}
        </h3>
        <p className="text-sm text-ink-700/80">
          {[product.brand, product.category].filter(Boolean).join(" · ") || "Unknown brand"}
        </p>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-700/70">{product.description}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-sm">
          {product.stats && product.stats.review_count > 0 ? (
            <>
              <Stars rating={Math.round(avg)} />
              <span className="text-ink-700">{avg.toFixed(1)}</span>
              <span className="text-ink-700/60">{product.stats.review_count} reviews</span>
              {product.stats.never_again_pct > 0 && (
                <span className="text-verdict-never">{product.stats.never_again_pct}% never again</span>
              )}
            </>
          ) : (
            <span className="text-ink-700/60">No reviews yet</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} layout="grid" />
      ))}
    </div>
  );
}
