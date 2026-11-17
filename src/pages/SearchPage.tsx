import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { useByAdditives, useByCategory, useProductList, useSearch } from "../api/queries";
import { isApiError, type HttpResponse, type ListingProduct, type SearchFilter } from "../api";
import { ProductImage } from "../components/ProductImage";
import { Pagination, useDebounced } from "../components/common";
import { EmptyState, ErrorPanel, SkeletonGrid, usePageTitle } from "../components/states";

export const PAGE_SIZE = 12;
type Mode = "search" | "browse" | "category" | "additives";
const MODES: { id: Mode; label: string; endpoint: string }[] = [
  { id: "search", label: "Search", endpoint: "POST /product/search" },
  { id: "browse", label: "Browse all", endpoint: "GET /product" },
  { id: "category", label: "By category", endpoint: "POST /product/category" },
  { id: "additives", label: "By additive", endpoint: "POST /product/additives" },
];

const list = (value: string): string[] =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function SearchPage() {
  usePageTitle("Browse & search");
  const [params, setParams] = useSearchParams();
  const mode = (MODES.some((m) => m.id === params.get("mode")) ? params.get("mode") : "search") as Mode;
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: false });
  };

  return (
    <section className="card">
      <h1>Browse &amp; search</h1>
      <div className="tabs wrap" role="tablist" aria-label="How to find products">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => {
              update({ mode: m.id === "search" ? null : m.id, page: null });
            }}
            title={m.endpoint}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === "search" && <SearchMode params={params} update={update} />}
      {mode === "browse" && <BrowseMode params={params} update={update} />}
      {mode === "category" && <TagMode kind="category" params={params} update={update} />}
      {mode === "additives" && <TagMode kind="additives" params={params} update={update} />}
    </section>
  );
}

interface ModeProps {
  params: URLSearchParams;
  update: (patch: Record<string, string | null>) => void;
}

function SearchMode({ params, update }: ModeProps) {
  const committedQuery = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const country = params.get("country") ?? "";
  const category = params.get("category") ?? "";
  const additive = params.get("additive") ?? "";
  const [input, setInput] = useState(committedQuery);
  const debounced = useDebounced(input.trim(), 350);

  // the debounced text drives the query; the URL follows it
  const latest = useRef({ update, committedQuery });
  useEffect(() => {
    latest.current = { update, committedQuery };
  });
  useEffect(() => {
    if (debounced !== latest.current.committedQuery)
      latest.current.update({ q: debounced || null, page: null });
  }, [debounced]);

  const filters = useMemo<SearchFilter[]>(() => {
    const out: SearchFilter[] = [];
    if (country) out.push({ name: "countries", value: list(country) });
    if (category) out.push({ name: "categories", value: list(category) });
    if (additive) out.push({ name: "additives_tags", value: list(additive) });
    return out;
  }, [country, category, additive]);

  const q = useSearch({ query: committedQuery, filters, page: page - 1, page_size: PAGE_SIZE });
  const total = Number(q.data?.data.totalSearchResultsCount ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const results = q.data?.data.results ?? [];

  return (
    <>
      <form
        className="search-form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: input.trim() || null, page: null });
        }}
      >
        <label className="grow">
          Product name
          <input
            type="search"
            aria-label="Search products"
            placeholder="e.g. ketchup (empty = all products)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
          />
        </label>
        <label>
          Country
          <input
            value={country}
            placeholder="e.g. France"
            onChange={(e) => {
              update({ country: e.target.value, page: null });
            }}
          />
        </label>
        <label>
          Category
          <input
            value={category}
            placeholder="e.g. Snacks"
            onChange={(e) => {
              update({ category: e.target.value, page: null });
            }}
          />
        </label>
        <label>
          Additive
          <input
            value={additive}
            placeholder="e.g. en:e330"
            onChange={(e) => {
              update({ additive: e.target.value, page: null });
            }}
          />
        </label>
      </form>
      <p className="muted small">
        Matches whole words in the name (English stemming). Filters match the stored values exactly; separate
        several with commas. Results are sorted by name (the API has no other sort order).
      </p>
      <Results
        q={q}
        products={results}
        total={total}
        page={page}
        pages={pages}
        onPage={(p) => {
          update({ page: String(p) });
        }}
        emptyHint={
          <>
            {committedQuery && committedQuery.length < 3 && (
              <p>
                Very short or very common words (like “a” or “the”) are ignored by the search. Try a longer
                word.
              </p>
            )}
            {filters.length > 0 && (
              <p>Filters must match the stored value exactly (for example “France”, “Snacks”, “en:e330”).</p>
            )}
            <p>
              Or <Link to="/search?mode=browse">browse all products</Link>.
            </p>
          </>
        }
      />
    </>
  );
}

