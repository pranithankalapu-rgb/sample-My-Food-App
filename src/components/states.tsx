import { useEffect, type ReactNode } from "react";
import { isApiError } from "../api/errors";

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · My Food App tester`;
  }, [title]);
}

export function Skeleton({
  lines = 3,
  label = "Loading…",
  testId,
}: {
  lines?: number;
  label?: string;
  testId?: string;
}) {
  return (
    <div className="skeleton" role="status" aria-live="polite" data-testid={testId ?? "skeleton"}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ width: `${90 - ((i * 17) % 40)}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid" role="status" aria-label="Loading products" data-testid="skeleton-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <div className="skeleton-thumb" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

/** Friendly error with an optional retry; never shows stack traces. */
export function ErrorPanel({
  error,
  title = "Something went wrong",
  onRetry,
  testId = "error-panel",
  children,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  testId?: string;
  children?: ReactNode;
}) {
  const message = isApiError(error)
    ? error.message
    : error instanceof Error
      ? "An unexpected error occurred in the app."
      : typeof error === "string"
        ? error
        : "Unknown error";
  const status = isApiError(error) && error.status ? `HTTP ${error.status}` : null;
  return (
    <div className="panel panel-error" role="alert" data-testid={testId}>
      <h2 className="panel-title">{title}</h2>
      <p>
        {status && <span className="badge badge-error">{status}</span>}
        <span data-testid={`${testId}-message`}>{message}</span>
      </p>
      {children}
      {onRetry && (
        <button type="button" className="primary" onClick={onRetry} data-testid={`${testId}-retry`}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  testId = "empty-state",
}: {
  title: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="panel panel-empty" data-testid={testId}>
      <h2 className="panel-title">{title}</h2>
      {children}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <span className="spinner" role="status" aria-label={label} />;
}
