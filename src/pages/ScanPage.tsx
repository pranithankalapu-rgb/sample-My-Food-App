import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, type AnalyzeResponse, type OcrResponse } from "../api";
import { JsonView } from "../components/common";
import { NutritionTable, VerdictDetails } from "../components/productBits";
import { ErrorPanel, usePageTitle } from "../components/states";
import { formatBytes } from "../lib/format";

const MAX_BYTES = 10 * 1024 * 1024;
type Tab = "ocr" | "analyze";
type ScanOutcome = { kind: "ocr"; data: OcrResponse } | { kind: "analyze"; data: AnalyzeResponse };

/** The OCR service's answer is passed through as `ocrData`; find the text it extracted. */
export function findText(data: unknown, depth = 0): string | null {
  if (data === null || data === undefined || depth > 4) return null;
  if (typeof data === "string") return data.trim() || null;
  if (Array.isArray(data)) {
    const parts = data.map((d) => findText(d, depth + 1)).filter((s): s is string => Boolean(s));
    return parts.length ? parts.join("\n") : null;
  }
  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of [
      "text",
      "extracted_text",
      "ocr_text",
      "raw_text",
      "full_text",
      "ingredients_text",
      "ingredients",
    ]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    for (const value of Object.values(record)) {
      if (value && typeof value === "object") {
        const found = findText(value, depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
}

export function ScanPage() {
  usePageTitle("Label scan");
  const [tab, setTab] = useState<Tab>("ocr");
  return (
    <section className="card">
      <h1>Scan a photo</h1>
      <div className="tabs" role="tablist" aria-label="Scan type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ocr"}
          onClick={() => {
            setTab("ocr");
          }}
        >
          Label text (OCR)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "analyze"}
          onClick={() => {
            setTab("analyze");
          }}
        >
          AI photo analysis
        </button>
      </div>
      {tab === "ocr" ? <Uploader key="ocr" kind="ocr" /> : <Uploader key="analyze" kind="analyze" />}
    </section>
  );
}

function Uploader({ kind }: { kind: Tab }) {
  const [file, setFile] = useState<File | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const accepted =
    kind === "ocr"
      ? ["image/jpeg", "image/png", "image/webp", "image/heic"]
      : ["image/jpeg", "image/png", "image/webp"];

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const m = useMutation({
    mutationFn: async (f: File): Promise<ScanOutcome> => {
      setProgress(0);
      const opts = { onUploadProgress: setProgress };
      return kind === "ocr"
        ? { kind: "ocr", data: (await api.product.scanLabel(f, opts)).data }
        : { kind: "analyze", data: (await api.product.analyzePhoto(f, opts)).data };
    },
  });

  const choose = (f: File | null) => {
    m.reset();
    setLocalError(null);
    if (f && !accepted.includes(f.type)) {
      setLocalError(
        `This file type (${f.type || "unknown"}) is not accepted. Use ${accepted.map((t) => t.split("/")[1]).join(", ")}.`,
      );
      setFile(null);
      return;
    }
    if (f && f.size > MAX_BYTES) {
      setLocalError(`The photo is ${formatBytes(f.size)}; the limit is 10 MB.`);
      setFile(null);
      return;
    }
    setFile(f);
  };

  return (
    <div className="stack">
      <p className="muted">
        {kind === "ocr"
          ? "A photo of an ingredients or nutrition label is sent to the API's OCR endpoint (POST /product/scan). Counts as a scan; refunded if it fails."
          : "A photo of any food is analysed by AI (POST /product/analyze). The verdict is scored by the API. Counts as a scan; refunded if it fails."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!file) {
            setLocalError("Choose a photo first.");
            return;
          }
          m.mutate(file);
        }}
      >
        <label>
          Photo ({accepted.map((t) => t.split("/")[1]?.toUpperCase()).join(", ")}, up to 10 MB)
          <input
            type="file"
            name="photo"
            accept={accepted.join(",")}
            onChange={(e) => {
              choose(e.target.files?.[0] ?? null);
            }}
          />
        </label>
        {file && preview && (
          <figure className="upload-preview">
            <img src={preview} alt="Selected photo" data-testid="scan-preview" />
            <figcaption className="muted small">
              {file.name} · {formatBytes(file.size)}
            </figcaption>
          </figure>
        )}
        {localError && (
          <p className="error" role="alert" data-testid="scan-error">
            {localError}
          </p>
        )}
        {m.isPending && (
          <div data-testid="scan-loading">
            <progress max={1} value={progress} aria-label="Upload progress" />
            <p className="muted" role="status">
              {progress < 1
                ? `Uploading… ${Math.round(progress * 100)}%`
                : kind === "ocr"
                  ? "Reading the label (up to 30 s)…"
                  : "Analysing the photo (up to a minute)…"}
            </p>
          </div>
        )}
        <button type="submit" className="primary" disabled={m.isPending}>
          {m.isPending ? "Working…" : kind === "ocr" ? "Scan label" : "Analyse photo"}
        </button>
      </form>
      {m.isError && (
        <ErrorPanel
          error={m.error}
          title={kind === "ocr" ? "The label could not be read" : "The photo could not be analysed"}
          onRetry={
            file
              ? () => {
                  m.mutate(file);
                }
              : undefined
          }
          testId="scan-failure"
        >
          {kind === "ocr" && (
            <p className="muted small">
              If this keeps happening, the OCR service may be down: see the Status page.
            </p>
          )}
        </ErrorPanel>
      )}
      {m.data?.kind === "ocr" && <OcrResult data={m.data.data} />}
      {m.data?.kind === "analyze" && <AnalyzeResult data={m.data.data} />}
    </div>
  );
}

