import type { CSSProperties, ReactNode } from "react";
import sanitizeHtml from "sanitize-html";
import type { MediaRef } from "@/lib/model/types";
import { animationAttrs, blockCss, cssClassFor, cssValue, responsiveCss, rule, MEDIA, type BlockCssOptions } from "../styles/css";
import type { Background, BaseBlockProps } from "../styles/types";
import { BgVideo } from "./client/BgVideo";

/** Componente de slot: Puck lo provee en el editor y PageRenderer en la landing pública. */
export type SlotRender = (props?: { className?: string; style?: CSSProperties; minEmptyHeight?: number; allow?: string[] }) => ReactNode;

export type PuckRenderContext = { isEditing?: boolean; dragRef?: ((el: Element | null) => void) | null };

/** Ref que Puck necesita en el elemento raíz de los bloques `inline`. */
export function rootRef(props: { puck?: PuckRenderContext }) {
  return props.puck?.dragRef ?? undefined;
}

export type BlockProps<P = object> = BaseBlockProps & P & { puck?: PuckRenderContext; editMode?: boolean };

/** Texto que en el editor puede llegar como nodo editable en línea. */
export type InlineText = string | ReactNode;

export function isEditing(props: { puck?: PuckRenderContext }) {
  return !!props.puck?.isEditing;
}

export function StyleTag({ css }: { css: string }) {
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/** Clases, CSS y atributos comunes de un bloque. */
export function getBlockStyle(props: BlockProps, opts: BlockCssOptions = {}, extraCss = "") {
  const className = cssClassFor(props.id);
  const css = blockCss(props.id, props.layout, props.appearance, { ...opts, isEditing: isEditing(props) }) + extraCss;
  const anim = animationAttrs(props.appearance);
  const attrs: Record<string, unknown> = {};
  if (props.appearance?.anchorId) attrs.id = cssValue(props.appearance.anchorId)?.replace(/[^a-zA-Z0-9_-]/g, "");
  if (anim["data-anim"] && !isEditing(props)) {
    attrs["data-anim"] = anim["data-anim"];
    const [d, delay] = anim.style.split(";");
    attrs.style = {
      ["--lp-anim-duration" as string]: d.split(":")[1],
      ["--lp-anim-delay" as string]: delay.split(":")[1],
    } as CSSProperties;
  }
  return { className, css, attrs, selector: `.${className}` };
}

// ---------- Enlaces y HTML seguros ----------
export function safeHref(href?: string | null): string | undefined {
  if (!href) return undefined;
  const h = String(href).trim();
  if (/^(https?:|mailto:|tel:)/i.test(h) || h.startsWith("/") || h.startsWith("#")) return h;
  if (/^[a-z0-9-]+(\/.*)?$/i.test(h) && !h.includes(":")) return `/${h}`;
  return undefined;
}

export function linkProps(href?: string, newTab?: boolean) {
  const safe = safeHref(href);
  return {
    href: safe ?? "#",
    ...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {}),
  };
}

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "code", "pre", "hr", "span"],
  allowedAttributes: { a: ["href", "target", "rel"], "*": ["style"] },
  allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
};

export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, SANITIZE);
}

/** Renderiza texto enriquecido: string HTML (saneado) o nodo editable del editor. */
export function RichContent({ value, className }: { value: unknown; className?: string }) {
  if (typeof value === "string") {
    return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />;
  }
  return <div className={className}>{value as ReactNode}</div>;
}

// ---------- Multimedia ----------
export function mediaUrl(ref?: MediaRef | null): string | undefined {
  return ref?.url || undefined;
}

export function Img({
  media,
  alt,
  className,
  style,
  eager,
  thumb,
}: {
  media?: MediaRef | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
  thumb?: boolean;
}) {
  const src = thumb ? media?.thumbUrl || media?.url : media?.url;
  if (!src) return <div className={`${className ?? ""} lp-img-empty`} style={{ background: "var(--lp-color-surface)", minHeight: 120, ...style }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? media?.alt ?? ""}
      width={media?.width}
      height={media?.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : undefined}
      className={className}
      style={style}
    />
  );
}

/** YouTube / Vimeo → URL de embed. Devuelve null si no se reconoce. */
export function parseEmbed(url?: string): { provider: "youtube" | "vimeo"; id: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/);
  if (yt) return { provider: "youtube", id: yt[1] };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d{5,12})/);
  if (vm) return { provider: "vimeo", id: vm[1] };
  return null;
}

