import React, { useCallback, useEffect, useState } from "react";
import { api, validateBarcode } from "../api.js";

// per-100 g/ml values from Open Food Facts style nutriments (grams unless noted)
const NUTRIENTS = [
  ["energy-kcal", "Energy", "kcal"],
  ["fat", "Fat", "g"],
  ["saturated-fat", "  of which saturates", "g"],
  ["carbohydrates", "Carbohydrates", "g"],
  ["sugars", "  of which sugars", "g"],
  ["fiber", "Fibre", "g"],
  ["proteins", "Protein", "g"],
  ["salt", "Salt", "g"],
  ["sodium", "Sodium", "g"],
];

export function formatNumber(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) return null;
  return String(Math.round(n * 100) / 100);
}

export function sourceLabel(product) {
  const source = product.data_source;
  const info = product.source_info || {};
  if (source === "openfoodfacts") return "Open Food Facts";
  if (source === "usda") return "USDA FoodData Central";
  if (source === "ai") {
    const vendor = String(info.provider || info.vendor || info.model || "").toLowerCase();
    if (vendor.includes("openai") || vendor.includes("gpt")) return "AI fallback (OpenAI)";
    if (vendor.includes("claude") || vendor.includes("anthropic")) return "AI fallback (Claude)";
    return "AI fallback";
  }
  if (source === "cms") return "Added in the CMS";
  return source ? String(source) : "Unknown";
}

