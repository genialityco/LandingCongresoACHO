import type { Device, MediaRef } from "@/lib/model/types";

export type Sides = { top?: string; right?: string; bottom?: string; left?: string };

export type Anchor =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

/** Propiedades de caja configurables por dispositivo. Todo es opcional: lo no definido se hereda. */
export type BoxStyle = {
  width?: string;
  maxWidth?: string;
  minHeight?: string;
  height?: string;
  margin?: Sides;
  padding?: Sides;
  /** Alineación del bloque dentro de su contenedor. */
  align?: "start" | "center" | "end" | "stretch";
  textAlign?: "left" | "center" | "right" | "justify";
  fontSize?: string;
  lineHeight?: string;
  gap?: string;
  columns?: number;
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  justify?: "start" | "center" | "end" | "space-between" | "space-around";
  alignItems?: "start" | "center" | "end" | "stretch";
  wrap?: boolean;
  /** Posicionamiento dentro de un contenedor con superposición. */
  anchor?: Anchor;
  offsetX?: string;
  offsetY?: string;
  zIndex?: number;
  order?: number;
  hidden?: boolean;
};

/** Desktop es la base; tablet y mobile solo guardan diferencias (overrides). */
export type ResponsiveBox = Partial<Record<Device, BoxStyle>>;

export type Appearance = {
  background?: string;
  color?: string;
  fontFamily?: "inherit" | "primary" | "secondary";
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
  letterSpacing?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  border?: { width?: string; style?: "solid" | "dashed" | "dotted" | "none"; color?: string; radius?: string };
  shadow?: "none" | "sm" | "md" | "lg" | "xl" | "theme";
  opacity?: number;
  hover?: { background?: string; color?: string; lift?: boolean };
  animation?: { type: "none" | "fade-in" | "slide-up" | "slide-left" | "zoom-in"; duration?: number; delay?: number };
  /** id HTML para enlaces de anclaje (#seccion). */
  anchorId?: string;
};

export type VideoSource = {
  source: "storage" | "youtube" | "vimeo" | "url";
  media?: MediaRef | null;
  url?: string;
};

export type FocalPoint = { x: number; y: number };

export type Background = {
  type: "none" | "color" | "gradient" | "image" | "video";
  color?: string;
  gradient?: string;
  image?: MediaRef | null;
  mobileImage?: MediaRef | null;
  video?: VideoSource;
  poster?: MediaRef | null;
  /** En mobile muestra el póster en vez del video (ahorra datos). */
  videoOnMobile?: boolean;
  fit?: "cover" | "contain" | "auto";
  position?: Partial<Record<Device, FocalPoint>>;
  fixed?: boolean;
  overlay?: { enabled: boolean; color: string; opacity: number; gradient?: string };
};

export type BaseBlockProps = {
  id: string;
  layout?: ResponsiveBox;
  appearance?: Appearance;
};
