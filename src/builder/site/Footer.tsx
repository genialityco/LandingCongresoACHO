import type { CSSProperties } from "react";
import type { FooterSettings } from "@/lib/model/settings";
import { linkProps } from "../blocks/shared";
import { Icon } from "../icons";

export function Footer({ settings: f }: { settings: FooterSettings }) {
  const columns = f.columns ?? [];
  return (
    <footer
      className="lp-footer"
      style={{ background: f.colors.background, color: f.colors.text, paddingTop: f.paddingY, paddingBottom: Math.round(parseInt(f.paddingY) / 2) || 32, ["--lp-footer-cols"]: Math.max(1, columns.length) } as CSSProperties}
    >
      <div className="lp-footer-inner" style={{ maxWidth: f.maxWidth }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {f.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.logo.url} alt={f.logo.alt || "Logo"} loading="lazy" style={{ height: 40, width: "auto" }} />
          ) : null}
          {f.about ? <p style={{ color: f.colors.muted, whiteSpace: "pre-line" }}>{f.about}</p> : null}
          {f.social?.length ? (
            <div className="lp-footer-social">
              {f.social.map((s) => (
                <a key={s.id} {...linkProps(s.url, true)} aria-label={s.network} style={{ color: f.colors.link }}>
                  <Icon name={s.network} size={18} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
        {columns.map((c) => (
          <nav key={c.id} aria-label={c.title}>
            <h3 style={{ color: f.colors.link }}>{c.title}</h3>
            <ul>
              {c.links.map((l) => (
                <li key={l.id}>
                  <a {...linkProps(l.href, l.newTab)} style={{ color: f.colors.muted }}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      {f.copyright ? (
        <div className="lp-footer-bottom" style={{ maxWidth: f.maxWidth, color: f.colors.muted }}>
          <span>{f.copyright.replace("{year}", String(new Date().getFullYear()))}</span>
        </div>
      ) : null}
    </footer>
  );
}
