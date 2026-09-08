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
  const sizeClass = size === "sm" ? "scanno-loader-sm" : "";
  const toneClass = onDark ? "scanno-loader-on-dark" : "";
  return (
    <span
      className={`scanno-loader shrink-0 ${sizeClass} ${toneClass} ${className}`.trim()}
      aria-hidden
    />
  );
}

export function LoadingLabel({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-ink-700/70 ${className}`.trim()} role="status">
      <Spinner size="sm" />
      <span>Loading...</span>
    </div>
  );
}
