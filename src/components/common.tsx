import { useEffect, useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  testId,
}: {
  text: string;
  label?: string;
  testId?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => {
            setState("copied");
          },
          () => {
            setState("failed");
          },
        );
        window.setTimeout(() => {
          setState("idle");
        }, 2000);
      }}
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}

export function JsonView({
  value,
  testId = "json-view",
  maxHeight = 420,
}: {
  value: unknown;
  testId?: string;
  maxHeight?: number;
}) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="json" style={{ maxHeight }} data-testid={testId} tabIndex={0}>
      {text}
    </pre>
  );
}

export function Pagination({
  page,
  pages,
  onPage,
  label = "Pages",
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  label?: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label={label}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => {
          onPage(1);
        }}
        aria-label="First page"
      >
        «
      </button>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => {
          onPage(page - 1);
        }}
      >
        ← Previous
      </button>
      <span data-testid="pager-status">
        Page <span data-testid="pager-page">{page}</span> of <span data-testid="pager-pages">{pages}</span>
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => {
          onPage(page + 1);
        }}
      >
        Next →
      </button>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => {
          onPage(pages);
        }}
        aria-label="Last page"
      >
        »
      </button>
    </nav>
  );
}

export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(value);
    }, ms);
    return () => {
      window.clearTimeout(t);
    };
  }, [value, ms]);
  return debounced;
}
