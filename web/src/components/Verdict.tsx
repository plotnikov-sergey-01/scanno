import type { Review } from "@/lib/types";
import styles from "./Verdict.module.css";

const labels = {
  buy_again: "Buy again",
  never_again: "Never again",
  neutral: "Neutral",
} as const;

const verdictClasses = {
  buy_again: styles.buyAgain,
  never_again: styles.neverAgain,
  neutral: styles.neutral,
} as const;

export function VerdictBadge({ verdict }: { verdict: Review["verdict"] }) {
  return (
    <span
      className={`${styles.badge} ${verdictClasses[verdict]}`}
    >
      {labels[verdict]}
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className={styles.stars} aria-label={`${rating} of 5`}>
      {"★".repeat(rating)}
      <span className={styles.emptyStars}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}
