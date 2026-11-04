"use client";

import type { ComponentConfig, Config, CustomField, Field, Fields } from "@puckeditor/core";
import type { ReactNode } from "react";
import type { ReactElement } from "react";
import { MediaField } from "@/components/admin/media/MediaField";
import type { Device, MediaRef } from "@/lib/model/types";
import type { ContentPosition } from "../blocks/advanced";
import type { ButtonColors } from "../blocks/content";
import type { ComponentNode } from "@/lib/serialization/page-data";
import { BLOCKS, type BlockType } from "../schema";
import { REGISTRY } from "../registry";
import { ICON_OPTIONS } from "../icons";
import { RenderNode } from "../render/PageRenderer";
import { LandingShell, type PageLayoutOverrides } from "../site/LandingShell";
import type { Appearance, Background, ResponsiveBox, VideoSource } from "../styles/types";
import { useEditorContext } from "./context";
import { ResponsiveField, type ResponsiveGroup } from "./fields/ResponsiveField";
import { AppearanceField, BackgroundField, ButtonColorsField, ContentPositionField, VideoSourceField, type AppearanceGroup } from "./fields/StyleFields";

// ---------- Fábricas de campos ----------
type FieldRenderArgs<T> = { value: T; onChange: (v: T) => void; readOnly?: boolean };

// Puck tipa los campos por props; aquí se relaja para reutilizar los controles personalizados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyField = Field<any>;

function custom<T>(label: string, render: (a: FieldRenderArgs<T>) => ReactElement): AnyField {
  const field: CustomField<T> = { type: "custom", label, render: ({ value, onChange, readOnly }) => render({ value, onChange, readOnly }) };
  return field as unknown as AnyField;
}

const layoutField = (groups: ResponsiveGroup[], label?: string) =>
  custom<ResponsiveBox>("Diseño responsive", (a) => <ResponsiveField {...a} groups={groups} label={label} />);

const appearanceField = (groups?: AppearanceGroup[]) => custom<Appearance>("Estilo", (a) => <AppearanceField {...a} groups={groups} />);

const mediaField = (label: string, kinds: ("image" | "video" | "document")[] = ["image"]) =>
  custom<MediaRef | null>(label, (a) => (
    <div className="space-y-1">
      <div className="text-xs font-semibold">{label}</div>
      <MediaField value={a.value} onChange={a.onChange} kinds={kinds} readOnly={a.readOnly} />
    </div>
  ));

const backgroundField = (types?: Background["type"][]) => custom<Background>("Fondo", (a) => <BackgroundField {...a} types={types} />);

const videoField = custom<VideoSource>("Fuente del video", (a) => (
  <div className="space-y-1">
    <div className="text-xs font-semibold">Fuente del video</div>
    <VideoSourceField {...a} />
  </div>
));

const text = (label: string, inline = false): AnyField => ({ type: "text", label, contentEditable: inline });
const textarea = (label: string, inline = false): AnyField => ({ type: "textarea", label, contentEditable: inline });
const toggle = (label: string): AnyField => ({
  type: "radio",
  label,
  options: [
    { label: "Sí", value: true },
    { label: "No", value: false },
  ],
});
const select = (label: string, options: [string, string][]): AnyField => ({ type: "select", label, options: options.map(([value, l]) => ({ value, label: l })) });

const BTN_VARIANTS: [string, string][] = [
  ["primary", "Primario (tema)"],
  ["secondary", "Secundario (tema)"],
  ["outline", "Contorno (tema)"],
  ["link", "Enlace"],
  ["custom", "Personalizado"],
];

const BOX: ResponsiveGroup[] = ["size", "spacing", "align", "position", "visibility"];
const TEXT_BOX: ResponsiveGroup[] = ["spacing", "align", "text", "size", "position", "visibility"];

/** Atajo: componente inline (sin envoltorio extra en el lienzo) que usa el render compartido. */
function block(type: Exclude<BlockType, "SharedBlock">, cfg: { fields: Record<string, AnyField>; defaultProps: Record<string, unknown> }): ComponentConfig {
  const Render = REGISTRY[type];
  return {
    label: BLOCKS[type].label,
    inline: true,
    fields: cfg.fields as Fields,
    defaultProps: cfg.defaultProps as Record<string, unknown>,
    render: (props: Record<string, unknown>) => <Render {...props} />,
  };
}

const DEFAULT_OVERLAY = { enabled: true, color: "#000000", opacity: 0.5 };

