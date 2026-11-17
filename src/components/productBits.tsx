import type { Nutriments, Product, VerdictResult } from "../api/types";
import { formatNumber } from "../lib/format";

const SOURCE_LABELS: Record<string, string> = {
  openfoodfacts: "Open Food Facts",
  usda: "USDA FoodData Central",
  cms: "Added in the CMS",
};

export function sourceLabel(product: Pick<Product, "data_source" | "source_info">): string {
  const source = product.data_source ?? "";
  if (source === "ai") {
    const info = product.source_info ?? {};
    const vendor = (info.provider ?? info.vendor ?? info.model ?? "").toLowerCase();
    if (vendor.includes("claude") || vendor.includes("anthropic")) return "AI fallback (Claude)";
    return "AI fallback (OpenAI)";
  }
  return SOURCE_LABELS[source] ?? (source || "Unknown source");
}

/**
 * Where the data came from, and whether this answer was served from the
 * database (stored before this lookup) or fetched just now.
 */
export function SourceBadges({ product, fetchedAt }: { product: Product; fetchedAt?: number }) {
  const created = Date.parse(product.createdAt ?? product.created_at ?? "");
  const fromDb = fetchedAt !== undefined && Number.isFinite(created) ? fetchedAt - created > 60_000 : null;
  const aiUnverified =
    product.data_source === "ai" && !product.source_info?.verified_at && !product.verified_at;
  return (
    <p className="badges">
      <span
        className={`badge source-${product.data_source ?? "unknown"}`}
        data-testid="product-source"
        data-source={product.data_source ?? ""}
      >
        Source: {sourceLabel(product)}
      </span>
      {fromDb !== null && (
        <span
          className="badge badge-neutral"
          data-testid="product-served-from"
          data-served={fromDb ? "db" : "fresh"}
        >
          {fromDb ? "Served from our database" : "Fetched just now"}
        </span>
      )}
      {aiUnverified && <span className="badge badge-warn">AI data, not yet verified by an admin</span>}
    </p>
  );
}

export const NUTRIENTS: [key: string, label: string, unit: string, indent?: boolean][] = [
  ["energy-kcal", "Energy", "kcal"],
  ["fat", "Fat", "g"],
  ["saturated-fat", "of which saturates", "g", true],
  ["carbohydrates", "Carbohydrates", "g"],
  ["sugars", "of which sugars", "g", true],
  ["fiber", "Fibre", "g"],
  ["proteins", "Protein", "g"],
  ["salt", "Salt", "g"],
  ["sodium", "Sodium", "g"],
];

export function NutritionTable({ nutriments, per }: { nutriments: Nutriments; per: string }) {
  const rows = NUTRIENTS.map(([key, label, unit, indent]) => ({
    key,
    label,
    unit,
    indent,
    value: formatNumber(nutriments[`${key}_100g`]),
  }));
  if (!rows.some((r) => r.value !== null)) {
    return (
      <p className="muted" data-testid="nutrition-missing">
        No nutrition data for this product.
      </p>
    );
  }
  return (
    <table className="nutrition" data-testid="nutrition-table">
      <caption className="sr-only">Nutrition {per}</caption>
      <thead>
        <tr>
          <th scope="col">Nutrient</th>
          <th scope="col">{per}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} data-nutrient={r.key}>
            <th scope="row" className={r.indent ? "indent" : undefined}>
              {r.label}
            </th>
            <td data-testid={`nutrient-${r.key}`} data-value={r.value ?? ""}>
              {r.value === null ? <span aria-label="not available">—</span> : `${r.value} ${r.unit}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** "recommended" | "not_recommended" | "insufficient_data" | null from any verdict shape. */
export function verdictValue(value: unknown): string | null {
  if (value === true) return "recommended";
  if (value === false) return "not_recommended";
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const v = (value as { verdict?: unknown }).verdict;
    if (typeof v === "string") return v;
  }
  return null;
}

export function verdictText(value: unknown): string {
  switch (verdictValue(value)) {
    case "recommended":
      return "Recommended for your profile.";
    case "not_recommended":
      return "Not recommended for your profile.";
    case "insufficient_data":
      return "Not enough data to judge this product for your profile.";
    default:
      return "No verdict.";
  }
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const r = item as Record<string, unknown>;
        const label = r.message ?? r.text ?? r.label ?? r.check ?? r.name;
        return typeof label === "string" ? label : null;
      }
      return null;
    })
    .filter((s): s is string => Boolean(s));
}

/** The verdict and, when the API gives them, its reasons and the data it missed. */
export function VerdictDetails({ value, testId }: { value: unknown; testId: string }) {
  const result = value && typeof value === "object" ? (value as VerdictResult) : null;
  const report =
    result?.report && typeof result.report === "object" ? (result.report as Record<string, unknown>) : null;
  const good = textList(report?.goodPoints);
  const bad = textList(report?.badPoints);
  const missing = result?.missing_data ?? [];
  return (
    <div>
      <p data-testid={testId} data-verdict={verdictValue(value) ?? ""}>
        {verdictText(value)}
      </p>
      {bad.length > 0 && (
        <ul className="verdict-points bad" aria-label="Concerns">
          {bad.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {good.length > 0 && (
        <ul className="verdict-points good" aria-label="Good points">
          {good.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {missing.length > 0 && <p className="muted small">Missing data: {missing.join(", ")}.</p>}
    </div>
  );
}
