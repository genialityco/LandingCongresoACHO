"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryImage = { url: string; thumbUrl?: string; alt: string; caption?: string };

export function GalleryClient({ images, aspect, lightbox, editing }: { images: GalleryImage[]; aspect: string; lightbox: boolean; editing?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  return (
    <>
      {images.map((img, i) => (
        <figure key={i} style={{ margin: 0 }}>
          <button
            type="button"
            className="lp-gallery-item"
            style={{ aspectRatio: aspect, width: "100%", display: "block" }}
            onClick={() => lightbox && !editing && setOpen(i)}
            aria-label={img.alt ? `Ampliar: ${img.alt}` : `Ampliar imagen ${i + 1}`}
          >
            {/* Miniatura: el original solo se descarga al abrir el lightbox */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.thumbUrl || img.url} alt={img.alt} loading="lazy" decoding="async" />
            {img.caption ? <figcaption>{img.caption}</figcaption> : null}
          </button>
        </figure>
      ))}
      {open !== null && images[open] ? (
        <div className="lp-lightbox" role="dialog" aria-modal="true" aria-label="Imagen ampliada" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[open].url} alt={images[open].alt} onClick={(e) => e.stopPropagation()} />
          <button type="button" style={{ top: 20, right: 20 }} onClick={() => setOpen(null)} aria-label="Cerrar">
            <X />
          </button>
          {images.length > 1 ? (
            <>
              <button
                type="button"
                style={{ left: 20, top: "50%" }}
                aria-label="Anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open - 1 + images.length) % images.length);
                }}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                style={{ right: 20, top: "50%" }}
                aria-label="Siguiente"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open + 1) % images.length);
                }}
              >
                <ChevronRight />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
