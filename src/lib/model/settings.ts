import type { MediaRef } from "./types";

export type ResponsiveValue<T> = { desktop: T; tablet?: T; mobile?: T };

export type HeadingStyle = {
  size: ResponsiveValue<string>;
  weight: number;
  lineHeight: string;
  letterSpacing: string;
};

export type ButtonVariantStyle = {
  background: string;
  color: string;
  border: string;
  hoverBackground: string;
  hoverColor: string;
};

export type ThemeSettings = {
  fonts: { primary: string; secondary: string };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    muted: string;
    background: string;
    surface: string;
    border: string;
  };
  headings: Record<"h1" | "h2" | "h3" | "h4" | "h5" | "h6", HeadingStyle>;
  body: { size: ResponsiveValue<string>; lineHeight: string; weight: number };
  layout: {
    containerMaxWidth: string;
    sectionPaddingY: ResponsiveValue<string>;
    gutter: ResponsiveValue<string>;
    radius: string;
    shadow: string;
  };
  buttons: {
    radius: string;
    paddingY: string;
    paddingX: string;
    fontSize: string;
    fontWeight: number;
    primary: ButtonVariantStyle;
    secondary: ButtonVariantStyle;
    outline: ButtonVariantStyle;
  };
};

export type DeviceVisibility = { desktop: boolean; tablet: boolean; mobile: boolean };

export type NavLink = {
  id: string;
  label: string;
  href: string;
  newTab: boolean;
  /** Se muestra subrayado cuando ningún otro enlace coincide con la sección actual. */
  highlight?: boolean;
  children: { id: string; label: string; href: string; newTab: boolean }[];
};

export type NavButton = {
  id: string;
  label: string;
  href: string;
  variant: "primary" | "secondary" | "outline";
  /** Colores propios (vacío = los del tema para la variante). */
  background?: string;
  color?: string;
};

export type NavbarSettings = {
  enabled: boolean;
  style: "solid" | "transparent";
  sticky: boolean;
  logo: MediaRef | null;
  logoText: string;
  logoHeight: ResponsiveValue<string>;
  links: NavLink[];
  buttons: NavButton[];
  colors: { background: string; text: string; hover: string; transparentText: string };
  fontFamily: "primary" | "secondary";
  fontSize: string;
  fontWeight: number;
  paddingY: string;
  gap: string;
  maxWidth: string;
  /** Dispositivo a partir del cual se colapsan los enlaces. */
  collapseAt: "tablet" | "mobile";
  mobileMenu: "dropdown" | "drawer";
  visibility: DeviceVisibility;
};

export type SidebarSettings = {
  enabled: boolean;
  position: "left" | "right";
  width: string;
  logo: MediaRef | null;
  title: string;
  links: NavLink[];
  colors: { background: string; text: string; hover: string };
  /** En tablet/mobile: drawer con botón flotante o ocultar. */
  mobileBehavior: "drawer" | "hidden";
  visibility: DeviceVisibility;
};

export type FooterColumn = {
  id: string;
  title: string;
  links: { id: string; label: string; href: string; newTab: boolean }[];
};

export type FooterSettings = {
  enabled: boolean;
  logo: MediaRef | null;
  about: string;
  columns: FooterColumn[];
  social: { id: string; network: string; url: string }[];
  copyright: string;
  colors: { background: string; text: string; muted: string; link: string };
  paddingY: string;
  maxWidth: string;
  visibility: DeviceVisibility;
  /** Imagen de fondo con capa de color encima. */
  background: { image: MediaRef | null; overlayColor: string; overlayOpacity: number };
  logoHeight: ResponsiveValue<string>;
  /** Tamaño de los enlaces de las columnas. */
  linkSize: string;
  socialStyle: { variant: "soft" | "circle"; background: string; color: string };
  newsletter: {
    enabled: boolean;
    title: string;
    text: string;
    placeholder: string;
    buttonLabel: string;
    successMessage: string;
    borderColor: string;
    buttonBackground: string;
    buttonColor: string;
  };
  /** Enlaces legales de la barra inferior (a la izquierda del copyright). */
  legalLinks: { id: string; label: string; href: string; newTab: boolean }[];
};

export type SiteSettings = {
  siteName: string;
  homeSlug: string;
  favicon: MediaRef | null;
  language: string;
};

export type GlobalSettings = {
  theme: ThemeSettings;
  navbar: NavbarSettings;
  sidebar: SidebarSettings;
  footer: FooterSettings;
  site: SiteSettings;
};

export type SettingsKey = keyof GlobalSettings;
export const SETTINGS_KEYS: SettingsKey[] = ["theme", "navbar", "sidebar", "footer", "site"];

const allDevices: DeviceVisibility = { desktop: true, tablet: true, mobile: true };

/**
 * Valores estructurales mínimos usados como respaldo cuando un documento de ajustes
 * todavía no existe en Firestore. No contienen contenido de marca: textos vacíos y
 * colores neutros. El contenido real se administra desde el panel.
 */
