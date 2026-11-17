// Data quality against live Open Food Facts: 20 random products from the real
// database (name, brand, nutrition, ingredients, image), and their ingredient
// lists (missing, garbled, untranslated). Read-only; admin lookups are not
// counted as scans.
import { beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { realAdmin, type Session } from "./support/clients";
import { env, writeRaw } from "./support/env";
import type { Product } from "../../src/api/types";
import type { AccuracyRow, FieldCheck, IngredientRow } from "../../src/data/results";

recordFile(import.meta.url);
let admin: Session;
const sample: Product[] = [];
const off = new Map<string, OffResult>();

interface OffProduct {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  lang?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  image_front_url?: string;
  nutriments?: Record<string, number | string>;
}

const norm = (s: string | undefined | null): string =>
  (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const firstBrand = (s: string | undefined | null) => norm((s ?? "").split(",")[0]);
const tokens = (s: string) =>
  new Set(
    norm(s)
      .split(" ")
      .filter((t) => t.length > 2),
  );
function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size && !tb.size) return 1;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / Math.max(ta.size, tb.size);
}

type OffResult =
  { state: "found"; product: OffProduct } | { state: "missing" } | { state: "unavailable"; reason: string };

/**
 * The live reference. Rate limits (429) and server errors are retried with
 * backoff; if Open Food Facts still cannot answer, the product is reported as
 * "not checked", never as a mismatch.
 */
async function fetchOff(code: string): Promise<OffResult> {
  const fields =
    "product_name,product_name_en,brands,lang,ingredients_text,ingredients_text_en,image_front_url,nutriments";
  let reason = "";
  for (const wait of [0, 5_000, 15_000, 30_000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`,
        {
          headers: { "User-Agent": "MyFoodApp-sample-frontend-tests/1.0" },
          signal: AbortSignal.timeout(20_000),
        },
      );
      if (res.status === 404) return { state: "missing" };
      if (!res.ok) {
        reason = `HTTP ${res.status}`;
        continue;
      }
      const data = (await res.json()) as { status?: number; product?: OffProduct };
      return data.status === 1 && data.product
        ? { state: "found", product: data.product }
        : { state: "missing" };
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
    }
  }
  return { state: "unavailable", reason };
}

beforeAll(async () => {
  admin = await realAdmin();
  const first = await admin.api.product.list({ page: 1, limit: 100 });
  const codes = first.data.data.map((p) => p.code);
  for (let page = 2; page <= first.data.pageInfo.pages; page += 1)
    codes.push(...(await admin.api.product.list({ page, limit: 100 })).data.data.map((p) => p.code));
  const picked = codes.sort(() => Math.random() - 0.5).slice(0, 20);
  for (const code of picked) {
    sample.push((await admin.api.product.lookup(code)).data.product);
    off.set(code, await fetchOff(code));
    await new Promise((r) => setTimeout(r, 1500)); // well under Open Food Facts' read limit (it rate-limits bursts)
  }
}, 300_000);

const NUTRIENTS = ["energy-kcal_100g", "fat_100g", "sugars_100g", "salt_100g", "proteins_100g"];

describe("accuracy against live Open Food Facts (20 random products)", () => {
  check(
    { endpoint: "product.lookup", category: "accuracy" },
    "name, brand, nutrition, ingredients and image match Open Food Facts",
    async () => {
      const rows: AccuracyRow[] = [];
      for (const p of sample) {
        const ref = off.get(p.code);
        const fields: FieldCheck[] = [];
        if (!ref || ref.state === "unavailable") {
          rows.push({
            code: p.code,
            name: p.product_name,
            ok: true,
            unchecked: `Open Food Facts did not answer (${ref?.state === "unavailable" ? ref.reason : "no reference"})`,
            fields: [],
          });
          continue;
        }
        if (ref.state === "missing") {
          rows.push({
            code: p.code,
            name: p.product_name,
            ok: false,
            fields: [
              {
                field: "product",
                api: "present",
                reference: "not found on Open Food Facts (404)",
                match: false,
              },
            ],
          });
          continue;
        }
        const o = ref.product;
        const offName = o.product_name || o.product_name_en || "";
        const nameMatch =
          norm(p.product_name) === norm(offName) || norm(p.product_name) === norm(o.product_name_en);
        fields.push({ field: "name", api: p.product_name, reference: offName, match: nameMatch });
        fields.push({
          field: "brand",
          api: p.brands,
          reference: o.brands ?? "",
          match: firstBrand(p.brands) === firstBrand(o.brands),
        });
        for (const key of NUTRIENTS) {
          const a = Number(p.nutriments[key]);
          const b = Number(o.nutriments?.[key]);
          if (!Number.isFinite(a) && !Number.isFinite(b)) continue;
          const match =
            Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= Math.max(0.05, Math.abs(b) * 0.02);
          fields.push({
            field: key,
            api: Number.isFinite(a) ? String(a) : "missing",
            reference: Number.isFinite(b) ? String(b) : "missing",
            match,
          });
        }
        // Open Food Facts has up to two lists (English and the product's main
        // language); the stored list is accurate when it is one of them. The
        // backend keeps the main-language list when the "English" one is not
        // English or describes another recipe, so both are compared.
        const candidates = [
          { which: "English list", text: o.ingredients_text_en ?? "" },
          { which: "main-language list", text: o.ingredients_text ?? "" },
        ].filter((c) => c.text.trim() !== "");
        const best = candidates
          .map((c) => ({ ...c, sim: similarity(p.ingredients_text, c.text) }))
          .sort((a, b) => b.sim - a.sim)[0] ?? { which: "no list", text: "", sim: 0 };
        fields.push({
          field: "ingredients",
          api: p.ingredients_text.slice(0, 160),
          reference: best.text.slice(0, 160),
          match: best.sim >= 0.8,
          note: `word overlap ${Math.round(best.sim * 100)}% with Open Food Facts' ${best.which}`,
        });
        let imageOk = false;
        if (p.image_url) {
          const r = await fetch(p.image_url.replace(/^http:\/\/localhost:9595/, env.realApi), {
            signal: AbortSignal.timeout(20_000),
          });
          imageOk = r.ok && (r.headers.get("content-type") ?? "").startsWith("image/");
        }
        fields.push({
          field: "image",
          api: p.image_url ? (imageOk ? "loads" : "broken") : "none",
          reference: o.image_front_url ? "has front image" : "no front image",
          match: imageOk || !o.image_front_url,
        });
        rows.push({ code: p.code, name: p.product_name, ok: fields.every((f) => f.match), fields });
      }
      writeRaw("accuracy.json", rows);
      const bad = rows
        .filter((r) => !r.ok)
        .map(
          (r) =>
            `${r.code} ${r.name}: ${r.fields
              .filter((f) => !f.match)
              .map((f) => `${f.field} (API "${f.api.slice(0, 60)}" vs OFF "${f.reference.slice(0, 60)}")`)
              .join("; ")}`,
        );
      const unchecked = rows.filter((r) => r.unchecked);
      expect(
        unchecked.length,
        `${unchecked.length} of ${rows.length} products could not be checked (Open Food Facts unavailable)`,
      ).toBeLessThanOrEqual(rows.length / 2);
      expect(
        bad,
        `${bad.length} of ${rows.length - unchecked.length} checked products differ from live Open Food Facts`,
      ).toEqual([]);
    },
    300_000,
  );
});

