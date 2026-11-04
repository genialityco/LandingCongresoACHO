import { Fragment } from "react";
import type { Device, MediaRef } from "@/lib/model/types";
import { Icon } from "../icons";
import { anchorDecls, cssValue, MEDIA, responsiveCss, rule } from "../styles/css";
import type { Background } from "../styles/types";
import { CarouselClient } from "./client/Carousel";
import { FormClient, type FormFieldDef } from "./client/Form";
import { GalleryClient } from "./client/Gallery";
import { Dismissible } from "./client/Misc";
import {
  BackgroundLayer,
  backgroundCss,
  getBlockStyle,
  Img,
  isEditing,
  linkProps,
  rootRef,
  StyleTag,
  type BlockProps,
  type InlineText,
  type SlotRender,
} from "./shared";

const JUSTIFY = { start: "flex-start", center: "center", end: "flex-end" } as const;

// ---------- Hero ----------
export type ContentPosition = {
  h?: "start" | "center" | "end";
  v?: "start" | "center" | "end";
  maxWidth?: string;
  textAlign?: "left" | "center" | "right";
  gap?: string;
};

export type HeroProps = BlockProps<{
  content: SlotRender;
  background: Background;
  contentPosition: Partial<Record<Device, ContentPosition>>;
  ariaLabel?: string;
}>;

export function HeroBlock(p: HeroProps) {
  const s = getBlockStyle(p);
  const Content = p.content;
  let css = s.css + backgroundCss(s.selector, p.background);
  css += responsiveCss(`${s.selector} > .lp-hero-inner`, p.contentPosition, (c) => ({
    "justify-content": c.h ? JUSTIFY[c.h] : undefined,
    "align-items": c.v ? JUSTIFY[c.v] : undefined,
  }));
  css += responsiveCss(`${s.selector} .lp-hero-content`, p.contentPosition, (c) => ({
    "max-width": c.maxWidth,
    "text-align": c.textAlign,
    "align-items": c.textAlign === "center" ? "center" : c.textAlign === "right" ? "flex-end" : c.textAlign === "left" ? "flex-start" : undefined,
    gap: c.gap,
  }));
  return (
    <section ref={rootRef(p)} className={`lp-hero ${s.className}`} aria-label={p.ariaLabel || undefined} {...s.attrs}>
      <StyleTag css={css} />
      <BackgroundLayer bg={p.background} isEditing={isEditing(p)} />
      <div className="lp-hero-inner">
        <Content className="lp-hero-content" minEmptyHeight={120} />
      </div>
    </section>
  );
}

// ---------- Superposición libre ----------
export type OverlayContainerProps = BlockProps<{
  layers: SlotRender;
  background: Background;
  mobileStack: boolean;
  mobileGap: string;
}>;

export function OverlayContainerBlock(p: OverlayContainerProps) {
  const s = getBlockStyle(p);
  const Layers = p.layers;
  let css = s.css + backgroundCss(s.selector, p.background);
  // En mobile, apilar las capas en flujo normal evita solapamientos ilegibles.
  if (p.mobileStack !== false) {
    const gap = cssValue(p.mobileGap) ?? "16px";
    css += `${MEDIA.mobile}{${s.selector} .lp-overlay-layers{display:flex;flex-direction:column;gap:${gap};padding:24px var(--lp-gutter)}${s.selector} .lp-overlay-layers > .lp-overlay-layer{position:relative;left:auto;right:auto;top:auto;bottom:auto;translate:none;max-width:100%}}`;
  }
  return (
    <div ref={rootRef(p)} className={`lp-overlay-container ${s.className}`} {...s.attrs}>
      <StyleTag css={css} />
      <BackgroundLayer bg={p.background} isEditing={isEditing(p)} />
      <Layers className="lp-overlay-layers" allow={["OverlayLayer"]} minEmptyHeight={200} />
    </div>
  );
}

export type OverlayLayerProps = BlockProps<{ content: SlotRender }>;

export function OverlayLayerBlock(p: OverlayLayerProps) {
  const s = getBlockStyle(p, { omit: ["offsetX", "offsetY", "anchor"] });
  const Content = p.content;
  // Ancla + desplazamiento relativos al contenedor, por dispositivo (herencia desktop → tablet → mobile).
  let last: { anchor?: string; x?: string; y?: string } = {};
  const resolved: Partial<Record<Device, { anchor: string; x?: string; y?: string }>> = {};
  for (const d of ["desktop", "tablet", "mobile"] as Device[]) {
    const b = p.layout?.[d];
    if (b && (b.anchor || b.offsetX !== undefined || b.offsetY !== undefined)) {
      last = { anchor: b.anchor ?? last.anchor, x: b.offsetX ?? last.x, y: b.offsetY ?? last.y };
      resolved[d] = { anchor: last.anchor ?? "center", x: last.x, y: last.y };
    }
  }
  if (!resolved.desktop) resolved.desktop = { anchor: "center" };
  const css = s.css + responsiveCss(s.selector, resolved, (r) => anchorDecls(r.anchor as never, r.x, r.y));
  return (
    <div ref={rootRef(p)} className={`lp-overlay-layer ${s.className}`} {...s.attrs}>
      <StyleTag css={css} />
      <Content className="lp-flow" style={{ display: "flex", flexDirection: "column", gap: 12 }} minEmptyHeight={60} />
    </div>
  );
}