export const EMPTY_SETTINGS: GlobalSettings = {
  theme: {
    fonts: { primary: "Inter", secondary: "Inter" },
    colors: {
      primary: "#111827",
      secondary: "#374151",
      accent: "#2563eb",
      text: "#111827",
      muted: "#6b7280",
      background: "#ffffff",
      surface: "#f9fafb",
      border: "#e5e7eb",
    },
    headings: {
      h1: { size: { desktop: "56px", tablet: "44px", mobile: "34px" }, weight: 800, lineHeight: "1.1", letterSpacing: "-0.02em" },
      h2: { size: { desktop: "40px", tablet: "34px", mobile: "28px" }, weight: 700, lineHeight: "1.2", letterSpacing: "-0.01em" },
      h3: { size: { desktop: "28px", tablet: "24px", mobile: "22px" }, weight: 700, lineHeight: "1.3", letterSpacing: "0" },
      h4: { size: { desktop: "22px", mobile: "20px" }, weight: 600, lineHeight: "1.35", letterSpacing: "0" },
      h5: { size: { desktop: "18px" }, weight: 600, lineHeight: "1.4", letterSpacing: "0" },
      h6: { size: { desktop: "16px" }, weight: 600, lineHeight: "1.4", letterSpacing: "0.02em" },
    },
    body: { size: { desktop: "17px", mobile: "16px" }, lineHeight: "1.65", weight: 400 },
    layout: {
      containerMaxWidth: "1200px",
      sectionPaddingY: { desktop: "96px", tablet: "72px", mobile: "56px" },
      gutter: { desktop: "32px", mobile: "16px" },
      radius: "12px",
      shadow: "0 10px 30px rgba(0,0,0,0.08)",
    },
    buttons: {
      radius: "10px",
      paddingY: "14px",
      paddingX: "26px",
      fontSize: "16px",
      fontWeight: 600,
      primary: { background: "#2563eb", color: "#ffffff", border: "#2563eb", hoverBackground: "#1d4ed8", hoverColor: "#ffffff" },
      secondary: { background: "#111827", color: "#ffffff", border: "#111827", hoverBackground: "#374151", hoverColor: "#ffffff" },
      outline: { background: "transparent", color: "#111827", border: "#111827", hoverBackground: "#111827", hoverColor: "#ffffff" },
    },
  },
  navbar: {
    enabled: false,
    style: "solid",
    sticky: true,
    logo: null,
    logoText: "",
    logoHeight: { desktop: "40px", mobile: "32px" },
    links: [],
    buttons: [],
    colors: { background: "#ffffff", text: "#111827", hover: "#2563eb", transparentText: "#ffffff" },
    fontFamily: "primary",
    fontSize: "15px",
    fontWeight: 500,
    paddingY: "16px",
    gap: "28px",
    maxWidth: "1200px",
    collapseAt: "tablet",
    mobileMenu: "drawer",
    visibility: allDevices,
  },
  sidebar: {
    enabled: false,
    position: "left",
    width: "260px",
    logo: null,
    title: "",
    links: [],
    colors: { background: "#111827", text: "#e5e7eb", hover: "#ffffff" },
    mobileBehavior: "drawer",
    visibility: allDevices,
  },
  footer: {
    enabled: false,
    logo: null,
    about: "",
    columns: [],
    social: [],
    copyright: "",
    colors: { background: "#0b1120", text: "#e5e7eb", muted: "#94a3b8", link: "#ffffff" },
    paddingY: "64px",
    maxWidth: "1200px",
    visibility: allDevices,
    background: { image: null, overlayColor: "#0b1120", overlayOpacity: 0.85 },
    logoHeight: { desktop: "40px" },
    linkSize: "",
    socialStyle: { variant: "soft", background: "#ffffff", color: "#0b1120" },
    newsletter: {
      enabled: false,
      title: "",
      text: "",
      placeholder: "Tu email",
      buttonLabel: "Suscribirme",
      successMessage: "¡Gracias por suscribirte!",
      borderColor: "rgba(255,255,255,0.85)",
      buttonBackground: "",
      buttonColor: "",
    },
    legalLinks: [],
  },
  site: { siteName: "", homeSlug: "", favicon: null, language: "es" },
};

/** Mezcla profunda de un documento parcial de Firestore sobre los valores estructurales. */
export function withDefaults<K extends SettingsKey>(key: K, value: unknown): GlobalSettings[K] {
  return deepMerge(EMPTY_SETTINGS[key], value) as GlobalSettings[K];
}

function deepMerge(base: unknown, value: unknown): unknown {
  if (value === undefined || value === null) return base;
  if (Array.isArray(base) || Array.isArray(value)) return value;
  if (typeof base === "object" && base && typeof value === "object") {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepMerge((base as Record<string, unknown>)[k], v);
    }
    return out;
  }
  return value;
}
