import { BREAKPOINTS, type Device } from "@/lib/model/types";
import type { Anchor, Appearance, BoxStyle, ResponsiveBox, Sides } from "./types";

export type Decls = Record<string, string | number | undefined | null>;

/** Neutraliza valores CSS escritos por el usuario: impide cerrar reglas o salir del <style>. */
export function cssValue(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).replace(/[<>{};\\]/g, "").replace(/\/\*/g, "").trim();
  return s ? s.slice(0, 300) : undefined;
}

export function cssClassFor(id: string) {
  return `lp-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function declsToString(decls: Decls): string {
  return Object.entries(decls)
    .map(([k, v]) => [k, cssValue(v)] as const)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

export function rule(selector: string, decls: Decls): string {
  const body = declsToString(decls);
  return body ? `${selector}{${body}}` : "";
}

/** Media queries desktop-first: tablet y mobile heredan por cascada lo no redefinido. */
export const MEDIA: Record<Device, string | null> = {
  desktop: null,
  tablet: `@media (max-width:${BREAKPOINTS.tablet}px)`,
  mobile: `@media (max-width:${BREAKPOINTS.mobile}px)`,
};

/** Rangos exclusivos por dispositivo (visibilidad: no hereda). */
export const MEDIA_ONLY: Record<Device, string> = {
  desktop: `@media (min-width:${BREAKPOINTS.tablet + 1}px)`,
  tablet: `@media (min-width:${BREAKPOINTS.mobile + 1}px) and (max-width:${BREAKPOINTS.tablet}px)`,
  mobile: `@media (max-width:${BREAKPOINTS.mobile}px)`,
};

export function wrapMedia(device: Device, css: string) {
  if (!css) return "";
  const m = MEDIA[device];
  return m ? `${m}{${css}}` : css;
}

/** Genera CSS responsive para un selector aplicando `toDecls` a cada dispositivo. */
export function responsiveCss<T>(
  selector: string,
  values: Partial<Record<Device, T>> | undefined,
  toDecls: (value: T, device: Device) => Decls,
): string {
  if (!values) return "";
  return (["desktop", "tablet", "mobile"] as Device[])
    .map((d) => (values[d] ? wrapMedia(d, rule(selector, toDecls(values[d] as T, d))) : ""))
    .join("");
}

function sides(prefix: "margin" | "padding", s?: Sides): Decls {
  if (!s) return {};
  return {
    [`${prefix}-top`]: s.top,
    [`${prefix}-right`]: s.right,
    [`${prefix}-bottom`]: s.bottom,
    [`${prefix}-left`]: s.left,
  };
}

const FLEX: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  "space-between": "space-between",
  "space-around": "space-around",
};

/** Alineación del propio bloque (funciona dentro de flex y de flujo normal). */
export function selfAlignDecls(align?: BoxStyle["align"]): Decls {
  switch (align) {
    case "start":
      return { "align-self": "flex-start", "margin-left": "0", "margin-right": "auto" };
    case "center":
      return { "align-self": "center", "margin-left": "auto", "margin-right": "auto" };
    case "end":
      return { "align-self": "flex-end", "margin-left": "auto", "margin-right": "0" };
    case "stretch":
      return { "align-self": "stretch", width: "100%" };
    default:
      return {};
  }
}

/** Posición anclada relativa al contenedor; los desplazamientos en % son relativos al contenedor. */
export function anchorDecls(anchor: Anchor, offsetX = "0px", offsetY = "0px"): Decls {
  const [v, h] = anchor === "center" ? ["center", "center"] : anchor.split("-");
  const x = offsetX || "0px";
  const y = offsetY || "0px";
  return {
    position: "absolute",
    left: h === "left" ? x : h === "center" ? `calc(50% + ${x})` : "auto",
    right: h === "right" ? `calc(-1 * ${x})` : "auto",
    top: v === "top" ? y : v === "center" ? `calc(50% + ${y})` : "auto",
    bottom: v === "bottom" ? `calc(-1 * ${y})` : "auto",
    translate: `${h === "center" ? "-50%" : "0"} ${v === "center" ? "-50%" : "0"}`,
  };
}

/** Declaraciones de caja comunes (dimensiones, espaciado, texto, desplazamiento). */
export function boxDecls(s: BoxStyle, opts: { align?: boolean; offsets?: boolean } = {}): Decls {
  const d: Decls = {
    width: s.width,
    "max-width": s.maxWidth,
    "min-height": s.minHeight,
    height: s.height,
    ...sides("margin", s.margin),
    ...sides("padding", s.padding),
    "text-align": s.textAlign,
    "font-size": s.fontSize,
    "line-height": s.lineHeight,
    order: s.order,
    "z-index": s.zIndex,
  };
  if (opts.align !== false) Object.assign(d, selfAlignDecls(s.align));
  if (opts.offsets !== false && !s.anchor && (s.offsetX || s.offsetY)) {
    d.translate = `${s.offsetX || "0px"} ${s.offsetY || "0px"}`;
  }
  return d;
}

/** Declaraciones de layout de contenedores flex/grid. */
export function flexDecls(s: BoxStyle): Decls {
  return {
    gap: s.gap,
    "flex-direction": s.direction,
    "justify-content": s.justify ? FLEX[s.justify] : undefined,
    "align-items": s.alignItems ? FLEX[s.alignItems] : undefined,
    "flex-wrap": s.wrap === undefined ? undefined : s.wrap ? "wrap" : "nowrap",
  };
}

export function gridDecls(s: BoxStyle): Decls {
  return {
    gap: s.gap,
    "grid-template-columns": s.columns ? `repeat(${Math.max(1, Math.min(12, Math.round(s.columns)))}, minmax(0, 1fr))` : undefined,
    "align-items": s.alignItems ? FLEX[s.alignItems] : undefined,
  };
}

const SHADOWS: Record<string, string> = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,.12)",
  md: "0 6px 16px rgba(0,0,0,.12)",
  lg: "0 14px 34px rgba(0,0,0,.16)",
  xl: "0 24px 60px rgba(0,0,0,.22)",
  theme: "var(--lp-shadow)",
};

export function appearanceDecls(a?: Appearance): Decls {
  if (!a) return {};
  return {
    background: a.background,
    color: a.color,
    "font-family": a.fontFamily && a.fontFamily !== "inherit" ? `var(--lp-font-${a.fontFamily})` : undefined,
    "font-weight": a.fontWeight,
    "font-style": a.fontStyle,
    "letter-spacing": a.letterSpacing,
    "text-transform": a.textTransform,
    "border-width": a.border?.width,
    "border-style": a.border?.width ? a.border?.style ?? "solid" : a.border?.style,
    "border-color": a.border?.color,
    "border-radius": a.border?.radius,
    "box-shadow": a.shadow ? SHADOWS[a.shadow] : undefined,
    opacity: a.opacity,
  };
}

export type BlockCssOptions = {
  /** Selector del elemento que recibe las dimensiones (por defecto el bloque). */
  innerSelector?: string;
  container?: "flex" | "grid";
  isEditing?: boolean;
  /** Propiedades de caja que el bloque gestiona por su cuenta. */
  omit?: (keyof BoxStyle)[];
};

/** Visibilidad por dispositivo. En el editor el bloque oculto se atenúa en lugar de desaparecer. */
export function visibilityCss(selector: string, layout?: ResponsiveBox, isEditing?: boolean): string {
  if (!layout) return "";
  return (["desktop", "tablet", "mobile"] as Device[])
    .filter((d) => layout[d]?.hidden)
    .map((d) =>
      `${MEDIA_ONLY[d]}{${selector}{${
        isEditing ? "opacity:.35;outline:2px dashed #f59e0b;outline-offset:-2px" : "display:none!important"
      }}}`,
    )
    .join("");
}

/** CSS completo de un bloque: caja responsive + apariencia + hover + visibilidad. */
export function blockCss(id: string, layout: ResponsiveBox | undefined, appearance: Appearance | undefined, opts: BlockCssOptions = {}): string {
  const sel = `.${cssClassFor(id)}`;
  const inner = opts.innerSelector ? `${sel} ${opts.innerSelector}` : sel;
  let css = rule(sel, appearanceDecls(appearance));
  css += responsiveCss(inner, layout, (raw) => {
    const s = { ...raw };
    for (const k of opts.omit ?? []) delete s[k];
    return {
    ...boxDecls(s),
    ...(opts.container === "flex" ? flexDecls(s) : {}),
    ...(opts.container === "grid" ? gridDecls(s) : {}),
    };
  });
  if (appearance?.hover && (appearance.hover.background || appearance.hover.color || appearance.hover.lift)) {
    css += rule(`${sel}:hover`, {
      background: appearance.hover.background,
      color: appearance.hover.color,
      transform: appearance.hover.lift ? "translateY(-4px)" : undefined,
    });
    css += rule(sel, { transition: "background .2s ease, color .2s ease, transform .2s ease" });
  }
  css += visibilityCss(sel, layout, opts.isEditing);
  return css;
}

/** Atributos de animación de entrada (los activa AnimationObserver en la landing pública). */
export function animationAttrs(a?: Appearance): Record<string, string> {
  const anim = a?.animation;
  if (!anim || anim.type === "none") return {};
  return {
    "data-anim": anim.type,
    style: `--lp-anim-duration:${Number(anim.duration ?? 700)}ms;--lp-anim-delay:${Number(anim.delay ?? 0)}ms`,
  };
}