// words that show an ingredient list is in French, Spanish, Italian, German, Portuguese or Arabic script
const FOREIGN =
  /\b(sucre|farine|huile|sel|lait|eau|beurre|oeufs?|œufs?|azúcar|harina|aceite|leche|sal|agua|zucchero|farina|olio|latte|zucker|mehl|wasser|açúcar|óleo|água|ingrédients?|ingredientes|ingredienti|zutaten)\b|[؀-ۿ]/i;
const GARBLED = /Ã.|Â.|â€|�|\\u00/;

const percentages = (text: string): number[] =>
  [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)]
    .map((m) => Number((m[1] ?? "").replace(",", ".")))
    .sort((a, b) => a - b);

// Why a stored list is not English. Each case is still reported as a problem;
// the wording says whether a usable English list exists on Open Food Facts.
function languageIssue(o: OffProduct | undefined): string {
  if (!o) return "not in English (Open Food Facts reference unavailable)";
  const en = o.ingredients_text_en?.trim() ?? "";
  if (!en) return `untranslated (${o.lang ?? "unknown language"}; no English list on Open Food Facts)`;
  if (FOREIGN.test(en)) return "untranslated (Open Food Facts' English field holds another language)";
  const a = percentages(en);
  const b = percentages(o.ingredients_text ?? "");
  if (a.length && b.length && (a.length !== b.length || a.some((v, i) => v !== b[i])))
    return "untranslated (Open Food Facts' English list is a different recipe: percentages differ)";
  return "not in English although Open Food Facts has a usable English list";
}

describe("ingredient lists (same 20 products)", () => {
  check(
    { endpoint: "product.lookup", category: "ingredients" },
    "every ingredient list is present, clean and in English",
    () => {
      const rows: IngredientRow[] = sample.map((p) => {
        const text = p.ingredients_text.trim();
        const ref = off.get(p.code);
        const o = ref?.state === "found" ? ref.product : undefined;
        const issues: string[] = [];
        if (!text) issues.push("missing");
        if (GARBLED.test(text)) issues.push("garbled characters (encoding)");
        if (/<[a-z/][^>]*>/i.test(text)) issues.push("contains HTML");
        if (/_[^_\s]+_/.test(text)) issues.push("contains Open Food Facts markup (_word_)");
        if (/[,;:]\s*$/.test(text)) issues.push("ends with a separator (truncated or untidy)");
        if (text && FOREIGN.test(text)) issues.push(languageIssue(o));
        return { code: p.code, name: p.product_name, ok: issues.length === 0, text, issues };
      });
      writeRaw("ingredients.json", rows);
      const bad = rows.filter((r) => !r.ok).map((r) => `${r.code} ${r.name}: ${r.issues.join(", ")}`);
      expect(bad, `${bad.length} of ${rows.length} ingredient lists have problems`).toEqual([]);
    },
  );
});
