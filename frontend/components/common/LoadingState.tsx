export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="sg-status is-inline" role="status">
      <span className="sg-lamp-blink" aria-hidden />
      <p>{label}…</p>
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="sg-skeleton" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="sg-status is-inline">
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="sg-btn">
          Try again
        </button>
      ) : null}
    </div>
  );
}
