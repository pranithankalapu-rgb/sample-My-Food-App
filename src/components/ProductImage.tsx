import { useState } from "react";
import { isLowResolution } from "../lib/images";

interface Props {
  src: string | null | undefined;
  alt: string;
  width?: number | null | undefined;
  height?: number | null | undefined;
  /** CSS box the image is fitted into */
  size?: "thumb" | "full";
  lowResFlag?: boolean | undefined;
  testId?: string;
  eager?: boolean;
}

/**
 * An image that never shows a broken icon: a placeholder when there is no
 * URL or the file fails to load, and a "low resolution" note when small.
 */
export function ProductImage({
  src,
  alt,
  width,
  height,
  size = "full",
  lowResFlag,
  testId = "product-image",
  eager,
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src) && failedSrc === src;
  const lowRes = lowResFlag ?? isLowResolution(width, height);

  if (!src || failed) {
    return (
      <div
        className={`img-placeholder img-${size}`}
        role="img"
        aria-label={failed ? `${alt}: image could not be loaded` : `${alt}: no image available`}
        data-testid={`${testId}-placeholder`}
        data-reason={failed ? "error" : "missing"}
      >
        <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false">
          <rect
            x="6"
            y="10"
            width="36"
            height="28"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <circle cx="17" cy="20" r="3.5" fill="currentColor" />
          <path
            d="M8 34l11-11 8 8 5-5 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
        <span>{failed ? "Image unavailable" : "No image"}</span>
      </div>
    );
  }
  return (
    <figure className={`img-figure img-${size}`}>
      <img
        src={src}
        alt={alt}
        width={width ?? undefined}
        height={height ?? undefined}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        data-testid={testId}
        onError={() => {
          setFailedSrc(src);
        }}
      />
      {lowRes && (
        <figcaption className="badge badge-warn" data-testid={`${testId}-lowres`}>
          Low resolution{width && height ? ` (${width}×${height})` : ""}
        </figcaption>
      )}
    </figure>
  );
}
