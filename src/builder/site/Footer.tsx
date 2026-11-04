import type { CSSProperties } from "react";
import type { FooterSettings } from "@/lib/model/settings";
import { linkProps } from "../blocks/shared";
import { Icon } from "../icons";
import { responsiveCss } from "../styles/css";
import { NewsletterForm, YearText } from "./Newsletter";

export function Footer({ settings: f }: { settings: FooterSettings }) {
  const columns = f.columns ?? [];
  const nl = f.newsletter;
  const showNewsletter = !!nl?.enabled;
  const bg = f.background;
  const social = f.socialStyle ?? { variant: "soft", background: "#ffffff", color: "#0b1120" };
  const css = responsiveCss(".lp-footer-logo", f.logoHeight, (h) => ({ height: h }));
  return (
    <footer
      className="lp-footer"
      style={
        {
          background: f.colors.background,
          color: f.colors.text,
          paddingTop: f.paddingY,
          paddingBottom: Math.round(parseInt(f.paddingY) / 2) || 32,
          ["--lp-footer-cols"]: Math.max(1, columns.length),
          ["--lp-footer-extra"]: showNewsletter ? "minmax(0, 1.2fr)" : "",
        } as CSSProperties
      }
    >
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {bg?.image?.url ? (
        <div className="lp-bg" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bg.image.url} alt="" loading="lazy" decoding="async" />
        </div>
      ) : null}
      {bg?.image?.url && bg.overlayColor ? (
        <div className="lp-overlay" aria-hidden style={{ background: bg.overlayColor, opacity: Math.max(0, Math.min(1, Number(bg.overlayOpacity ?? 0.85))) }} />
      ) : null}
      <div className={`lp-footer-inner${showNewsletter ? " has-newsletter" : ""}`} style={{ maxWidth: f.maxWidth }}>
        <div className="lp-footer-brand">
          {f.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="lp-footer-logo" src={f.logo.url} alt={f.logo.alt || "Logo"} loading="lazy" />
          ) : null}
          {f.about ? <p style={{ color: f.colors.muted, whiteSpace: "pre-line" }}>{f.about}</p> : null}
          {f.social?.length ? (
            <div className={`lp-footer-social is-${social.variant}`}>
              {f.social.map((s) => (
                <a
                  key={s.id}
                  {...linkProps(s.url, true)}
                  aria-label={s.network}
                  style={social.variant === "circle" ? { background: social.background, color: social.color } : { color: f.colors.link }}
                >
                  <Icon name={s.network} size={18} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
        {columns.map((c) => (
          <nav key={c.id} aria-label={c.title || "Enlaces"}>
            {c.title ? <h3 style={{ color: f.colors.link }}>{c.title}</h3> : null}
            <ul style={f.linkSize ? { fontSize: f.linkSize } : undefined}>
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
        {showNewsletter ? (
          <section className="lp-newsletter" aria-label={nl.title || "Newsletter"} style={{ borderColor: nl.borderColor || undefined }}>
            {nl.title ? <h3 style={{ color: f.colors.link }}>{nl.title}</h3> : null}
            {nl.text ? <p>{nl.text}</p> : null}
            <NewsletterForm
              placeholder={nl.placeholder || "Tu email"}
              buttonLabel={nl.buttonLabel || "Suscribirme"}
              successMessage={nl.successMessage || "¡Gracias por suscribirte!"}
              buttonStyle={{ background: nl.buttonBackground, color: nl.buttonColor }}
            />
          </section>
        ) : null}
      </div>
      {f.copyright || f.legalLinks?.length ? (
        <div className="lp-footer-bottom" style={{ maxWidth: f.maxWidth, color: f.colors.muted }}>
          {f.legalLinks?.length ? (
            <nav className="lp-footer-legal" aria-label="Legal">
              {f.legalLinks.map((l) => (
                <a key={l.id} {...linkProps(l.href, l.newTab)} style={{ color: f.colors.text }}>
                  {l.label}
                </a>
              ))}
            </nav>
          ) : null}
          {f.copyright ? <YearText text={f.copyright} /> : null}
        </div>
      ) : null}
    </footer>
  );
}
