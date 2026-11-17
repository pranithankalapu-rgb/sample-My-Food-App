import React, { useEffect, useRef, useState } from "react";
import { validateBarcode } from "../api.js";
import { navigate } from "../App.jsx";

export default function LookupScreen() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  const lookUp = (value) => {
    const problem = validateBarcode(value);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    navigate(`/product/${String(value).trim()}`);
  };

  return (
    <section className="card narrow">
      <h1>Barcode lookup</h1>
      <form onSubmit={(e) => { e.preventDefault(); lookUp(code); }} noValidate>
        <label>
          Barcode
          <input
            name="barcode"
            inputMode="numeric"
            placeholder="e.g. 3017620422003"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "barcode-error" : undefined}
          />
        </label>
        {error && <p id="barcode-error" className="error" role="alert" data-testid="barcode-error">{error}</p>}
        <div className="actions">
          <button type="submit" className="primary">Look up</button>
          <button type="button" onClick={() => setScanning((s) => !s)}>
            {scanning ? "Stop camera" : "Scan with camera"}
          </button>
        </div>
      </form>
      {scanning && (
        <CameraScanner
          onCode={(value) => { setScanning(false); setCode(value); lookUp(value); }}
          onError={(message) => { setScanning(false); setError(message); }}
        />
      )}
    </section>
  );
}

function CameraScanner({ onCode, onError }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Starting camera…");
  // the parent passes new callbacks on every render; the camera must not restart
  const handlers = useRef({ onCode, onError });
  handlers.current = { onCode, onError };

  useEffect(() => {
    const onCode = (value) => handlers.current.onCode(value);
    const onError = (message) => handlers.current.onError(message);
    let controls;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError("This browser cannot use the camera here (it needs HTTPS or localhost).");
        return;
      }
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result && !cancelled) {
            cancelled = true;
            controls?.stop();
            onCode(result.getText());
          }
        });
        if (cancelled) controls.stop();
        else setStatus("Point the camera at a barcode.");
      } catch (err) {
        const denied = err?.name === "NotAllowedError";
        const none = err?.name === "NotFoundError" || err?.name === "OverconstrainedError";
        onError(denied ? "Camera permission was denied." : none ? "No camera was found." : `Camera error: ${err?.message || err}`);
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="camera">
      <video ref={videoRef} muted playsInline aria-label="Camera preview" />
      <p className="muted" role="status">{status}</p>
    </div>
  );
}
