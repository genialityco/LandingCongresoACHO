import type { CSSProperties } from "react";
import type { MediaRef } from "@/lib/model/types";
import { Icon } from "../icons";
import { boxDecls, responsiveCss, rule, visibilityCss } from "../styles/css";
import type { VideoSource } from "../styles/types";
import { VideoPlayer } from "./client/VideoPlayer";
import {
  embedUrl,
  getBlockStyle,
  Img,
  isEditing,
  linkProps,
  parseEmbed,
  RichContent,
  rootRef,
  StyleTag,
  type BlockProps,
  type InlineText,
} from "./shared";

// ---------- Texto ----------
export type HeadingProps = BlockProps<{ text: InlineText; level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" }>;

export function HeadingBlock(p: HeadingProps) {
  const s = getBlockStyle(p);
  const Tag = p.level ?? "h2";
  return (
    <Tag ref={rootRef(p)} className={`lp-heading ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      {p.text}
    </Tag>
  );
}

export type TextProps = BlockProps<{ text: InlineText }>;

export function SubtitleBlock(p: TextProps) {
  const s = getBlockStyle(p);
  return (
    <p ref={rootRef(p)} className={`lp-subtitle ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      {p.text}
    </p>
  );
}

export function ParagraphBlock(p: TextProps) {
  const s = getBlockStyle(p);
  return (
    <p ref={rootRef(p)} className={`lp-paragraph ${s.className}`} style={{ whiteSpace: "pre-line" }} {...s.attrs}>
      <StyleTag css={s.css} />
      {p.text}
    </p>
  );
}

export type RichTextProps = BlockProps<{ body: unknown }>;

export function RichTextBlock(p: RichTextProps) {
  const s = getBlockStyle(p);
  return (
    <div ref={rootRef(p)} className={`lp-richtext ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      <RichContent value={p.body} />
    </div>
  );
}

// ---------- Imagen ----------
export type ImageProps = BlockProps<{
  image: MediaRef | null;
  alt: string;
  caption: string;
  fit: "cover" | "contain";
  aspectRatio: "auto" | "16/9" | "4/3" | "1/1" | "3/4" | "21/9";
  radius: string;
  href: string;
  newTab: boolean;
  priority: boolean;
}>;

/** "Texto: centro/derecha" en una imagen también alinea la imagen (y el bloque) en su columna. */
const IMAGE_ALIGN = {
  left: { "align-items": "flex-start", "align-self": "flex-start", "margin-left": "0", "margin-right": "auto" },
  center: { "align-items": "center", "align-self": "center", "margin-left": "auto", "margin-right": "auto" },
  right: { "align-items": "flex-end", "align-self": "flex-end", "margin-left": "auto", "margin-right": "0" },
} as const;

export function ImageBlock(p: ImageProps) {
  const base = getBlockStyle(p);
  const s = {
    ...base,
    css:
      base.css +
      responsiveCss(base.selector, p.layout, (b) => (b.textAlign && b.textAlign !== "justify" && !b.align ? IMAGE_ALIGN[b.textAlign] : {})) +
      // Con alineación, la imagen conserva su tamaño natural (hasta el 100 %) en vez de estirarse.
      responsiveCss(`${base.selector} img`, p.layout, (b) => (b.align && b.align !== "stretch") || (b.textAlign && b.textAlign !== "justify") ? { width: "auto", "max-width": "100%" } : {}),
  };
  const imgStyle: CSSProperties = {
    aspectRatio: p.aspectRatio && p.aspectRatio !== "auto" ? p.aspectRatio.replace("/", " / ") : undefined,
    objectFit: p.fit ?? "cover",
    borderRadius: p.radius || undefined,
  };
  const img = <Img media={p.image} alt={p.alt || p.image?.alt || ""} style={imgStyle} eager={p.priority} />;
  return (
    <figure ref={rootRef(p)} className={`lp-image ${s.className}`} {...s.attrs}>
      <StyleTag css={s.css} />
      {p.href ? <a {...linkProps(p.href, p.newTab)}>{img}</a> : img}
      {p.caption ? <figcaption>{p.caption}</figcaption> : null}
    </figure>
  );
}

// ---------- Video ----------
export type VideoProps = BlockProps<{
  video: VideoSource;
  poster: MediaRef | null;
  title: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
  aspectRatio: string;
  customAspectRatio?: string;
  radius: string;
}>;

function safeAspectRatio(value: string | undefined) {
  const ratio = (value ?? "16/9").trim().replace(/\s+/g, "");
  return /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/.test(ratio) ? ratio.replace("/", " / ") : "16 / 9";
}

export function videoSourceInfo(v?: VideoSource): { kind: "embed" | "file"; src: string; thumb?: string } | null {
  if (!v) return null;
  if (v.source === "youtube" || v.source === "vimeo") {
    const e = parseEmbed(v.url);
    if (!e) return null;
    return {
      kind: "embed",
      src: embedUrl(e, {}),
      thumb: e.provider === "youtube" ? `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg` : undefined,
    };
  }
  const src = v.source === "storage" ? v.media?.url : v.url;
  return src ? { kind: "file", src } : null;
}

export function VideoBlock(p: VideoProps) {
  const s = getBlockStyle(p);
  const info = videoSourceInfo(p.video);
  return (
    <div ref={rootRef(p)} className={s.className} style={{ width: "100%" }} {...s.attrs}>
      <StyleTag css={s.css} />
      <div className="lp-video" style={{ aspectRatio: safeAspectRatio(p.customAspectRatio || p.aspectRatio), borderRadius: p.radius || undefined }}>
        {info ? (
          <VideoPlayer
            kind={info.kind}
            src={info.src}
            poster={p.poster?.url || info.thumb || p.video?.media?.thumbUrl}
            title={p.title || "Video"}
            autoplay={p.autoplay}
            muted={p.muted}
            loop={p.loop}
            controls={p.controls}
            editing={isEditing(p)}
          />
        ) : (
          <div style={{ color: "#9ca3af", display: "grid", placeItems: "center", height: "100%" }}>Selecciona un video</div>
        )}
      </div>
    </div>
  );
}

// ---------- Botón ----------
export type ButtonColors = { background?: string; color?: string; border?: string; hoverBackground?: string; hoverColor?: string };

export type ButtonProps = BlockProps<{
  label: InlineText;
  href: string;
  newTab: boolean;
  variant: "primary" | "secondary" | "outline" | "link" | "custom";
  icon: string;
  iconPosition: "left" | "right";
  colors?: ButtonColors;
  radius?: string;
  ariaLabel?: string;
}>;

const JUSTIFY = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" } as const;

/**
 * El contenedor (.lp-btn-wrap) recibe alineación y márgenes; el enlace recibe ancho,
 * alto, padding y tipografía. Todo por dispositivo.
 */
export function buttonCss(sel: string, p: Pick<ButtonProps, "layout" | "colors" | "radius" | "variant">) {
  let css = responsiveCss(sel, p.layout, (b) => ({
    "justify-content": b.align ? JUSTIFY[b.align] : undefined,
    "margin-top": b.margin?.top,
    "margin-bottom": b.margin?.bottom,
    "margin-left": b.margin?.left,
    "margin-right": b.margin?.right,
    order: b.order,
    translate: b.offsetX || b.offsetY ? `${b.offsetX || "0px"} ${b.offsetY || "0px"}` : undefined,
  }));
  css += responsiveCss(`${sel} > .lp-btn`, p.layout, (b) => ({
    ...boxDecls({ width: b.width, maxWidth: b.maxWidth, height: b.height, minHeight: b.minHeight, padding: b.padding, fontSize: b.fontSize, lineHeight: b.lineHeight, textAlign: b.textAlign }, { align: false, offsets: false }),
    width: b.align === "stretch" ? "100%" : b.width,
  }));
  if (p.variant === "custom" && p.colors) {
    css += rule(`${sel} > .lp-btn`, {
      "--b-bg": p.colors.background,
      "--b-color": p.colors.color,
      "--b-border": p.colors.border || p.colors.background,
      "--b-hover-bg": p.colors.hoverBackground,
      "--b-hover-color": p.colors.hoverColor,
    });
  }
  if (p.radius) css += rule(`${sel} > .lp-btn`, { "border-radius": p.radius });
  return css;
}

export function ButtonBlock(p: ButtonProps) {
  const s = getBlockStyle({ ...p, layout: undefined });
  const css = s.css + buttonCss(s.selector, p);
  const icon = p.icon ? <Icon name={p.icon} size={18} /> : null;
  const editing = isEditing(p);
  return (
    <div ref={rootRef(p)} className={`lp-btn-wrap ${s.className}`} {...s.attrs}>
      <StyleTag css={css + visibilityCss(s.selector, p.layout, editing)} />
      <a
        className={`lp-btn lp-btn-${p.variant ?? "primary"}`}
        {...linkProps(p.href, p.newTab)}
        aria-label={p.ariaLabel || undefined}
      >
        {p.iconPosition !== "right" ? icon : null}
        <span>{p.label}</span>
        {p.iconPosition === "right" ? icon : null}
      </a>
    </div>
  );
}

// ---------- Icono / lista / enlace ----------
export type IconProps = BlockProps<{ name: string; size: number; color: string; background: string; href: string; label: string }>;

export function IconBlock(p: IconProps) {
  const s = getBlockStyle(p);
  const size = Number(p.size) || 32;
  const inner = (
    <span
      className="lp-icon"
      style={{
        color: p.color || "var(--lp-color-accent)",
        background: p.background || undefined,
        borderRadius: p.background ? 999 : undefined,
        padding: p.background ? size * 0.4 : undefined,
      }}
      role={p.label ? "img" : undefined}
      aria-label={p.label || undefined}
    >
      <Icon name={p.name} size={size} />
    </span>
  );
  return (
    <div ref={rootRef(p)} className={s.className} style={{ display: "flex" }} {...s.attrs}>
      <StyleTag css={s.css} />
      {p.href ? <a {...linkProps(p.href)}>{inner}</a> : inner}
    </div>
  );
}

export type ListProps = BlockProps<{ items: { text: string; icon?: string }[]; style: "icon" | "bullet" | "numbered"; icon: string; iconColor: string }>;

export function ListBlock(p: ListProps) {
  const s = getBlockStyle(p);
  const items = p.items ?? [];
  const Tag = p.style === "numbered" ? "ol" : "ul";
  return (
    <Tag
      ref={rootRef(p) as never}
      className={`lp-list ${p.style === "numbered" ? "lp-list-numbered" : ""} ${s.className}`}
      style={{ ["--lp-list-icon" as string]: p.iconColor || undefined, listStyle: p.style === "bullet" ? "disc" : undefined, paddingLeft: p.style === "bullet" ? "1.3em" : undefined } as CSSProperties}
      {...s.attrs}
    >
      <StyleTag css={s.css} />
      {items.map((it, i) => (
        <li key={i} style={p.style === "bullet" ? { display: "list-item" } : undefined}>
          {p.style === "icon" ? <Icon name={it.icon || p.icon || "check"} size={18} /> : null}
          <span>{it.text}</span>
        </li>
      ))}
    </Tag>
  );
}

export type LinkProps = BlockProps<{ text: InlineText; href: string; newTab: boolean; underline: boolean }>;

export function LinkBlock(p: LinkProps) {
  const s = getBlockStyle(p);
  return (
    <div ref={rootRef(p)} className={s.className} {...s.attrs}>
      <StyleTag css={s.css} />
      <a className="lp-link" {...linkProps(p.href, p.newTab)} style={{ textDecoration: p.underline === false ? "none" : "underline" }}>
        {p.text}
      </a>
    </div>
  );
}
