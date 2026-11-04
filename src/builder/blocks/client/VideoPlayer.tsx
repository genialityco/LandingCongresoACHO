"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Video incrustado con "fachada": no carga el iframe de YouTube/Vimeo (ni descarga el
 * archivo de Storage) hasta que el usuario pulsa reproducir.
 */
export function VideoPlayer({
  kind,
  src,
  poster,
  title,
  autoplay,
  muted,
  loop,
  controls,
  editing,
}: {
  kind: "embed" | "file";
  src: string;
  poster?: string;
  title: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  editing?: boolean;
}) {
  // Autoplay solo es posible silenciado (política de los navegadores).
  const canAutoplay = !!autoplay && !!muted && !editing;
  const [active, setActive] = useState(canAutoplay || (kind === "file" && !poster));

  if (!active) {
    return (
      <button type="button" className="lp-video-facade" onClick={() => !editing && setActive(true)} aria-label={`Reproducir: ${title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {poster ? <img src={poster} alt="" loading="lazy" /> : null}
        <span className="lp-video-play">
          <Play size={30} fill="currentColor" />
        </span>
      </button>
    );
  }
  if (kind === "embed") {
    const url = new URL(src);
    url.searchParams.set("autoplay", "1");
    if (canAutoplay) url.searchParams.set(url.hostname.includes("vimeo") ? "muted" : "mute", "1");
    return (
      <iframe
        src={url.toString()}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  return (
    <video
      src={src}
      poster={poster}
      controls={controls !== false}
      autoPlay={!editing && (canAutoplay || !!poster)}
      muted={muted}
      loop={loop}
      playsInline
      preload="metadata"
      aria-label={title}
    />
  );
}
