"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CarouselClient({
  slides,
  autoplay,
  interval,
  showArrows,
  showDots,
  editing,
  label,
}: {
  slides: ReactNode[];
  autoplay?: boolean;
  interval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  editing?: boolean;
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (!autoplay || editing || paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), Math.max(2000, interval ?? 5000));
    return () => clearInterval(timer);
  }, [autoplay, editing, paused, interval, count]);

  if (!count) return null;
  return (
    <div
      style={{ height: "100%", position: "relative" }}
      role="region"
      aria-roledescription="carrusel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="lp-carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => (
          <div key={i} className="lp-carousel-slide" role="group" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${count}`} aria-hidden={i !== index}>
            {s}
          </div>
        ))}
      </div>
      {showArrows !== false && count > 1 ? (
        <>
          <button type="button" className="lp-carousel-nav" style={{ left: 14 }} onClick={() => go(index - 1)} aria-label="Anterior">
            <ChevronLeft />
          </button>
          <button type="button" className="lp-carousel-nav" style={{ right: 14 }} onClick={() => go(index + 1)} aria-label="Siguiente">
            <ChevronRight />
          </button>
        </>
      ) : null}
      {showDots !== false && count > 1 ? (
        <div className="lp-carousel-dots">
          {slides.map((_, i) => (
            <button key={i} type="button" aria-label={`Ir a la diapositiva ${i + 1}`} aria-current={i === index} onClick={() => go(i)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
