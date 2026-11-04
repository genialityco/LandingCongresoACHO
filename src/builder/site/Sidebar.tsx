"use client";

import { useState, type CSSProperties } from "react";
import { Menu, X } from "lucide-react";
import type { SidebarSettings } from "@/lib/model/settings";
import { linkProps } from "../blocks/shared";

export function Sidebar({ settings: s }: { settings: SidebarSettings }) {
  const [open, setOpen] = useState(false);
  const side = s.position === "right" ? { right: 0 } : { left: 0 };
  return (
    <>
      <aside
        className={`lp-sidebar mobile-${s.mobileBehavior} ${open ? "is-open" : ""}`}
        style={{ width: s.width, background: s.colors.background, color: s.colors.text, ["--lp-sidebar-hover"]: s.colors.hover, ...(open ? side : {}) } as unknown as CSSProperties}
        aria-label="Navegación lateral"
      >
        {s.logo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.logo.url} alt={s.logo.alt || s.title || "Logo"} />
        ) : null}
        {s.title ? <strong>{s.title}</strong> : null}
        <nav>
          <ul>
            {(s.links ?? []).map((l) => (
              <li key={l.id}>
                <a {...linkProps(l.href, l.newTab)} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
                {l.children?.length ? (
                  <ul className="lp-sidebar-sub">
                    {l.children.map((c) => (
                      <li key={c.id}>
                        <a {...linkProps(c.href, c.newTab)} onClick={() => setOpen(false)}>
                          {c.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      {s.mobileBehavior === "drawer" ? (
        <button
          type="button"
          className="lp-sidebar-fab"
          style={{ background: s.colors.background, color: s.colors.text, ...(s.position === "right" ? { right: 18 } : { left: 18 }) }}
          aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X /> : <Menu />}
        </button>
      ) : null}
    </>
  );
}