function BrowseMode({ params, update }: ModeProps) {
  const page = Math.max(1, Number(params.get("page")) || 1);
  const q = useProductList(page, PAGE_SIZE);
  const info = q.data?.data.pageInfo;
  return (
    <Results
      q={q}
      products={q.data?.data.data ?? []}
      total={info?.total ?? 0}
      page={page}
      pages={info?.pages ?? 1}
      onPage={(p) => {
        update({ page: String(p) });
      }}
      emptyHint={<p>The listing is empty.</p>}
    />
  );
}

function TagMode({ kind, params, update }: ModeProps & { kind: "category" | "additives" }) {
  const key = kind === "category" ? "categories" : "additives";
  const value = params.get(key) ?? "";
  const [input, setInput] = useState(value);
  const tags = useMemo(() => list(value), [value]);
  const byCategory = useByCategory(kind === "category" ? tags : []);
  const byAdditives = useByAdditives(kind === "additives" ? tags : []);
  const q = kind === "category" ? byCategory : byAdditives;
  const products = q.data?.data.data ?? [];
  return (
    <>
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          update({ [key]: input.trim() || null });
        }}
      >
        <label className="grow">
          {kind === "category"
            ? "Categories (comma-separated, exact names)"
            : "Additive tags (comma-separated)"}
          <input
            value={input}
            placeholder={kind === "category" ? "e.g. Snacks, Breakfasts" : "e.g. en:e330, en:e322"}
            onChange={(e) => {
              setInput(e.target.value);
            }}
          />
        </label>
        <button type="submit" className="primary">
          Find
        </button>
      </form>
      <p className="muted small">
        Up to 100 products that have any of these {kind === "category" ? "categories" : "additives"}.
      </p>
      {tags.length === 0 ? (
        <EmptyState title="Enter at least one value" testId="search-prompt" />
      ) : (
        <Results
          q={q}
          products={products}
          total={products.length}
          page={1}
          pages={1}
          onPage={() => undefined}
          emptyHint={<p>No product has {tags.join(", ")}. Values must match exactly.</p>}
        />
      )}
    </>
  );
}

function Results({
  q,
  products,
  total,
  page,
  pages,
  onPage,
  emptyHint,
}: {
  q: UseQueryResult<HttpResponse<unknown>>;
  products: ListingProduct[];
  total: number;
  page: number;
  pages: number;
  onPage: (page: number) => void;
  emptyHint: ReactNode;
}) {
  if (q.isPending) return <SkeletonGrid />;
  // the browse/category endpoints answer 404 for "nothing here"
  const notFound = q.isError && isApiError(q.error) && q.error.status === 404;
  if (q.isError && !notFound) {
    return (
      <ErrorPanel
        error={q.error}
        title="Could not load products"
        onRetry={() => {
          void q.refetch();
        }}
        testId="search-error"
      />
    );
  }
  if (products.length === 0 || notFound) {
    if (total > 0 && page > pages) {
      return (
        <EmptyState title="This page is past the end" testId="search-past-end">
          <p>There are {pages} pages of results.</p>
          <button
            type="button"
            onClick={() => {
              onPage(pages);
            }}
          >
            Go to page {pages}
          </button>
        </EmptyState>
      );
    }
    return (
      <EmptyState title="No products found" testId="search-empty">
        {emptyHint}
      </EmptyState>
    );
  }
  return (
    <div aria-busy={q.isFetching}>
      <p className="muted" data-testid="search-summary">
        {total} product{total === 1 ? "" : "s"}
        {pages > 1 && (
          <>
            {" "}
            · page <span data-testid="search-page">{page}</span> of{" "}
            <span data-testid="search-pages">{pages}</span>
          </>
        )}
      </p>
      <ul className="grid" data-testid="search-results">
        {products.map((p) => (
          <li key={p.code} className="result" data-testid="search-result" data-code={p.code}>
            <Link to={`/product/${encodeURIComponent(p.code)}`}>
              <div className="thumb">
                <ProductImage
                  src={p.image_thumb_url ?? p.image_url}
                  alt=""
                  size="thumb"
                  testId="result-thumb"
                />
              </div>
              <span className="result-name" data-testid="result-name">
                {p.product_name}
              </span>
              <code className="muted small">{p.code}</code>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={page} pages={pages} onPage={onPage} />
    </div>
  );
}