// ---------- Fecha del contador ----------
/** Muestra la fecha en hora local del editor y la guarda en ISO (UTC). */
function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const dateTimeField = (label: string) =>
  custom<string>(label, ({ value, onChange, readOnly }) => (
    <div className="space-y-1">
      <div className="text-xs font-semibold">{label}</div>
      <input
        type="datetime-local"
        className="h-8 w-full rounded-md border bg-background px-2 text-sm"
        value={toLocalInput(value)}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
        aria-label={label}
      />
      <p className="text-[11px] text-muted-foreground">Hora de tu zona ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Los visitantes ven la cuenta correcta en su propia zona.</p>
    </div>
  ));

const colorText = (label: string) =>
  custom<string>(label, ({ value, onChange, readOnly }) => (
    <div className="space-y-1">
      <div className="text-xs font-semibold">{label}</div>
      <div className="flex gap-1">
        <input type="color" className="h-8 w-9 rounded border p-0.5" value={/^#[0-9a-f]{6}$/i.test(value ?? "") ? value : "#000000"} disabled={readOnly} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <input className="h-8 w-full rounded-md border px-2 font-mono text-xs" placeholder="del tema" value={value ?? ""} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  ));

// ---------- Bloque compartido (vinculado) ----------
function SharedBlockPreview({ blockId }: { blockId?: string }) {
  const { savedBlocks } = useEditorContext();
  const block = savedBlocks.find((b) => b.id === blockId);
  if (!block) {
    return (
      <div style={{ padding: 24, border: "2px dashed #f59e0b", borderRadius: 8, textAlign: "center", color: "#92400e" }}>
        Selecciona un bloque compartido en el panel derecho.
      </div>
    );
  }
  const node = JSON.parse(block.json) as ComponentNode;
  return (
    <div style={{ position: "relative", outline: "2px dashed #8b5cf6", outlineOffset: -2 }}>
      <span style={{ position: "absolute", top: 4, right: 4, zIndex: 5, background: "#8b5cf6", color: "#fff", fontSize: 11, padding: "2px 6px", borderRadius: 4 }}>
        Vinculado: {block.name}
      </span>
      <RenderNode node={node} ctx={{ editing: true, depth: 0 }} />
    </div>
  );
}

function SharedBlockSelect({ value, onChange, readOnly }: FieldRenderArgs<string>) {
  const { savedBlocks } = useEditorContext();
  const shared = savedBlocks.filter((b) => b.shared);
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold">Bloque compartido</div>
      <select className="h-8 w-full rounded-md border bg-background px-2 text-sm" value={value ?? ""} disabled={readOnly} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecciona…</option>
        {shared.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-muted-foreground">
        Los cambios en el bloque guardado se aplican a todas las páginas que lo vinculan al volver a publicarlas. Para editarlo aquí,
        insértalo como copia.
      </p>
    </div>
  );
}

// ---------- Raíz ----------
function EditorRoot({ children, ...props }: PageLayoutOverrides & { children: ReactNode }) {
  const { settings } = useEditorContext();
  return (
    <LandingShell settings={settings} overrides={props} editing>
      {children}
    </LandingShell>
  );
}

// ---------- Configuración ----------
export const puckConfig: Config = {
  categories: {
    estructura: { title: "Estructura", components: ["Section", "Container", "Row", "Column", "Grid", "Divider", "Spacer"] },
    contenido: { title: "Contenido", components: ["Heading", "Subtitle", "Paragraph", "RichText", "Image", "Video", "Button", "Icon", "List", "Link"] },
    avanzados: {
      title: "Avanzados",
      components: ["HeroImage", "HeroVideo", "Carousel", "Gallery", "Cards", "Testimonials", "Stats", "Form", "CTA", "FAQ", "PromoBanner", "Countdown", "OverlayContainer", "OverlayLayer", "SharedBlock"],
    },
  },
  root: {
    fields: {
      title: { type: "text", label: "Título interno" },
      navbar: select("Navbar en esta página", [
        ["global", "Usar configuración global"],
        ["solid", "Global, forzar sólida"],
        ["transparent", "Global, forzar transparente"],
        ["hidden", "Ocultar"],
      ]),
      sidebar: select("Sidebar en esta página", [
        ["global", "Usar configuración global"],
        ["hidden", "Ocultar"],
      ]),
      footer: select("Footer en esta página", [
        ["global", "Usar configuración global"],
        ["hidden", "Ocultar"],
      ]),
      background: custom<string>("Color de fondo de la página", ({ value, onChange, readOnly }) => (
        <div className="space-y-1">
          <div className="text-xs font-semibold">Color de fondo de la página</div>
          <input className="h-8 w-full rounded-md border px-2 font-mono text-xs" placeholder="heredado del tema" value={value ?? ""} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />
        </div>
      )),
    },
    defaultProps: { navbar: "global", sidebar: "global", footer: "global" },
    render: (props: Record<string, unknown>) => <EditorRoot {...(props as PageLayoutOverrides & { children: ReactNode })} />,
  },
  components: {
    // ----- Estructura -----
    Section: block("Section", {
      fields: {
        content: { type: "slot" },
        background: backgroundField(),
        contained: toggle("Contenido centrado (ancho del tema)"),
        tag: select("Etiqueta HTML", [["section", "section"], ["div", "div"], ["header", "header"], ["aside", "aside"]]),
        ariaLabel: text("Etiqueta accesible (opcional)"),
        layout: layoutField(["size", "spacing", "flex", "visibility"]),
        appearance: appearanceField(),
      },
      defaultProps: { content: [], contained: true, tag: "section", background: { type: "none" }, layout: {}, appearance: {} },
    }),
    Container: block("Container", {
      fields: { content: { type: "slot" }, layout: layoutField(["size", "spacing", "flex", "align", "visibility"]), appearance: appearanceField() },
      defaultProps: { content: [], layout: {}, appearance: {} },
    }),
    Row: block("Row", {
      fields: { content: { type: "slot" }, layout: layoutField(["flex", "spacing", "size", "visibility"]), appearance: appearanceField() },
      defaultProps: {
        content: [],
        layout: { desktop: { gap: "24px", direction: "row", wrap: false }, mobile: { direction: "column" } },
        appearance: {},
      },
    }),
    Column: block("Column", {
      fields: { content: { type: "slot" }, layout: layoutField(["size", "flex", "spacing", "position", "visibility"]), appearance: appearanceField() },
      defaultProps: { content: [], layout: {}, appearance: {} },
    }),
    Grid: block("Grid", {
      fields: { content: { type: "slot" }, layout: layoutField(["grid", "spacing", "size", "visibility"]), appearance: appearanceField() },
      defaultProps: { content: [], layout: { desktop: { columns: 3, gap: "24px" }, tablet: { columns: 2 }, mobile: { columns: 1 } }, appearance: {} },
    }),
    Divider: block("Divider", {
      fields: {
        color: custom<string>("Color", ({ value, onChange }) => (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Color</div>
            <input type="color" value={value || "#e5e7eb"} onChange={(e) => onChange(e.target.value)} />
          </div>
        )),
        thickness: select("Grosor", [["1px", "1px"], ["2px", "2px"], ["4px", "4px"]]),
        lineStyle: select("Estilo", [["solid", "Sólido"], ["dashed", "Discontinuo"], ["dotted", "Punteado"]]),
        layout: layoutField(["size", "spacing", "align", "visibility"]),
      },
      defaultProps: { thickness: "1px", lineStyle: "solid", layout: { desktop: { margin: { top: "16px", bottom: "16px" } } } },
    }),
    Spacer: block("Spacer", {
      fields: { layout: layoutField(["size", "visibility"], "Altura por dispositivo") },
      defaultProps: { layout: { desktop: { height: "64px" }, mobile: { height: "32px" } } },
    }),

    // ----- Contenido -----
    Heading: block("Heading", {
      fields: {
        text: text("Texto", true),
        level: select("Nivel", [["h1", "H1"], ["h2", "H2"], ["h3", "H3"], ["h4", "H4"], ["h5", "H5"], ["h6", "H6"]]),
        layout: layoutField(TEXT_BOX),
        appearance: appearanceField(),
      },
      defaultProps: { text: "Nuevo título", level: "h2", layout: {}, appearance: {} },
    }),
    Subtitle: block("Subtitle", {
      fields: { text: text("Texto", true), layout: layoutField(TEXT_BOX), appearance: appearanceField() },
      defaultProps: { text: "Subtítulo", layout: {}, appearance: {} },
    }),
    Paragraph: block("Paragraph", {
      fields: { text: textarea("Texto", true), layout: layoutField(TEXT_BOX), appearance: appearanceField() },
      defaultProps: { text: "Escribe aquí tu párrafo.", layout: { desktop: { maxWidth: "720px" } }, appearance: {} },
    }),
    RichText: block("RichText", {
      fields: { body: { type: "richtext", label: "Contenido", contentEditable: true }, layout: layoutField(TEXT_BOX), appearance: appearanceField() },
      defaultProps: { body: "<p>Texto con <strong>formato</strong>.</p>", layout: {}, appearance: {} },
    }),
    Image: block("Image", {
      fields: {
        image: mediaField("Imagen"),
        alt: text("Texto alternativo (sobrescribe el de la biblioteca)"),
        caption: text("Pie de imagen"),
        aspectRatio: select("Proporción", [["auto", "Original"], ["16/9", "16:9"], ["4/3", "4:3"], ["1/1", "1:1"], ["3/4", "3:4"], ["21/9", "21:9"]]),
        fit: select("Recorte", [["cover", "Cubrir"], ["contain", "Contener"]]),
        radius: text("Radio de borde (p. ej. 16px)"),
        href: text("Enlace (opcional)"),
        newTab: toggle("Abrir en nueva pestaña"),
        priority: toggle("Carga prioritaria (imagen principal)"),
        layout: layoutField(BOX),
        appearance: appearanceField(["border", "effects", "animation", "advanced"]),
      },
      defaultProps: { image: null, alt: "", caption: "", aspectRatio: "auto", fit: "cover", radius: "", href: "", newTab: false, priority: false, layout: {}, appearance: {} },
    }),
    Video: block("Video", {
      fields: {
        video: videoField,
        poster: mediaField("Póster / miniatura"),
        title: text("Título accesible"),
        aspectRatio: select("Proporción", [["16/9", "16:9"], ["4/3", "4:3"], ["1/1", "1:1"], ["9/16", "9:16 (vertical)"], ["21/9", "21:9"]]),
        customAspectRatio: text("Proporción personalizada (ej. 1920/300)"),
        autoplay: toggle("Reproducción automática (requiere silencio)"),
        muted: toggle("Silenciado"),
        loop: toggle("Bucle"),
        controls: toggle("Mostrar controles"),
        radius: text("Radio de borde"),
        layout: layoutField(BOX),
        appearance: appearanceField(["border", "effects", "animation", "advanced"]),
      },
      defaultProps: { video: { source: "youtube", url: "" }, poster: null, title: "Video", aspectRatio: "16/9", customAspectRatio: "", autoplay: false, muted: false, loop: false, controls: true, radius: "12px", layout: {}, appearance: {} },
    }),
    Button: block("Button", {
      fields: {
        label: text("Texto", true),
        href: text("Enlace (URL, /ruta o #ancla)"),
        newTab: toggle("Abrir en nueva pestaña"),
        variant: select("Estilo", BTN_VARIANTS),
        colors: custom<ButtonColors>("Colores personalizados", (a) => <ButtonColorsField {...a} />),
        icon: { type: "select", label: "Icono", options: ICON_OPTIONS },
        iconPosition: select("Posición del icono", [["left", "Izquierda"], ["right", "Derecha"]]),
        radius: text("Radio de borde (opcional)"),
        ariaLabel: text("Etiqueta accesible (opcional)"),
        layout: layoutField(["size", "align", "spacing", "text", "position", "visibility"], "Tamaño y posición por dispositivo"),
        appearance: appearanceField(["typography", "border", "animation", "advanced"]),
      },
      defaultProps: { label: "Botón", href: "#", newTab: false, variant: "primary", icon: "", iconPosition: "right", layout: {}, appearance: {} },
    }),
    Icon: block("Icon", {
      fields: {
        name: { type: "select", label: "Icono", options: ICON_OPTIONS },
        size: { type: "number", label: "Tamaño (px)", min: 12, max: 160 },
        color: text("Color"),
        background: text("Fondo circular (color, opcional)"),
        href: text("Enlace (opcional)"),
        label: text("Etiqueta accesible"),
        layout: layoutField(["align", "spacing", "position", "visibility"]),
        appearance: appearanceField(["animation", "advanced"]),
      },
      defaultProps: { name: "star", size: 40, color: "", background: "", href: "", label: "", layout: {}, appearance: {} },
    }),
    List: block("List", {
      fields: {
        items: { type: "array", label: "Elementos", arrayFields: { text: { type: "text", label: "Texto" }, icon: { type: "select", label: "Icono", options: ICON_OPTIONS } }, getItemSummary: (i) => i.text || "Elemento", defaultItemProps: { text: "Nuevo elemento", icon: "" } },
        style: select("Estilo", [["icon", "Con icono"], ["bullet", "Viñetas"], ["numbered", "Numerada"]]),
        icon: { type: "select", label: "Icono por defecto", options: ICON_OPTIONS },
        iconColor: text("Color del icono"),
        layout: layoutField(TEXT_BOX),
        appearance: appearanceField(),
      },
      defaultProps: { items: [{ text: "Primer elemento" }, { text: "Segundo elemento" }], style: "icon", icon: "check", iconColor: "", layout: {}, appearance: {} },
    }),
    Link: block("Link", {
      fields: { text: text("Texto", true), href: text("URL"), newTab: toggle("Nueva pestaña"), underline: toggle("Subrayado"), layout: layoutField(TEXT_BOX), appearance: appearanceField() },
      defaultProps: { text: "Ver más", href: "#", newTab: false, underline: true, layout: {}, appearance: {} },
    }),

    // ----- Avanzados -----
    HeroImage: block("HeroImage", {
      fields: {
        content: { type: "slot" },
        background: backgroundField(["image", "color", "gradient"]),
        contentPosition: custom<Partial<Record<Device, ContentPosition>>>("Contenido superpuesto", (a) => <ContentPositionField {...a} />),
        ariaLabel: text("Etiqueta accesible"),
        layout: layoutField(["size", "spacing", "visibility"], "Altura y espaciado por dispositivo"),
        appearance: appearanceField(["colors", "typography", "border", "animation", "advanced"]),
      },
      defaultProps: {
        content: [],
        background: { type: "image", image: null, overlay: DEFAULT_OVERLAY },
        contentPosition: { desktop: { h: "start", v: "center", maxWidth: "640px", textAlign: "left" }, mobile: { h: "center", textAlign: "center" } },
        layout: { desktop: { minHeight: "640px" }, tablet: { minHeight: "520px" }, mobile: { minHeight: "460px" } },
        appearance: { color: "#ffffff" },
      },
    }),
    HeroVideo: block("HeroVideo", {
      fields: {
        content: { type: "slot" },
        background: backgroundField(["video", "image", "color"]),
        contentPosition: custom<Partial<Record<Device, ContentPosition>>>("Contenido superpuesto", (a) => <ContentPositionField {...a} />),
        ariaLabel: text("Etiqueta accesible"),
        layout: layoutField(["size", "spacing", "visibility"], "Altura y espaciado por dispositivo"),
        appearance: appearanceField(["colors", "typography", "border", "animation", "advanced"]),
      },
      defaultProps: {
        content: [],
        background: { type: "video", video: { source: "storage", media: null }, poster: null, overlay: DEFAULT_OVERLAY },
        contentPosition: { desktop: { h: "start", v: "center", maxWidth: "680px", textAlign: "left" }, mobile: { h: "center", textAlign: "center" } },
        layout: { desktop: { minHeight: "720px" }, mobile: { minHeight: "520px" } },
        appearance: { color: "#ffffff" },
      },
    }),
    OverlayContainer: block("OverlayContainer", {
      fields: {
        layers: { type: "slot", allow: ["OverlayLayer"] },
        background: backgroundField(),
        mobileStack: toggle("Apilar capas en mobile (recomendado)"),
        mobileGap: text("Separación en mobile"),
        layout: layoutField(["size", "spacing", "visibility"]),
        appearance: appearanceField(["colors", "border", "animation", "advanced"]),
      },
      defaultProps: {
        layers: [],
        background: { type: "image", image: null, overlay: { enabled: true, color: "#000000", opacity: 0.35 } },
        mobileStack: true,
        mobileGap: "16px",
        layout: { desktop: { minHeight: "560px" }, mobile: { minHeight: "auto" } },
        appearance: { color: "#ffffff", border: { radius: "16px" } },
      },
    }),
    OverlayLayer: block("OverlayLayer", {
      fields: { content: { type: "slot" }, layout: layoutField(["position", "size", "spacing", "align", "visibility"], "Anclaje y desplazamiento por dispositivo"), appearance: appearanceField() },
      defaultProps: { content: [], layout: { desktop: { anchor: "center", maxWidth: "520px", width: "90%" } }, appearance: {} },
    }),
    CTA: block("CTA", {
      fields: {
        background: backgroundField(),
        eyebrow: text("Antetítulo"),
        title: text("Título", true),
        text: textarea("Texto", true),
        buttons: {
          type: "array",
          label: "Botones",
          max: 3,
          arrayFields: { label: { type: "text", label: "Texto" }, href: { type: "text", label: "Enlace" }, variant: select("Estilo", BTN_VARIANTS.slice(0, 3)) },
          getItemSummary: (b) => b.label || "Botón",
          defaultItemProps: { label: "Botón", href: "#", variant: "primary" },
        },
        align: select("Alineación", [["left", "Izquierda"], ["center", "Centro"]]),
        layout: layoutField(["size", "spacing", "visibility"]),
        appearance: appearanceField(),
      },
      defaultProps: {
        background: { type: "color", color: "#111827", overlay: { enabled: false, color: "#000", opacity: 0.4 } },
        eyebrow: "",
        title: "Llamada a la acción",
        text: "Describe el beneficio principal.",
        buttons: [{ label: "Empezar", href: "#", variant: "primary" }],
        align: "center",
        layout: {},
        appearance: {},
      },
    }),
    Carousel: block("Carousel", {
      fields: {
        slides: {
          type: "array",
          label: "Diapositivas",
          arrayFields: {
            image: mediaField("Imagen"),
            title: { type: "text", label: "Título" },
            text: { type: "textarea", label: "Texto" },
            buttonLabel: { type: "text", label: "Texto del botón" },
            buttonHref: { type: "text", label: "Enlace del botón" },
          },
          getItemSummary: (s, i) => s.title || `Diapositiva ${(i ?? 0) + 1}`,
          defaultItemProps: { image: null, title: "", text: "", buttonLabel: "", buttonHref: "" },
        },
        autoplay: toggle("Avance automático"),
        interval: { type: "number", label: "Intervalo (ms)", min: 2000, step: 500 },
        showArrows: toggle("Flechas"),
        showDots: toggle("Indicadores"),
        ariaLabel: text("Etiqueta accesible"),
        layout: layoutField(["size", "spacing", "visibility"], "Altura por dispositivo"),
        appearance: appearanceField(["border", "animation", "advanced"]),
      },
      defaultProps: { slides: [], autoplay: true, interval: 5000, showArrows: true, showDots: true, ariaLabel: "Carrusel", layout: { desktop: { height: "520px" }, mobile: { height: "360px" } }, appearance: {} },
    }),
    Gallery: block("Gallery", {
      fields: {
        images: {
          type: "array",
          label: "Imágenes",
          arrayFields: { image: mediaField("Imagen"), caption: { type: "text", label: "Leyenda" } },
          getItemSummary: (g, i) => g.caption || g.image?.alt || `Imagen ${(i ?? 0) + 1}`,
          defaultItemProps: { image: null, caption: "" },
        },
        aspect: select("Proporción", [["1/1", "1:1"], ["4/3", "4:3"], ["16/9", "16:9"], ["3/4", "3:4"]]),
        lightbox: toggle("Ampliar al hacer clic"),
        layout: layoutField(["grid", "spacing", "size", "visibility"]),
        appearance: appearanceField(["animation", "advanced"]),
      },
      defaultProps: { images: [], aspect: "4/3", lightbox: true, layout: { desktop: { columns: 3, gap: "16px" }, tablet: { columns: 2 }, mobile: { columns: 1 } }, appearance: {} },
    }),
    Cards: block("Cards", {
      fields: {
        items: {
          type: "array",
          label: "Tarjetas",
          arrayFields: {
            image: mediaField("Imagen"),
            iconImage: mediaField("Logo / icono personalizado (PNG)"),
            icon: { type: "select", label: "Icono del catálogo (si no hay logo)", options: ICON_OPTIONS },
            title: { type: "text", label: "Título" },
            text: { type: "textarea", label: "Texto" },
            linkLabel: { type: "text", label: "Texto del enlace" },
            href: { type: "text", label: "Enlace" },
            background: colorText("Fondo de esta tarjeta (opcional)"),
          },
          getItemSummary: (c) => c.title || "Tarjeta",
          defaultItemProps: { image: null, icon: "", iconImage: null, title: "Título", text: "Descripción breve.", linkLabel: "", href: "" },
        },
        show: {
          type: "checkbox",
          label: "Mostrar en las tarjetas (combinables; lo vacío no ocupa espacio)",
          options: [
            { label: "Imagen", value: "image" },
            { label: "Logo / icono", value: "icon" },
          ],
        },
        transparent: toggle("Tarjetas transparentes (sin fondo, borde ni sombra)"),
        typography: {
          type: "object",
          label: "Textos de las tarjetas (vacío = tema)",
          objectFields: {
            titleSize: { type: "text", label: "Tamaño del título (p. ej. 22px)" },
            titleSizeMobile: { type: "text", label: "Tamaño del título en mobile" },
            titleWeight: select("Grosor del título", [["", "Del tema"], ["400", "Normal"], ["500", "Medio"], ["600", "Semi negrita"], ["700", "Negrita"], ["800", "Extra negrita"]]),
            textSize: { type: "text", label: "Tamaño del texto (p. ej. 16px)" },
            textSizeMobile: { type: "text", label: "Tamaño del texto en mobile" },
            align: select("Alineación", [["", "Del tema"], ["left", "Izquierda"], ["center", "Centro"], ["right", "Derecha"]]),
          },
        },
        colors: {
          type: "object",
          label: "Colores de las tarjetas (vacío = tema)",
          objectFields: {
            background: colorText("Fondo"),
            border: colorText("Borde"),
            title: colorText("Título"),
            text: colorText("Texto"),
            link: colorText("Enlace"),
            iconBackground: colorText("Fondo del icono"),
            iconColor: colorText("Color del icono (catálogo)"),
          },
        },
        iconSize: { type: "number", label: "Tamaño del icono (px)", min: 16, max: 160 },
        iconBackground: toggle("Recuadro de fondo detrás del icono"),
        layout: layoutField(["grid", "spacing", "size", "visibility"]),
        appearance: appearanceField(["animation", "advanced"]),
      },
      defaultProps: {
        items: [
          { icon: "zap", title: "Beneficio uno", text: "Descripción breve." },
          { icon: "shield", title: "Beneficio dos", text: "Descripción breve." },
          { icon: "users", title: "Beneficio tres", text: "Descripción breve." },
        ],
        show: ["icon"],
        iconSize: 24,
        iconBackground: true,
        layout: { desktop: { columns: 3, gap: "24px" }, tablet: { columns: 2 }, mobile: { columns: 1 } },
        appearance: {},
      },
    }),
    Testimonials: block("Testimonials", {
      fields: {
        items: {
          type: "array",
          label: "Testimonios",
          arrayFields: {
            quote: { type: "textarea", label: "Cita" },
            name: { type: "text", label: "Nombre" },
            role: { type: "text", label: "Cargo" },
            avatar: mediaField("Foto"),
            rating: { type: "number", label: "Estrellas (0-5)", min: 0, max: 5 },
          },
          getItemSummary: (t) => t.name || "Testimonio",
          defaultItemProps: { quote: "Una experiencia excelente.", name: "Nombre", role: "", avatar: null, rating: 5 },
        },
        layout: layoutField(["grid", "spacing", "size", "visibility"]),
        appearance: appearanceField(["animation", "advanced"]),
      },
      defaultProps: { items: [], layout: { desktop: { columns: 3, gap: "24px" }, tablet: { columns: 2 }, mobile: { columns: 1 } }, appearance: {} },
    }),
    Stats: block("Stats", {
      fields: {
        items: { type: "array", label: "Cifras", arrayFields: { value: { type: "text", label: "Valor" }, label: { type: "text", label: "Etiqueta" } }, getItemSummary: (s) => `${s.value} ${s.label}`, defaultItemProps: { value: "100+", label: "Etiqueta" } },
        layout: layoutField(["grid", "spacing", "size", "visibility"]),
        appearance: appearanceField(),
      },
      defaultProps: { items: [{ value: "10+", label: "Años" }, { value: "500", label: "Clientes" }, { value: "24/7", label: "Soporte" }], layout: { desktop: { columns: 3 }, tablet: { columns: 3 }, mobile: { columns: 1 } }, appearance: {} },
    }),
    Form: block("Form", {
      fields: {
        formId: text("Identificador del formulario"),
        fields: {
          type: "array",
          label: "Campos",
          max: 20,
          arrayFields: {
            label: { type: "text", label: "Etiqueta" },
            name: { type: "text", label: "Nombre interno" },
            type: select("Tipo", [["text", "Texto"], ["email", "Correo"], ["tel", "Teléfono"], ["textarea", "Texto largo"], ["select", "Lista"], ["checkbox", "Casilla"]]),
            required: toggle("Obligatorio"),
            placeholder: { type: "text", label: "Placeholder" },
            options: { type: "text", label: "Opciones (lista, separadas por coma)" },
          },
          getItemSummary: (f) => f.label || "Campo",
          defaultItemProps: { label: "Campo", name: "", type: "text", required: false, placeholder: "", options: "" },
        },
        submitLabel: text("Texto del botón"),
        successMessage: text("Mensaje de éxito"),
        buttonVariant: select("Estilo del botón", BTN_VARIANTS.slice(0, 3)),
        layout: layoutField(["size", "spacing", "align", "visibility"]),
        appearance: appearanceField(),
      },
      defaultProps: {
        formId: "contacto",
        fields: [
          { label: "Nombre", name: "nombre", type: "text", required: true },
          { label: "Correo", name: "email", type: "email", required: true },
          { label: "Mensaje", name: "mensaje", type: "textarea", required: false },
        ],
        submitLabel: "Enviar",
        successMessage: "¡Gracias! Te contactaremos pronto.",
        buttonVariant: "primary",
        layout: { desktop: { maxWidth: "560px" } },
        appearance: {},
      },
    }),
    FAQ: block("FAQ", {
      fields: {
        items: { type: "array", label: "Preguntas", arrayFields: { question: { type: "text", label: "Pregunta" }, answer: { type: "textarea", label: "Respuesta" } }, getItemSummary: (q) => q.question || "Pregunta", defaultItemProps: { question: "¿Pregunta?", answer: "Respuesta." } },
        openFirst: toggle("Abrir la primera"),
        layout: layoutField(["size", "spacing", "align", "visibility"]),
        appearance: appearanceField(),
      },
      defaultProps: { items: [{ question: "¿Pregunta frecuente?", answer: "Respuesta." }], openFirst: true, layout: { desktop: { maxWidth: "820px", align: "center" } }, appearance: {} },
    }),
    PromoBanner: block("PromoBanner", {
      fields: {
        badge: text("Etiqueta"),
        text: text("Texto", true),
        linkLabel: text("Texto del enlace"),
        href: text("Enlace"),
        background: text("Color de fondo"),
        textColor: text("Color del texto"),
        dismissible: toggle("Se puede cerrar"),
        layout: layoutField(["spacing", "text", "visibility"]),
        appearance: appearanceField(["typography", "border", "animation", "advanced"]),
      },
      defaultProps: { badge: "Nuevo", text: "Mensaje promocional", linkLabel: "Ver más", href: "#", background: "#2563eb", textColor: "#ffffff", dismissible: false, layout: {}, appearance: {} },
    }),
    Countdown: block("Countdown", {
      fields: {
        target: dateTimeField("Fecha y hora objetivo"),
        size: select("Tamaño", [["small", "Pequeño"], ["medium", "Mediano"], ["large", "Grande"]]),
        variant: select("Estilo", [["boxes", "Con recuadros"], ["plain", "Solo números"]]),
        showDays: toggle("Mostrar días"),
        showSeconds: toggle("Mostrar segundos"),
        labels: {
          type: "object",
          label: "Etiquetas",
          objectFields: { days: { type: "text", label: "Días" }, hours: { type: "text", label: "Horas" }, minutes: { type: "text", label: "Minutos" }, seconds: { type: "text", label: "Segundos" } },
        },
        finishedText: text("Texto al terminar (vacío = ocultar)"),
        numberColor: colorText("Color de los números"),
        labelColor: colorText("Color de las etiquetas"),
        boxColor: colorText("Color de los recuadros"),
        layout: layoutField(["size", "spacing", "align", "visibility"]),
        appearance: appearanceField(["animation", "advanced"]),
      },
      defaultProps: {
        target: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        size: "medium",
        variant: "boxes",
        showDays: true,
        showSeconds: true,
        labels: { days: "Días", hours: "Horas", minutes: "Minutos", seconds: "Segundos" },
        finishedText: "¡El evento ya comenzó!",
        numberColor: "",
        labelColor: "",
        boxColor: "",
        layout: {},
        appearance: {},
      },
    }),
    SharedBlock: {
      label: BLOCKS.SharedBlock.label,
      fields: { blockId: custom<string>("Bloque compartido", (a) => <SharedBlockSelect {...a} />) },
      defaultProps: { blockId: "" },
      render: ({ blockId }) => <SharedBlockPreview blockId={blockId as string} />,
    },
  },
};

export const VIEWPORTS = [
  { width: 1280, label: "Desktop", icon: "Monitor" as const },
  { width: 768, label: "Tablet", icon: "Tablet" as const },
  { width: 375, label: "Mobile", icon: "Smartphone" as const },
];

export const PUCK_DICTIONARY = {
  "action-delete": "Eliminar",
  "action-drag": "Arrastrar",
  "action-duplicate": "Duplicar",
  "action-selectparent": "Seleccionar contenedor",
  "drawer-category-other": "Otros",
  "field-arrayitem-delete": "Eliminar",
  "field-arrayitem-duplicate": "Duplicar",
  "header-publish": "Publicar",
  "header-redo": "Rehacer",
  "header-undo": "Deshacer",
  "label-page": "Página",
  "outline-empty": "Sin bloques",
  "outline-header-title": "Capas",
  "outline-item-delete": "Eliminar",
  "outline-item-duplicate": "Duplicar",
  "plugin-blocks": "Bloques",
  "plugin-components": "Componentes",
  "plugin-fields": "Propiedades",
  "plugin-outline": "Capas",
  "viewport-switch": "Cambiar dispositivo",
  "viewport-zoom-auto": "Zoom automático",
  "viewport-zoom-in": "Acercar",
  "viewport-zoom-out": "Alejar",
};
