import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const TEXT_KEYS = ["text", "extracted_text", "ocr_text", "raw_text", "full_text", "ingredients_text", "ingredients"];

// The OCR service's answer is passed through by the API as `ocrData`; its
// exact shape belongs to that service, so look for the text it extracted.
export function findText(data, depth = 0) {
  if (data == null || depth > 4) return null;
  if (typeof data === "string") return data.trim() || null;
  if (Array.isArray(data)) {
    const parts = data.map((d) => findText(d, depth + 1)).filter(Boolean);
    return parts.length ? parts.join("\n") : null;
  }
  if (typeof data === "object") {
    for (const key of TEXT_KEYS) {
      const found = typeof data[key] === "string" ? data[key].trim() : null;
      if (found) return found;
    }
    for (const value of Object.values(data)) {
      if (value && typeof value === "object") {
        const found = findText(value, depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
}

export default function LabelScanScreen({ token }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState({ status: "idle" });

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) {
      setState({ status: "error", message: "Choose a photo of a food label first." });
      return;
    }
    setState({ status: "loading" });
    try {
      const res = await api.scanLabel(token, file);
      if (!res || res.ocrData === undefined) throw new Error("The API answered without OCR data.");
      setState({ status: "ok", data: res.ocrData, text: findText(res.ocrData) });
    } catch (err) {
      setState({ status: "error", message: err.message, httpStatus: err.status });
    }
  };

  return (
    <section className="card">
      <h1>Label scan</h1>
      <p className="muted">Upload a photo of an ingredients or nutrition label. It is sent to the API’s OCR endpoint.</p>
      <form onSubmit={submit}>
        <label>
          Label photo (JPEG, PNG, WebP or HEIC)
          <input type="file" name="label" accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setState({ status: "idle" }); }} />
        </label>
        {preview && <img className="label-preview" src={preview} alt="Selected label" />}
        <button type="submit" className="primary" disabled={state.status === "loading"}>
          {state.status === "loading" ? "Reading the label…" : "Scan label"}
        </button>
      </form>

      {state.status === "loading" && <p role="status" className="loading" data-testid="scan-loading">Uploading and reading the label (up to 30 s)…</p>}
      {state.status === "error" && (
        <p className="error" role="alert" data-testid="scan-error">
          {state.httpStatus ? `HTTP ${state.httpStatus}: ` : ""}{state.message}
        </p>
      )}
      {state.status === "ok" && (
        <div data-testid="scan-result">
          <h2>Extracted text</h2>
          {state.text
            ? <pre className="ocr-text" data-testid="scan-text">{state.text}</pre>
            : <p className="error" role="alert" data-testid="scan-no-text">The OCR service answered, but returned no text.</p>}
          <details>
            <summary>Full OCR response</summary>
            <pre className="ocr-raw" data-testid="scan-raw">{JSON.stringify(state.data, null, 2)}</pre>
          </details>
        </div>
      )}
    </section>
  );
}
