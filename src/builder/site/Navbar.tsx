"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import type { NavbarSettings } from "@/lib/model/settings";
import { linkProps } from "../blocks/shared";
import { Icon } from "../icons";

export function Navbar({ settings: n, styleMode, editing }: { settings: NavbarSettings; styleMode: "solid" | "transparent"; editing?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location, setLocation] = useState({ path: "", hash: "" });

  useEffect(() => {
    const update = () => setLocation({ path: window.location.pathname, hash: window.location.hash });
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

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
  // Enlace activo: el que coincide con la sección/página actual; si ninguno, el marcado como resaltado.
  const matches = (href: string) => !!href && ((href.startsWith("#") && href === location.hash) || href === location.path);
  const anyMatch = links.some((l) => matches(l.href));
  const isActive = (l: (typeof links)[number]) => matches(l.href) || (!anyMatch && !!l.highlight);
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
            <a
              key={b.id}
              className={`lp-btn ${b.background ? "lp-btn-custom" : `lp-btn-${b.variant}`}`}
              style={b.background ? { ["--b-bg" as string]: b.background, ["--b-border" as string]: b.background, ["--b-color" as string]: b.color || "#ffffff" } : undefined}
              {...linkProps(b.href)}
              onClick={close}
            >
              {b.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );

  const top = n.topBar;
  const topBar = top?.enabled && (top.items.length || top.social.length) ? (
    <div
      className={`lp-topbar${top.hideOnMobile ? " hide-mobile" : ""}`}
      style={{ background: top.colors.background, color: top.colors.text, fontSize: top.fontSize, ["--lp-topbar-icon" as string]: top.colors.icon }}
    >
      <div className="lp-topbar-inner" style={{ maxWidth: n.maxWidth, paddingTop: top.paddingY, paddingBottom: top.paddingY }}>
        <ul className="lp-topbar-items">
          {top.items.map((it) => {
            const body = (
              <>
                {it.icon ? <Icon name={it.icon} size={16} /> : null}
                <span>{it.text}</span>
              </>
            );
            return <li key={it.id}>{it.href ? <a {...linkProps(it.href)}>{body}</a> : body}</li>;
          })}
        </ul>
        {top.social.length ? (
          <div className="lp-topbar-social">
            {top.social.map((s) => (
              <a key={s.id} {...linkProps(s.url, true)} aria-label={s.network} style={{ background: top.colors.socialBackground, color: top.colors.socialColor }}>
                <Icon name={s.network} size={14} />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <header className={cls} style={style}>
      {topBar}
      <nav className="lp-nav-inner" aria-label="Principal" style={{ maxWidth: n.maxWidth, paddingTop: n.paddingY, paddingBottom: n.paddingY }}>
        <Link href="/" className="lp-nav-brand" aria-label={n.logoText || "Inicio"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {n.logo?.url ? <img src={n.logo.url} alt={n.logo.alt || n.logoText || "Logo"} /> : null}
          {n.logoText && !n.logo?.url ? <span>{n.logoText}</span> : null}
        </Link>
        <ul className="lp-nav-links" style={{ gap: n.gap }}>
          {links.map((l) => (
            <li key={l.id}>
              <a
                {...linkProps(l.href, l.newTab)}
                className={isActive(l) ? "is-active" : undefined}
                aria-current={isActive(l) ? "page" : undefined}
                aria-haspopup={l.children?.length ? "true" : undefined}
              >
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
            <a
              key={b.id}
              className={`lp-btn ${b.background ? "lp-btn-custom" : `lp-btn-${b.variant}`}`}
              style={{ padding: "10px 22px", ...(b.background ? { ["--b-bg" as string]: b.background, ["--b-border" as string]: b.background, ["--b-color" as string]: b.color || "#ffffff" } : {}) }}
              {...linkProps(b.href)}
            >
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
