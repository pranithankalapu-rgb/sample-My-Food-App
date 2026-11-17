import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { navigate } from "../App.jsx";

export const PAGE_SIZE = 12;

export default function SearchScreen({ token, params }) {
  const query = params.get("q") || "";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const [input, setInput] = useState(query);
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    api.search(token, { query, page: page - 1, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        if (!res || !Array.isArray(res.results)) throw new Error("The API answered without a results list.");
        const total = Number(res.totalSearchResultsCount) || 0;
        setState({ status: "ok", results: res.results, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
      })
      .catch((err) => !cancelled && setState({ status: "error", message: err.message, httpStatus: err.status }));
    return () => { cancelled = true; };
  }, [token, query, page]);

  const go = (q, p) => navigate(`/search?q=${encodeURIComponent(q)}&page=${p}`);

  return (
    <section className="card">
      <h1>Browse &amp; search</h1>
      <form className="search-bar" onSubmit={(e) => { e.preventDefault(); go(input.trim(), 1); }} role="search">
        <input aria-label="Search products" placeholder="Search by product name (empty = browse all)"
          value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="primary">Search</button>
      </form>

      {state.status === "loading" && <p role="status" className="loading" data-testid="search-loading">Loading products…</p>}
      {state.status === "error" && (
        <p className="error" role="alert" data-testid="search-error">
          {state.httpStatus ? `HTTP ${state.httpStatus}: ` : ""}{state.message}
        </p>
      )}
      {state.status === "ok" && state.results.length === 0 && (
        <p data-testid="search-empty">No products match “{query}”.</p>
      )}
      {state.status === "ok" && state.results.length > 0 && (
        <>
          <p className="muted" data-testid="search-summary">
            {state.total} product{state.total === 1 ? "" : "s"} · page <span data-testid="search-page">{page}</span> of{" "}
            <span data-testid="search-pages">{state.pages}</span>
          </p>
          <ul className="grid" data-testid="search-results">
            {state.results.map((p) => <ResultCard key={p.code} product={p} />)}
          </ul>
          <nav className="pager" aria-label="Pages">
            <button type="button" disabled={page <= 1} onClick={() => go(query, page - 1)}>← Previous</button>
            <span>Page {page} of {state.pages}</span>
            <button type="button" disabled={page >= state.pages} onClick={() => go(query, page + 1)}>Next →</button>
          </nav>
        </>
      )}
    </section>
  );
}

function ResultCard({ product }) {
  const thumb = product.image_thumb_url || product.image_url;
  const [img, setImg] = useState(thumb ? "loading" : "none");
  return (
    <li className="result" data-testid="search-result" data-code={product.code}>
      <a href={`#/product/${encodeURIComponent(product.code)}`}>
        <div className="thumb">
          {thumb && img !== "error" && (
            <img data-testid="result-thumb" src={thumb} alt="" loading="lazy"
              onLoad={() => setImg("loaded")} onError={() => setImg("error")} />
          )}
          {img === "none" && <span className="muted">No image</span>}
          {img === "error" && <span className="error" data-testid="result-thumb-error">Image failed</span>}
        </div>
        <span className="result-name" data-testid="result-name">{product.product_name}</span>
        <code className="muted">{product.code}</code>
      </a>
    </li>
  );
}