function OcrResult({ data }: { data: OcrResponse }) {
  const text = findText(data.ocrData);
  return (
    <div data-testid="scan-result">
      <h2>Extracted text</h2>
      {text ? (
        <pre className="ocr-text" data-testid="scan-text">
          {text}
        </pre>
      ) : (
        <p className="error" role="alert" data-testid="scan-no-text">
          The OCR service answered, but returned no text.
        </p>
      )}
      <details>
        <summary>Full OCR response</summary>
        <JsonView value={data.ocrData} testId="scan-raw" />
      </details>
    </div>
  );
}

function AnalyzeResult({ data }: { data: AnalyzeResponse }) {
  const r = data.report;
  return (
    <div data-testid="analyze-result">
      <h2>{r.is_food ? (r.name ?? "Food") : "Not food"}</h2>
      {r.is_food ? (
        <>
          <p>
            {r.brand && <strong>{r.brand} · </strong>}
            {r.kind}{" "}
            {r.confidence !== undefined && <span className="muted">(confidence {String(r.confidence)})</span>}
          </p>
          {r.description && <p>{r.description}</p>}
          <h3>For you</h3>
          <VerdictDetails value={r.verdict} testId="analyze-verdict" />
          {r.ingredients?.text && (
            <p>
              <strong>Ingredients:</strong> {r.ingredients.text}
            </p>
          )}
          {r.allergens && (
            <p>
              <strong>Allergens:</strong> {r.allergens.contains.join(", ") || "none detected"}
              {r.allergens.may_contain.length > 0 && (
                <>
                  {" "}
                  · <strong>May contain:</strong> {r.allergens.may_contain.join(", ")}
                </>
              )}
            </p>
          )}
          {r.nutrition && <NutritionTable nutriments={r.nutrition.values} per={r.nutrition.basis} />}
        </>
      ) : (
        <p>{r.description}</p>
      )}
      <p className="notice">{r.disclaimer}</p>
      <details>
        <summary>Full report</summary>
        <JsonView value={data} testId="analyze-raw" />
      </details>
    </div>
  );
}
