import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { validateBarcode, type BarcodeResult } from "../lib/barcode";
import { useHistory } from "../api/queries";
import { useSession } from "../auth/session";
import { formatDate } from "../lib/format";
import { usePageTitle } from "../components/states";

export function LookupPage() {
  usePageTitle("Barcode lookup");
  const navigate = useNavigate();
  const { session } = useSession();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const history = useHistory(session?.user.id);

  const lookUp = (value: string) => {
    const checked = validateBarcode(value);
    setResult(checked);
    if (checked.ok) void navigate(`/product/${checked.code}`);
  };
  const invalid = result && !result.ok ? result : null;
  const recent = history.data?.data.productHistory.slice(0, 6) ?? [];

  return (
    <div className="stack">
      <section className="card narrow">
        <h1>Barcode lookup</h1>
        <p className="muted">
          EAN-8, UPC-A or EAN-13. The check digit is verified before anything is sent to the API.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookUp(code);
          }}
          noValidate
        >
          <label>
            Barcode
            <input
              name="barcode"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 3017620422003"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setResult(null);
              }}
              aria-invalid={Boolean(invalid)}
              aria-describedby={invalid ? "barcode-error" : "barcode-hint"}
            />
          </label>
          {invalid ? (
            <p
              id="barcode-error"
              className="error"
              role="alert"
              data-testid="barcode-error"
              data-reason={invalid.reason}
            >
              {invalid.message}
            </p>
          ) : (
            <p id="barcode-hint" className="muted small">
              Spaces and dashes are ignored.
            </p>
          )}
          <div className="actions">
            <button type="submit" className="primary">
              Look up
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                setScanning((s) => !s);
              }}
              aria-pressed={scanning}
            >
              {scanning ? "Stop camera" : "Scan with camera"}
            </button>
          </div>
        </form>
        {cameraError && (
          <p className="error" role="alert" data-testid="camera-error">
            {cameraError}
          </p>
        )}
        {scanning && (
          <CameraScanner
            onCode={(value) => {
              setScanning(false);
              setCode(value);
              lookUp(value);
            }}
            onError={(message) => {
              setScanning(false);
              setCameraError(message);
            }}
          />
        )}
      </section>

      {recent.length > 0 && (
        <section className="card narrow" aria-labelledby="recent-title">
          <h2 id="recent-title">Your recent scans</h2>
          <ul className="link-list" data-testid="recent-scans">
            {recent.map((h) => (
              <li key={`${h.product_code}-${h.updated_at}`}>
                <Link to={`/product/${h.product_code}`}>{h.product_name || h.product_code}</Link>
                <span className="muted small"> · {formatDate(h.updated_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CameraScanner({
  onCode,
  onError,
}: {
  onCode: (code: string) => void;
  onError: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Starting the camera…");
  // the parent passes new callbacks on every render; the camera must not restart
  const handlers = useRef({ onCode, onError });
  useEffect(() => {
    handlers.current = { onCode, onError };
  });

  useEffect(() => {
    let stop: (() => void) | undefined;
    const scan = { cancelled: false };
    void (async () => {
      // the camera API only exists on secure origins (https, or localhost)
      if (!window.isSecureContext) {
        handlers.current.onError("This browser cannot use the camera here (it needs HTTPS or localhost).");
        return;
      }
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const video = videoRef.current;
        if (!video) return;
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          if (result && !scan.cancelled) {
            scan.cancelled = true;
            controls.stop();
            handlers.current.onCode(result.getText());
          }
        });
        stop = () => {
          controls.stop();
        };
        if (scan.cancelled) controls.stop();
        else setStatus("Point the camera at a barcode.");
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        handlers.current.onError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow the camera in the browser, or type the barcode."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No camera was found. Type the barcode instead."
              : "The camera could not be started. Type the barcode instead.",
        );
      }
    })();
    return () => {
      scan.cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div className="camera">
      <video ref={videoRef} muted playsInline aria-label="Camera preview" />
      <p className="muted" role="status">
        {status}
      </p>
    </div>
  );
}
