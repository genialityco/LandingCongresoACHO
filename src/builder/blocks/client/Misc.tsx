"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dismissible({ children, className, editing }: { children: ReactNode; className: string; editing?: boolean }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className={className} role="region" aria-label="Promoción">
      {children}
      <button type="button" className="lp-promo-close" aria-label="Cerrar" onClick={() => !editing && setHidden(true)}>
        <X size={18} />
      </button>
    </div>
  );
}

/** Activa las animaciones de entrada ([data-anim]) cuando el bloque entra en pantalla. */
export function AnimationObserver() {
  useEffect(() => {
    document.documentElement.classList.add("lp-js");
    const els = document.querySelectorAll<HTMLElement>("[data-anim]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