export function embedUrl(e: { provider: "youtube" | "vimeo"; id: string }, opts: { autoplay?: boolean; muted?: boolean; loop?: boolean; controls?: boolean; background?: boolean }) {
  if (e.provider === "youtube") {
    const p = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      autoplay: opts.autoplay ? "1" : "0",
      mute: opts.muted ? "1" : "0",
      controls: opts.controls === false || opts.background ? "0" : "1",
    });
    if (opts.loop) {
      p.set("loop", "1");
      p.set("playlist", e.id);
    }
    return `https://www.youtube-nocookie.com/embed/${e.id}?${p}`;
  }
  const p = new URLSearchParams({
    autoplay: opts.autoplay ? "1" : "0",
    muted: opts.muted ? "1" : "0",
    loop: opts.loop ? "1" : "0",
    ...(opts.background ? { background: "1" } : {}),
  });
  return `https://player.vimeo.com/video/${e.id}?${p}`;
}

// ---------- Fondo + overlay ----------
export function backgroundCss(selector: string, bg?: Background): string {
  if (!bg) return "";
  let css = "";
  if (bg.type === "color") css += rule(selector, { background: bg.color });
  if (bg.type === "gradient") css += rule(selector, { background: bg.gradient });
  css += responsiveCss(`${selector} > .lp-bg img`, bg.position, (p) => ({
    "object-position": `${Number(p.x ?? 50)}% ${Number(p.y ?? 50)}%`,
  }));
  if (bg.fit && bg.fit !== "cover") {
    css += rule(`${selector} > .lp-bg img, ${selector} > .lp-bg video`, { "object-fit": bg.fit === "auto" ? "none" : bg.fit });
  }
  if (bg.fixed) css += rule(`${selector} > .lp-bg img`, { position: "fixed", inset: "0", height: "100vh" });
  if (bg.type === "video" && bg.videoOnMobile === false) {
    css += `${MEDIA.mobile}{${selector} > .lp-bg .lp-bg-video-el{display:none}${selector} > .lp-bg .lp-bg-poster{display:block!important}}`;
  }
  if (bg.mobileImage?.url) {
    css += `${MEDIA.mobile}{${selector} > .lp-bg .lp-bg-desktop{display:none}${selector} > .lp-bg .lp-bg-mobile{display:block!important}}`;
  }
  return css;
}

export function BackgroundLayer({ bg, isEditing: editing }: { bg?: Background; isEditing?: boolean }) {
  if (!bg || bg.type === "none") return null;
  const overlay = bg.overlay?.enabled ? (
    <div
      className="lp-overlay"
      aria-hidden
      style={{
        background: bg.overlay.gradient || bg.overlay.color,
        opacity: Math.max(0, Math.min(1, Number(bg.overlay.opacity ?? 0.5))),
      }}
    />
  ) : null;
  let media: ReactNode = null;
  if (bg.type === "image") {
    media = (
      <>
        <Img media={bg.image} alt="" className="lp-bg-desktop" eager />
        {bg.mobileImage?.url ? <Img media={bg.mobileImage} alt="" className="lp-bg-mobile" style={{ display: "none" }} /> : null}
      </>
    );
  }
  if (bg.type === "video" && bg.video) {
    const embed = bg.video.source === "youtube" || bg.video.source === "vimeo" ? parseEmbed(bg.video.url) : null;
    const src = bg.video.source === "storage" ? bg.video.media?.url : bg.video.source === "url" ? bg.video.url : undefined;
    media = (
      <>
        {embed ? (
          editing ? (
            <Img media={bg.poster} alt="" className="lp-bg-video-el" />
          ) : (
            <iframe
              className="lp-bg-embed lp-bg-video-el"
              src={embedUrl(embed, { autoplay: true, muted: true, loop: true, background: true })}
              title="Video de fondo"
              allow="autoplay; encrypted-media; picture-in-picture"
              tabIndex={-1}
              aria-hidden
              loading="lazy"
            />
          )
        ) : src ? (
          <BgVideo src={src} poster={bg.poster?.url} className="lp-bg-video-el" />
        ) : null}
        {bg.poster?.url ? (
          <Img media={bg.poster} alt="" className="lp-bg-poster" style={embed || src ? { display: "none" } : undefined} eager />
        ) : null}
      </>
    );
  }
  if (!media && !overlay) return null;
  return (
    <>
      {media ? (
        <div className="lp-bg" aria-hidden>
          {media}
        </div>
      ) : null}
      {overlay}
    </>
  );
}

export const DEFAULT_OVERLAY = { enabled: false, color: "#000000", opacity: 0.45 };
