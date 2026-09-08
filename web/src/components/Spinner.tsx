import styles from "./Spinner.module.css";

type SpinnerSize = "sm" | "md";

export function Spinner({
  size = "md",
  onDark = false,
  className = "",
}: {
  size?: SpinnerSize;
  onDark?: boolean;
  className?: string;
}) {
  const sizeClass = size === "sm" ? styles.loaderSmall : "";
  const toneClass = onDark ? styles.loaderOnDark : "";
  return (
    <span
      className={`${styles.loader} ${sizeClass} ${toneClass} ${className}`.trim()}
      aria-hidden
    />
  );
}

export function LoadingLabel({ className = "" }: { className?: string }) {
  return (
    <div className={`${styles.loadingLabel} ${className}`.trim()} role="status">
      <Spinner size="sm" />
      <span>Loading...</span>
    </div>
  );
}