export default function ProductScreen({ token, code }) {
  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const invalid = validateBarcode(code);

  useEffect(() => {
    if (invalid) return undefined;
    const ctrl = new AbortController();
    setState({ status: "loading" });
    api.product(token, code, ctrl.signal)
      .then((res) => {
        if (!res?.product) throw Object.assign(new Error("The API answered without a product."), { status: 200 });
        setState({ status: "ok", product: res.product });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (err.status === 404 && err.body?.lookup_pending) setState({ status: "pending", message: err.message });
        else if (err.status === 404) setState({ status: "notfound", message: err.message });
        else setState({ status: "error", message: err.message, httpStatus: err.status });
      });
    return () => ctrl.abort();
  }, [token, code, attempt, invalid]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (invalid) {
    return <Panel><p className="error" role="alert" data-testid="barcode-error">{invalid}</p><Back /></Panel>;
  }
  if (state.status === "loading") {
    return (
      <Panel>
        <p role="status" data-testid="product-loading" className="loading">
          Looking up <code>{code}</code>… (unknown barcodes are checked with Open Food Facts and the AI fallback, which can take a few seconds)
        </p>
      </Panel>
    );
  }
  if (state.status === "notfound") {
    return (
      <Panel>
        <h1>Product not found</h1>
        <p data-testid="product-not-found" role="alert">
          No product with barcode <code>{code}</code> was found in our database, on Open Food Facts or by the AI fallback.
        </p>
        <p className="muted">API message: {state.message}</p>
        <Back />
      </Panel>
    );
  }
  if (state.status === "pending") {
    return (
      <Panel>
        <h1>Still looking</h1>
        <p data-testid="product-pending" role="status">
          The fallback lookup for <code>{code}</code> is still running. Try again in a minute.
        </p>
        <p className="muted">API message: {state.message}</p>
        <div className="actions"><button type="button" className="primary" onClick={retry}>Try again</button><Back /></div>
      </Panel>
    );
  }
  if (state.status === "error") {
    return (
      <Panel>
        <h1>Lookup failed</h1>
        <p className="error" role="alert" data-testid="product-error">
          {state.httpStatus ? `HTTP ${state.httpStatus}: ` : ""}{state.message}
        </p>
        <div className="actions"><button type="button" className="primary" onClick={retry}>Try again</button><Back /></div>
      </Panel>
    );
  }
  return <ProductDetail product={state.product} />;
}

function ProductDetail({ product }) {
  const [imageState, setImageState] = useState(product.image_url ? "loading" : "none");
  const nutriments = product.nutriments || {};
  const rows = NUTRIENTS.map(([key, label, unit]) => [key, label, unit, formatNumber(nutriments[`${key}_100g`])]);
  const hasNutrition = rows.some((r) => r[3] !== null);
  const aiUnverified = product.data_source === "ai" && product.source_info?.ai_nutrition && !product.source_info?.verified_at;
  const per = product.nutrition_data_per === "serving" ? "per serving" : "per 100 g / 100 ml";

  return (
    <article className="card product" data-testid="product-detail" data-code={product.code}>
      <div className="product-head">
        <div>
          <h1 data-testid="product-name">{product.product_name || product.product_name_en || "(no name)"}</h1>
          <p className="brand-line" data-testid="product-brand">{product.brands || "Brand unknown"}</p>
          <p className="muted">Barcode <code data-testid="product-code">{product.code}</code></p>
          <p>
            Data source: <span className="badge" data-testid="product-source" data-source={product.data_source || ""}>{sourceLabel(product)}</span>
            {aiUnverified && <span className="badge warn">AI nutrition, not yet verified</span>}
          </p>
          {product.nutriscore_grade && typeof product.nutriscore_grade === "string" && (
            <p>Nutri-Score: <strong className="upper">{product.nutriscore_grade}</strong></p>
          )}
        </div>
      </div>

      <section className="image-block">
        <h2>Front image</h2>
        {imageState === "none" && <p className="muted" data-testid="product-image-missing">No image for this product.</p>}
        {product.image_url && (
          <>
            {imageState === "error" && (
              <p className="error" role="alert" data-testid="product-image-error">The product image could not be loaded.</p>
            )}
            <a href={product.image_url} target="_blank" rel="noopener noreferrer" title="Open the full-size image">
              <img
                data-testid="product-image"
                className="full-image"
                src={product.image_url}
                alt={`Front of ${product.product_name || "the product"}`}
                onLoad={() => setImageState("loaded")}
                onError={() => setImageState("error")}
                style={imageState === "error" ? { display: "none" } : undefined}
              />
            </a>
            {product.image_width && product.image_height && (
              <p className="muted">{product.image_width} × {product.image_height} px · full size</p>
            )}
          </>
        )}
      </section>

      <section>
        <h2>Nutrition <span className="muted">({per})</span></h2>
        {hasNutrition ? (
          <table className="nutrition" data-testid="nutrition-table">
            <tbody>
              {rows.map(([key, label, unit, value]) => (
                <tr key={key} data-nutrient={key}>
                  <th scope="row">{label.trim()}</th>
                  <td data-testid={`nutrient-${key}`} data-value={value ?? ""}>{value === null ? "—" : `${value} ${unit}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" data-testid="nutrition-missing">No nutrition data for this product.</p>
        )}
      </section>

      <section>
        <h2>Ingredients</h2>
        <p data-testid="product-ingredients">{product.ingredients_text || <span className="muted">No ingredient list.</span>}</p>
      </section>

      <section>
        <h2>Countries</h2>
        <p data-testid="product-countries">{product.countries || <span className="muted">Not listed.</span>}</p>
      </section>

      {typeof product.isRecommended !== "undefined" && (
        <section>
          <h2>For you</h2>
          <p data-testid="product-verdict">{verdictText(product.isRecommended)}</p>
        </section>
      )}
      <Back />
    </article>
  );
}

// the API answers "recommended", "not_recommended" or "insufficient_data"
// (older builds: true / false)
const VERDICTS = {
  recommended: "Recommended for your profile.",
  not_recommended: "Not recommended for your profile.",
  insufficient_data: "Not enough data to judge this product for your profile.",
};

function verdictText(value) {
  if (value === true) return VERDICTS.recommended;
  if (value === false) return VERDICTS.not_recommended;
  if (typeof value === "string" && VERDICTS[value]) return VERDICTS[value];
  if (value && typeof value === "object") {
    return value.message || value.verdict || value.status || JSON.stringify(value);
  }
  return String(value);
}

function Panel({ children }) {
  return <section className="card narrow">{children}</section>;
}

function Back() {
  return <a className="button" href="#/lookup">← New lookup</a>;
}
