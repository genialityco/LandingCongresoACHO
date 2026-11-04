"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import type { NavbarSettings } from "@/lib/model/settings";
import { linkProps } from "../blocks/shared";

export function Navbar({ settings: n, styleMode, editing }: { settings: NavbarSettings; styleMode: "solid" | "transparent"; editing?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!n.sticky) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [n.sticky]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const transparent = styleMode === "transparent";
  const cls = [
    "lp-nav",
    n.sticky ? "is-sticky" : "",
    transparent ? "is-transparent" : "",
    scrolled ? "is-scrolled" : "",
    `collapse-${n.collapseAt}`,
  ].join(" ");
  // En el editor, la navbar transparente fija no debe tapar el lienzo al hacer scroll.
  const style = {
    background: n.colors.background,
    color: n.colors.text,
    fontSize: n.fontSize,
    fontWeight: n.fontWeight,
    ["--lp-nav-font"]: `var(--lp-font-${n.fontFamily})`,
    ["--lp-nav-hover"]: n.colors.hover,
    ["--lp-nav-transparent-text"]: n.colors.transparentText,
    ...(editing && transparent && n.sticky ? { position: "absolute" } : {}),
  } as CSSProperties;
  const links = n.links ?? [];
  const close = () => setOpen(false);

  const mobileMenu = (
    <div
      id="lp-nav-mobile"
      className={`lp-nav-mobile is-${n.mobileMenu} ${open ? "is-open" : ""}`}
      style={{ background: n.colors.background, color: n.colors.text }}
      role={n.mobileMenu === "drawer" ? "dialog" : undefined}
      aria-modal={n.mobileMenu === "drawer" ? true : undefined}
      aria-label="Menú"
    >
      {n.mobileMenu === "drawer" ? (
        <button type="button" className="lp-nav-close" onClick={close} aria-label="Cerrar menú">
          <X />
        </button>
      ) : null}
      <ul>
        {links.map((l) => (
          <li key={l.id}>
            <a {...linkProps(l.href, l.newTab)} onClick={close}>
              {l.label}
            </a>
            {l.children?.length ? (
              <ul className="lp-nav-mobile-sub">
                {l.children.map((c) => (
                  <li key={c.id}>
                    <a {...linkProps(c.href, c.newTab)} onClick={close}>
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {n.buttons?.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          {n.buttons.map((b) => (
            <a key={b.id} className={`lp-btn lp-btn-${b.variant}`} {...linkProps(b.href)} onClick={close}>
              {b.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <header className={cls} style={style}>
      <nav className="lp-nav-inner" aria-label="Principal" style={{ maxWidth: n.maxWidth, paddingTop: n.paddingY, paddingBottom: n.paddingY }}>
        <Link href="/" className="lp-nav-brand" aria-label={n.logoText || "Inicio"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {n.logo?.url ? <img src={n.logo.url} alt={n.logo.alt || n.logoText || "Logo"} /> : null}
          {n.logoText && !n.logo?.url ? <span>{n.logoText}</span> : null}
        </Link>
        <ul className="lp-nav-links" style={{ gap: n.gap }}>
          {links.map((l) => (
            <li key={l.id}>
              <a {...linkProps(l.href, l.newTab)} aria-haspopup={l.children?.length ? "true" : undefined}>
                {l.label}
                {l.children?.length ? <ChevronDown size={14} aria-hidden /> : null}
              </a>
              {l.children?.length ? (
                <ul className="lp-nav-sub">
                  {l.children.map((c) => (
                    <li key={c.id}>
                      <a {...linkProps(c.href, c.newTab)}>{c.label}</a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="lp-nav-actions">
          {(n.buttons ?? []).map((b) => (
            <a key={b.id} className={`lp-btn lp-btn-${b.variant}`} style={{ padding: "10px 18px" }} {...linkProps(b.href)}>
              {b.label}
            </a>
          ))}
        </div>
        <button
          type="button"
          className="lp-nav-toggle"
          aria-expanded={open}
          aria-controls="lp-nav-mobile"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && n.mobileMenu === "drawer" ? <button type="button" className="lp-nav-backdrop" aria-label="Cerrar menú" onClick={close} /> : null}
      {mobileMenu}
    </header>
  );
}
