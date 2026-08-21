import type { Review } from "@/lib/types";

const labels = {
  buy_again: "Buy again",
  never_again: "Never again",
  neutral: "Neutral",
} as const;

const styles = {
  buy_again: "bg-verdict-buy/15 text-verdict-buy ring-verdict-buy/30",
  never_again: "bg-verdict-never/15 text-verdict-never ring-verdict-never/30",
  neutral: "bg-verdict-neutral/15 text-verdict-neutral ring-verdict-neutral/30",
} as const;

export function VerdictBadge({ verdict }: { verdict: Review["verdict"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[verdict]}`}
    >
      {labels[verdict]}
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="font-display tracking-widest text-scan-600" aria-label={`${rating} of 5`}>
      {"★".repeat(rating)}
      <span className="text-ink-100">{"★".repeat(5 - rating)}</span>
    </span>
  );
}
