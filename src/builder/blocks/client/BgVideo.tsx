"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Video de fondo con carga diferida: solo asigna `src` cuando el bloque se acerca al
 * viewport. Muted + playsInline para cumplir las políticas de autoplay de los navegadores;
 * respeta prefers-reduced-motion (no reproduce, muestra el póster).
 */
export function BgVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          el.play().catch(() => {});
        } else if (!el.paused) el.pause();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      src={active ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay={active}
      preload="none"
      aria-hidden
    />
  );
}