// ---------- CTA ----------
export type CtaButton = { label: string; href: string; variant: "primary" | "secondary" | "outline" };

export type CtaProps = BlockProps<{
  background: Background;
  eyebrow: string;
  title: InlineText;
  text: InlineText;
  buttons: CtaButton[];
  align: "left" | "center";
}>;

export function CtaBlock(p: CtaProps) {
  const s = getBlockStyle(p);
  const center = p.align === "center";
  const css = s.css + backgroundCss(s.selector, p.background);
  return (
    <section ref={rootRef(p)} className={`lp-cta ${s.className}`} style={{ justifyContent: center ? "center" : "flex-start" }} {...s.attrs}>
      <StyleTag css={css} />
      <BackgroundLayer bg={p.background} isEditing={isEditing(p)} />
      <div className="lp-cta-inner" style={{ textAlign: center ? "center" : "left", alignItems: center ? "center" : "flex-start" }}>
        {p.eyebrow ? <p className="lp-subtitle" style={{ color: "inherit", opacity: 0.85 }}>{p.eyebrow}</p> : null}
        <h2>{p.title}</h2>
        {p.text ? <p style={{ opacity: 0.9 }}>{p.text}</p> : null}
        {p.buttons?.length ? (
          <div className="lp-cta-actions" style={{ justifyContent: center ? "center" : "flex-start" }}>
            {p.buttons.map((b, i) => (
              <a key={i} className={`lp-btn lp-btn-${b.variant ?? "primary"}`} {...linkProps(b.href)}>
                {b.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---------- Carrusel ----------
export type CarouselProps = BlockProps<{
  slides: { image: MediaRef | null; title: string; text: string; buttonLabel: string; buttonHref: string }[];
  autoplay: boolean;
  interval: number;
  showArrows: boolean;
  showDots: boolean;
  ariaLabel: string;
}>;

export function CarouselBlock(p: CarouselProps) {
  const s = getBlockStyle(p);
  const slides = (p.slides ?? []).map((sl, i) => (
    <Fragment key={i}>
      <Img media={sl.image} alt={sl.image?.alt ?? sl.title ?? ""} eager={i === 0} />
      {sl.title || sl.text || sl.buttonLabel ? (
        <div className="lp-carousel-caption">
          {sl.title ? <h3 style={{ color: "#fff" }}>{sl.title}</h3> : null}
          {sl.text ? <p>{sl.text}</p> : null}
          {sl.buttonLabel ? (
            <a className="lp-btn lp-btn-primary" {...linkProps(sl.buttonHref)}>
              {sl.buttonLabel}
            </a>
          ) : null}
        </div>
      ) : null}
    </Fragment>
  ));
  return (
    <div ref={rootRef(p)} className={`lp-carousel ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      <CarouselClient
        slides={slides}
        autoplay={p.autoplay}
        interval={p.interval}
        showArrows={p.showArrows}
        showDots={p.showDots}
        editing={isEditing(p)}
        label={p.ariaLabel || "Carrusel"}
      />
    </div>
  );
}

// ---------- Galería ----------
export type GalleryProps = BlockProps<{
  images: { image: MediaRef | null; caption: string }[];
  aspect: "1/1" | "4/3" | "16/9" | "3/4";
  lightbox: boolean;
}>;

export function GalleryBlock(p: GalleryProps) {
  const s = getBlockStyle(p, { container: "grid" });
  const images = (p.images ?? [])
    .filter((i) => i.image?.url)
    .map((i) => ({ url: i.image!.url, thumbUrl: i.image!.thumbUrl, alt: i.image!.alt ?? i.caption ?? "", caption: i.caption }));
  return (
    <div ref={rootRef(p)} className={`lp-gallery ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      <GalleryClient images={images} aspect={(p.aspect ?? "4/3").replace("/", " / ")} lightbox={p.lightbox !== false} editing={isEditing(p)} />
    </div>
  );
}

// ---------- Tarjetas / testimonios / estadísticas ----------
export type CardsProps = BlockProps<{
  items: { image: MediaRef | null; icon: string; title: string; text: string; linkLabel: string; href: string }[];
  media: "image" | "icon" | "none";
}>;

export function CardsBlock(p: CardsProps) {
  const s = getBlockStyle(p, { container: "grid" });
  return (
    <div ref={rootRef(p)} className={`lp-cards ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      {(p.items ?? []).map((c, i) => (
        <article key={i} className="lp-card">
          {p.media === "image" && c.image?.url ? <Img media={c.image} alt={c.image.alt ?? ""} className="lp-card-media" /> : null}
          <div className="lp-card-body">
            {p.media === "icon" && c.icon ? (
              <span className="lp-card-icon">
                <Icon name={c.icon} size={24} />
              </span>
            ) : null}
            <h3>{c.title}</h3>
            {c.text ? <p className="lp-card-text">{c.text}</p> : null}
            {c.linkLabel ? (
              <a className="lp-card-link" {...linkProps(c.href)}>
                {c.linkLabel} →
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export type TestimonialsProps = BlockProps<{
  items: { quote: string; name: string; role: string; avatar: MediaRef | null; rating: number }[];
}>;

export function TestimonialsBlock(p: TestimonialsProps) {
  const s = getBlockStyle(p, { container: "grid" });
  return (
    <div ref={rootRef(p)} className={`lp-testimonials ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      {(p.items ?? []).map((t, i) => (
        <figure key={i} className="lp-testimonial" style={{ margin: 0 }}>
          {t.rating ? (
            <div aria-label={`${t.rating} de 5 estrellas`} style={{ color: "#f59e0b", display: "flex", gap: 2 }}>
              {Array.from({ length: Math.min(5, t.rating) }, (_, k) => (
                <Icon key={k} name="star" size={16} />
              ))}
            </div>
          ) : null}
          <blockquote>“{t.quote}”</blockquote>
          <figcaption>
            {t.avatar?.url ? <Img media={t.avatar} alt={t.name} thumb /> : null}
            <div>
              <strong>{t.name}</strong>
              {t.role ? <small>{t.role}</small> : null}
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export type StatsProps = BlockProps<{ items: { value: string; label: string }[] }>;

export function StatsBlock(p: StatsProps) {
  const s = getBlockStyle(p, { container: "grid" });
  return (
    <div ref={rootRef(p)} className={`lp-stats ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      {(p.items ?? []).map((st, i) => (
        <div key={i} className="lp-stat">
          <div className="lp-stat-value">{st.value}</div>
          <div className="lp-stat-label">{st.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Formulario / FAQ / banner ----------
export type FormProps = BlockProps<{
  formId: string;
  fields: FormFieldDef[];
  submitLabel: string;
  successMessage: string;
  buttonVariant: "primary" | "secondary" | "outline";
}>;

export function FormBlock(p: FormProps) {
  const s = getBlockStyle(p);
  return (
    <div ref={rootRef(p)} className={s.className} style={{ width: "100%" }} {...s.attrs}>
      <StyleTag css={s.css} />
      <FormClient
        formId={p.formId || p.id}
        fields={p.fields ?? []}
        submitLabel={p.submitLabel || "Enviar"}
        successMessage={p.successMessage || "¡Gracias!"}
        buttonClass={`lp-btn lp-btn-${p.buttonVariant ?? "primary"}`}
        editing={isEditing(p)}
      />
    </div>
  );
}

export type FaqProps = BlockProps<{ items: { question: string; answer: string }[]; openFirst: boolean }>;

export function FaqBlock(p: FaqProps) {
  const s = getBlockStyle(p);
  return (
    <div ref={rootRef(p)} className={`lp-faq ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      {(p.items ?? []).map((q, i) => (
        <details key={i} open={p.openFirst && i === 0 ? true : undefined}>
          <summary>{q.question}</summary>
          <div style={{ whiteSpace: "pre-line" }}>{q.answer}</div>
        </details>
      ))}
    </div>
  );
}

export type PromoBannerProps = BlockProps<{
  badge: string;
  text: InlineText;
  linkLabel: string;
  href: string;
  background: string;
  textColor: string;
  dismissible: boolean;
}>;

export function PromoBannerBlock(p: PromoBannerProps) {
  const s = getBlockStyle(p);
  const css = s.css + rule(s.selector, { background: p.background, color: p.textColor });
  const body = (
    <>
      <StyleTag css={css} />
      {p.badge ? <span className="lp-promo-badge">{p.badge}</span> : null}
      <span>{p.text}</span>
      {p.linkLabel ? (
        <a {...linkProps(p.href)} style={{ fontWeight: 700, textDecoration: "underline" }}>
          {p.linkLabel}
        </a>
      ) : null}
    </>
  );
  if (p.dismissible) {
    return (
      <div ref={rootRef(p)} style={{ width: "100%" }} {...s.attrs}>
        <Dismissible className={`lp-promo ${s.className}`} editing={isEditing(p)}>
          {body}
        </Dismissible>
      </div>
    );
  }
  return (
    <div ref={rootRef(p)} className={`lp-promo ${s.className}`} role="region" aria-label="Promoción" {...s.attrs}>
      {body}
    </div>
  );
}
