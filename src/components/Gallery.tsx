import { useEffect, useRef, useState } from "react";
import type { GalleryImage } from "../lib/images";
import { ProductImage } from "./ProductImage";

/** Main image, thumbnails to switch, and a full-screen viewer with zoom. */
export function Gallery({
  images,
  name,
  lowRes,
}: {
  images: GalleryImage[];
  name: string;
  lowRes?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const current = images[index] ?? images[0];

  if (!current) {
    return <ProductImage src={null} alt={name} testId="product-image" />;
  }
  return (
    <div className="gallery" data-testid="gallery">
      <button
        type="button"
        className="gallery-main"
        onClick={() => {
          setOpen(true);
        }}
        aria-label={`Open ${current.label.toLowerCase()} of ${name} full size`}
        data-testid="gallery-open"
      >
        <ProductImage
          src={current.url}
          alt={`${current.label} of ${name}`}
          width={current.width}
          height={current.height}
          lowResFlag={index === 0 ? lowRes : undefined}
          eager
          testId="product-image"
        />
      </button>
      {images.length > 1 && (
        <ul className="gallery-thumbs" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                className={i === index ? "active" : ""}
                aria-pressed={i === index}
                aria-label={`Show ${img.label.toLowerCase()}`}
                onClick={() => {
                  setIndex(i);
                }}
              >
                <ProductImage src={img.thumbUrl} alt="" size="thumb" testId="gallery-thumb" />
                <span>{img.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Lightbox
          images={images}
          index={index}
          name={name}
          onIndex={setIndex}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  name,
  onIndex,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  name: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);
  const image = images[index];

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    return () => {
      el?.close();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.5, 4));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.5, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [index, images.length, onIndex]);

  if (!image) return null;
  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-label={`${image.label} of ${name}`}
      onClose={onClose}
      data-testid="lightbox"
    >
      <div className="lightbox-bar">
        <span>
          {image.label} · {index + 1}/{images.length}
          {image.width && image.height ? ` · ${image.width}×${image.height} px` : ""}
        </span>
        <span className="actions">
          <button
            type="button"
            onClick={() => {
              setZoom((z) => Math.max(z - 0.5, 1));
            }}
            aria-label="Zoom out"
            disabled={zoom <= 1}
          >
            −
          </button>
          <span aria-live="polite" data-testid="lightbox-zoom">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => {
              setZoom((z) => Math.min(z + 0.5, 4));
            }}
            aria-label="Zoom in"
            disabled={zoom >= 4}
          >
            +
          </button>
          <a className="button" href={image.url} target="_blank" rel="noopener noreferrer">
            Open original
          </a>
          <button type="button" className="primary" onClick={onClose} autoFocus>
            Close
          </button>
        </span>
      </div>
      <div className="lightbox-stage">
        <img
          src={image.url}
          alt={`${image.label} of ${name}`}
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
          onDoubleClick={() => {
            setZoom((z) => (z > 1 ? 1 : 2));
          }}
        />
      </div>
    </dialog>
  );
}
