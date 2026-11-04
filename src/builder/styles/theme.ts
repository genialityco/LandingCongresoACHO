import type { ButtonVariantStyle, ResponsiveValue, ThemeSettings } from "@/lib/model/settings";
import { cssValue, declsToString, responsiveCss, rule } from "./css";

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/** Fuentes del sistema que no se descargan de Google Fonts. */
const SYSTEM_FONTS = new Set(["system-ui", "serif", "sans-serif", "monospace", "Georgia", "Arial", "Helvetica"]);

export function fontStack(name: string) {
  const safe = cssValue(name)?.replace(/["']/g, "") ?? "system-ui";
  return SYSTEM_FONTS.has(safe) ? `${safe}, system-ui, sans-serif` : `"${safe}", system-ui, sans-serif`;
}

/** URL de Google Fonts para las fuentes del tema (se carga con display=swap). */
export function googleFontsHref(theme: ThemeSettings): string | null {
  const families = [...new Set([theme.fonts.primary, theme.fonts.secondary])]
    .map((f) => f?.trim())
    .filter((f): f is string => !!f && !SYSTEM_FONTS.has(f) && /^[A-Za-z0-9 ]{2,60}$/.test(f));
  if (!families.length) return null;
  const q = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800`).join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

function variantVars(name: string, v: ButtonVariantStyle) {
  return {
    [`--lp-btn-${name}-bg`]: v.background,
    [`--lp-btn-${name}-color`]: v.color,
    [`--lp-btn-${name}-border`]: v.border,
    [`--lp-btn-${name}-hover-bg`]: v.hoverBackground,
    [`--lp-btn-${name}-hover-color`]: v.hoverColor,
  };
}

function rv(value: ResponsiveValue<string>) {
  return value;
}

/**
 * CSS del tema global como variables en `.lp-root`. Todos los bloques heredan de estas
 * variables, así que un cambio global se refleja en todos salvo que haya override.
 */
export function themeCss(theme: ThemeSettings, scope = ".lp-root"): string {
  const t = theme;
  const vars = {
    "--lp-font-primary": fontStack(t.fonts.primary),
    "--lp-font-secondary": fontStack(t.fonts.secondary),
    "--lp-color-primary": t.colors.primary,
    "--lp-color-secondary": t.colors.secondary,
    "--lp-color-accent": t.colors.accent,
    "--lp-color-text": t.colors.text,
    "--lp-color-muted": t.colors.muted,
    "--lp-color-bg": t.colors.background,
    "--lp-color-surface": t.colors.surface,
    "--lp-color-border": t.colors.border,
    "--lp-container": t.layout.containerMaxWidth,
    "--lp-radius": t.layout.radius,
    "--lp-shadow": t.layout.shadow,
    "--lp-body-line": t.body.lineHeight,
    "--lp-body-weight": t.body.weight,
    "--lp-btn-radius": t.buttons.radius,
    "--lp-btn-py": t.buttons.paddingY,
    "--lp-btn-px": t.buttons.paddingX,
    "--lp-btn-size": t.buttons.fontSize,
    "--lp-btn-weight": t.buttons.fontWeight,
    ...variantVars("primary", t.buttons.primary),
    ...variantVars("secondary", t.buttons.secondary),
    ...variantVars("outline", t.buttons.outline),
    ...Object.fromEntries(
      HEADINGS.flatMap((h) => [
        [`--lp-${h}-weight`, t.headings[h].weight],
        [`--lp-${h}-line`, t.headings[h].lineHeight],
        [`--lp-${h}-ls`, t.headings[h].letterSpacing],
      ]),
    ),
  };
  let css = `${scope}{${declsToString(vars)}}`;
  // Valores responsive como variables por breakpoint.
  css += responsiveCss(scope, rv(t.body.size), (v) => ({ "--lp-body-size": v }));
  css += responsiveCss(scope, rv(t.layout.sectionPaddingY), (v) => ({ "--lp-section-py": v }));
  css += responsiveCss(scope, rv(t.layout.gutter), (v) => ({ "--lp-gutter": v }));
  for (const h of HEADINGS) {
    css += responsiveCss(scope, rv(t.headings[h].size), (v) => ({ [`--lp-${h}-size`]: v }));
  }
  // :where() deja la especificidad en 0 para que los estilos de cada bloque tengan prioridad.
  css += rule(`:where(${scope}) :is(h1,h2,h3,h4,h5,h6)`, {
    "font-family": "var(--lp-font-secondary)",
  });
  return css;
}
