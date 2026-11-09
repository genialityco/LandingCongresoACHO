"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Rocket, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LandingShell } from "@/builder/site/LandingShell";
import { db } from "@/lib/firebase/client";
import {
  type ButtonVariantStyle,
  type DeviceVisibility,
  type FooterSettings,
  type GlobalSettings,
  type NavbarSettings,
  type NavTopBar,
  type ResponsiveValue,
  type SettingsKey,
  type SidebarSettings,
  type SiteSettings,
  type ThemeSettings,
} from "@/lib/model/settings";
import type { PageDoc } from "@/lib/model/types";
import { listPages } from "@/lib/services/pages";
import { loadSettings, publishSettings, saveSettingsDraft } from "@/lib/services/settings";
import { useAuth } from "../auth";
import { MediaField } from "../media/MediaField";
import { ICON_OPTIONS } from "@/builder/icons";
import { PageHeader } from "../AdminShell";
import { publishSettingsAndRevalidate } from "./publish-settings";
import { NavLinksEditor, SimpleLinksEditor, uid } from "./LinksEditor";
import { ColorInput, errorMessage, FormRow, NativeSelect } from "../ui";

const TITLES: Record<SettingsKey, { title: string; description: string }> = {
  theme: { title: "Tema y estilos globales", description: "Fuentes, colores, tipografía H1–H6, espaciados y botones. Los bloques heredan estos valores salvo override." },
  navbar: { title: "Navbar", description: "Barra de navegación superior: logo, enlaces, submenús, botones y comportamiento mobile." },
  sidebar: { title: "Sidebar", description: "Navegación lateral izquierda o derecha, con drawer en dispositivos pequeños." },
  footer: { title: "Footer", description: "Pie de página global con columnas de enlaces, redes y copyright." },
  site: { title: "Sitio", description: "Nombre del sitio, página de inicio y favicon." },
};

function Group({ title, children, cols = 2 }: { title: string; children: ReactNode; cols?: 1 | 2 | 3 | 4 }) {
  const grid = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[cols];
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className={`grid gap-3 ${grid}`}>{children}</CardContent>
    </Card>
  );
}

function ResponsiveInputs({ value, onChange, label }: { value: ResponsiveValue<string>; onChange: (v: ResponsiveValue<string>) => void; label: string }) {
  return (
    <FormRow label={label}>
      <div className="grid grid-cols-3 gap-1.5">
        {(["desktop", "tablet", "mobile"] as const).map((d) => (
          <Input
            key={d}
            className="h-8 text-xs"
            placeholder={d === "desktop" ? "desktop" : `${d} (hereda)`}
            value={value?.[d] ?? ""}
            aria-label={`${label} ${d}`}
            onChange={(e) => {
              const next = { ...value, [d]: e.target.value || undefined };
              if (d === "desktop" && !next.desktop) next.desktop = value.desktop;
              onChange(next as ResponsiveValue<string>);
            }}
          />
        ))}
      </div>
    </FormRow>
  );
}

function VisibilityInputs({ value, onChange }: { value: DeviceVisibility; onChange: (v: DeviceVisibility) => void }) {
  return (
    <FormRow label="Visible en">
      <div className="flex gap-4 text-sm">
        {(["desktop", "tablet", "mobile"] as const).map((d) => (
          <label key={d} className="flex items-center gap-1.5">
            <input type="checkbox" checked={value[d]} onChange={(e) => onChange({ ...value, [d]: e.target.checked })} /> {d}
          </label>
        ))}
      </div>
    </FormRow>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm">
      <span>
        {label}
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={(v) => onChange(!!v)} />
    </label>
  );
}

const GOOGLE_FONTS = ["Inter", "Poppins", "Montserrat", "Roboto", "Open Sans", "Lato", "Nunito", "Raleway", "Playfair Display", "Merriweather", "DM Sans", "Manrope", "Work Sans", "Source Sans 3", "Space Grotesk", "Outfit", "system-ui", "Georgia"];

const SOCIAL_NETWORKS = ["facebook", "instagram", "linkedin", "youtube", "x", "whatsapp", "mail", "phone", "globe"];

function SocialLinksEditor({ value, onChange }: { value: { id: string; network: string; url: string }[]; onChange: (v: { id: string; network: string; url: string }[]) => void }) {
  return (
    <>
      {value.map((s, i) => (
        <div key={s.id} className="flex gap-2">
          <NativeSelect className="w-40" value={s.network} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, network: e.target.value } : x)))}>
            {SOCIAL_NETWORKS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </NativeSelect>
          <Input value={s.url} placeholder="https://" onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} />
          <Button size="icon-sm" variant="ghost" aria-label="Eliminar" onClick={() => onChange(value.filter((_, k) => k !== i))}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <div>
        <Button size="sm" variant="outline" onClick={() => onChange([...value, { id: uid(), network: "instagram", url: "" }])}>
          <Plus /> Añadir red
        </Button>
      </div>
    </>
  );
}

function TopBarForm({ v, set }: { v: NavTopBar; set: (v: NavTopBar) => void }) {
  const items = v.items;
  const setItem = (i: number, patch: Partial<NavTopBar["items"][number]>) => set({ ...v, items: items.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
  return (
    <>
      <Group title="Franja superior (sobre la navbar)">
        <Toggle label="Mostrar franja superior" checked={v.enabled} onChange={(enabled) => set({ ...v, enabled })} />
        <Toggle label="Ocultar en mobile" checked={v.hideOnMobile} onChange={(hideOnMobile) => set({ ...v, hideOnMobile })} />
      </Group>
      <Group title="Franja superior · contacto (izquierda)" cols={1}>
        {items.map((it, i) => (
          <div key={it.id} className="flex gap-1.5">
            <NativeSelect className="w-32" value={it.icon} onChange={(e) => setItem(i, { icon: e.target.value })} aria-label="Icono">
              {ICON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </NativeSelect>
            <Input className="h-8" value={it.text} placeholder="Texto" onChange={(e) => setItem(i, { text: e.target.value })} aria-label="Texto" />
            <Input className="h-8 font-mono text-xs" value={it.href} placeholder="https://wa.me/57…, tel:+57…, mailto:… (opcional)" onChange={(e) => setItem(i, { href: e.target.value })} aria-label="Enlace" />
            <Button size="icon-sm" variant="ghost" aria-label="Eliminar" onClick={() => set({ ...v, items: items.filter((_, k) => k !== i) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <div>
          <Button size="sm" variant="outline" onClick={() => set({ ...v, items: [...items, { id: uid(), icon: "phone", text: "", href: "" }] })}>
            <Plus /> Añadir elemento
          </Button>
        </div>
      </Group>
      <Group title="Franja superior · redes (derecha)" cols={1}>
        <SocialLinksEditor value={v.social} onChange={(social) => set({ ...v, social })} />
      </Group>
      <Group title="Franja superior · estilo" cols={4}>
        <FormRow label="Fondo"><ColorInput value={v.colors.background} onChange={(x) => set({ ...v, colors: { ...v.colors, background: x } })} /></FormRow>
        <FormRow label="Texto"><ColorInput value={v.colors.text} onChange={(x) => set({ ...v, colors: { ...v.colors, text: x } })} /></FormRow>
        <FormRow label="Iconos de contacto"><ColorInput value={v.colors.icon} onChange={(x) => set({ ...v, colors: { ...v.colors, icon: x } })} /></FormRow>
        <FormRow label="Círculo de redes"><ColorInput value={v.colors.socialBackground} onChange={(x) => set({ ...v, colors: { ...v.colors, socialBackground: x } })} /></FormRow>
        <FormRow label="Icono de redes"><ColorInput value={v.colors.socialColor} onChange={(x) => set({ ...v, colors: { ...v.colors, socialColor: x } })} /></FormRow>
        <FormRow label="Tamaño de letra"><Input value={v.fontSize} onChange={(e) => set({ ...v, fontSize: e.target.value })} /></FormRow>
        <FormRow label="Padding vertical"><Input value={v.paddingY} onChange={(e) => set({ ...v, paddingY: e.target.value })} /></FormRow>
      </Group>
    </>
  );
}

// ---------- Formularios ----------
function ThemeForm({ v, set }: { v: ThemeSettings; set: (v: ThemeSettings) => void }) {
  const variant = (name: "primary" | "secondary" | "outline", label: string) => {
    const b = v.buttons[name];
    const upd = (p: Partial<ButtonVariantStyle>) => set({ ...v, buttons: { ...v.buttons, [name]: { ...b, ...p } } });
    return (
      <Group title={`Botón ${label}`} cols={1}>
        <FormRow label="Fondo"><ColorInput value={b.background} onChange={(x) => upd({ background: x })} /></FormRow>
        <FormRow label="Texto"><ColorInput value={b.color} onChange={(x) => upd({ color: x })} /></FormRow>
        <FormRow label="Borde"><ColorInput value={b.border} onChange={(x) => upd({ border: x })} /></FormRow>
        <FormRow label="Fondo hover"><ColorInput value={b.hoverBackground} onChange={(x) => upd({ hoverBackground: x })} /></FormRow>
        <FormRow label="Texto hover"><ColorInput value={b.hoverColor} onChange={(x) => upd({ hoverColor: x })} /></FormRow>
      </Group>
    );
  };
  return (
    <div className="space-y-4">
      <datalist id="google-fonts">
        {GOOGLE_FONTS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <Group title="Fuentes (Google Fonts)">
        <FormRow label="Fuente principal (textos)" hint="Nombre exacto de Google Fonts">
          <Input list="google-fonts" value={v.fonts.primary} onChange={(e) => set({ ...v, fonts: { ...v.fonts, primary: e.target.value } })} />
        </FormRow>
        <FormRow label="Fuente secundaria (títulos)">
          <Input list="google-fonts" value={v.fonts.secondary} onChange={(e) => set({ ...v, fonts: { ...v.fonts, secondary: e.target.value } })} />
        </FormRow>
      </Group>
      <Group title="Colores corporativos" cols={4}>
        {(Object.keys(v.colors) as (keyof ThemeSettings["colors"])[]).map((k) => (
          <FormRow key={k} label={{ primary: "Primario", secondary: "Secundario", accent: "Acento", text: "Texto", muted: "Texto suave", background: "Fondo", surface: "Superficie", border: "Bordes" }[k]}>
            <ColorInput allowEmpty={false} value={v.colors[k]} onChange={(x) => set({ ...v, colors: { ...v.colors, [k]: x } })} />
          </FormRow>
        ))}
      </Group>
      <Group title="Títulos H1–H6" cols={1}>
        {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((h) => {
          const hs = v.headings[h];
          const upd = (p: Partial<typeof hs>) => set({ ...v, headings: { ...v.headings, [h]: { ...hs, ...p } } });
          return (
            <div key={h} className="grid items-end gap-2 sm:grid-cols-[40px_2fr_1fr_1fr_1fr]">
              <span className="pb-2 font-mono text-sm font-semibold uppercase">{h}</span>
              <ResponsiveInputs label="Tamaño (desktop/tablet/mobile)" value={hs.size} onChange={(size) => upd({ size })} />
              <FormRow label="Peso"><Input type="number" step={100} min={100} max={900} value={hs.weight} onChange={(e) => upd({ weight: Number(e.target.value) })} /></FormRow>
              <FormRow label="Interlineado"><Input value={hs.lineHeight} onChange={(e) => upd({ lineHeight: e.target.value })} /></FormRow>
              <FormRow label="Espaciado"><Input value={hs.letterSpacing} onChange={(e) => upd({ letterSpacing: e.target.value })} /></FormRow>
            </div>
          );
        })}
      </Group>
      <Group title="Texto base" cols={3}>
        <ResponsiveInputs label="Tamaño" value={v.body.size} onChange={(size) => set({ ...v, body: { ...v.body, size } })} />
        <FormRow label="Interlineado"><Input value={v.body.lineHeight} onChange={(e) => set({ ...v, body: { ...v.body, lineHeight: e.target.value } })} /></FormRow>
        <FormRow label="Peso"><Input type="number" step={100} value={v.body.weight} onChange={(e) => set({ ...v, body: { ...v.body, weight: Number(e.target.value) } })} /></FormRow>
      </Group>
      <Group title="Layout y espaciados" cols={2}>
        <FormRow label="Ancho máximo del contenido"><Input value={v.layout.containerMaxWidth} onChange={(e) => set({ ...v, layout: { ...v.layout, containerMaxWidth: e.target.value } })} /></FormRow>
        <FormRow label="Radio de borde"><Input value={v.layout.radius} onChange={(e) => set({ ...v, layout: { ...v.layout, radius: e.target.value } })} /></FormRow>
        <ResponsiveInputs label="Padding vertical de secciones" value={v.layout.sectionPaddingY} onChange={(x) => set({ ...v, layout: { ...v.layout, sectionPaddingY: x } })} />
        <ResponsiveInputs label="Margen lateral (gutter)" value={v.layout.gutter} onChange={(x) => set({ ...v, layout: { ...v.layout, gutter: x } })} />
        <FormRow label="Sombra (CSS box-shadow)"><Input value={v.layout.shadow} onChange={(e) => set({ ...v, layout: { ...v.layout, shadow: e.target.value } })} /></FormRow>
      </Group>
      <Group title="Botones (predeterminados)" cols={4}>
        <FormRow label="Radio"><Input value={v.buttons.radius} onChange={(e) => set({ ...v, buttons: { ...v.buttons, radius: e.target.value } })} /></FormRow>
        <FormRow label="Padding vertical"><Input value={v.buttons.paddingY} onChange={(e) => set({ ...v, buttons: { ...v.buttons, paddingY: e.target.value } })} /></FormRow>
        <FormRow label="Padding horizontal"><Input value={v.buttons.paddingX} onChange={(e) => set({ ...v, buttons: { ...v.buttons, paddingX: e.target.value } })} /></FormRow>
        <FormRow label="Tamaño de texto"><Input value={v.buttons.fontSize} onChange={(e) => set({ ...v, buttons: { ...v.buttons, fontSize: e.target.value } })} /></FormRow>
      </Group>
      <div className="grid gap-4 lg:grid-cols-3">
        {variant("primary", "primario")}
        {variant("secondary", "secundario")}
        {variant("outline", "contorno")}
      </div>
    </div>
  );
}

function NavbarForm({ v, set }: { v: NavbarSettings; set: (v: NavbarSettings) => void }) {
  return (
    <div className="space-y-4">
      <Group title="General">
        <Toggle label="Mostrar navbar" checked={v.enabled} onChange={(enabled) => set({ ...v, enabled })} />
        <Toggle label="Fija al hacer scroll (sticky)" checked={v.sticky} onChange={(sticky) => set({ ...v, sticky })} />
        <FormRow label="Estilo">
          <NativeSelect value={v.style} onChange={(e) => set({ ...v, style: e.target.value as NavbarSettings["style"] })}>
            <option value="solid">Sólida</option>
            <option value="transparent">Transparente (sobre el hero; sólida al hacer scroll)</option>
          </NativeSelect>
        </FormRow>
        <FormRow label="Colapsar enlaces en">
          <NativeSelect value={v.collapseAt} onChange={(e) => set({ ...v, collapseAt: e.target.value as NavbarSettings["collapseAt"] })}>
            <option value="tablet">Tablet y mobile</option>
            <option value="mobile">Solo mobile</option>
          </NativeSelect>
        </FormRow>
        <FormRow label="Menú mobile">
          <NativeSelect value={v.mobileMenu} onChange={(e) => set({ ...v, mobileMenu: e.target.value as NavbarSettings["mobileMenu"] })}>
            <option value="drawer">Hamburguesa con panel lateral</option>
            <option value="dropdown">Hamburguesa desplegable</option>
          </NativeSelect>
        </FormRow>
        <VisibilityInputs value={v.visibility} onChange={(visibility) => set({ ...v, visibility })} />
      </Group>
      <Group title="Logo">
        <FormRow label="Logo (Firebase Storage)">
          <MediaField value={v.logo} onChange={(logo) => set({ ...v, logo })} />
        </FormRow>
        <div className="space-y-3">
          <FormRow label="Texto (si no hay logo)"><Input value={v.logoText} onChange={(e) => set({ ...v, logoText: e.target.value })} /></FormRow>
          <ResponsiveInputs label="Alto del logo" value={v.logoHeight} onChange={(logoHeight) => set({ ...v, logoHeight })} />
        </div>
      </Group>
      <TopBarForm v={v.topBar} set={(topBar) => set({ ...v, topBar })} />
      <Group title="Enlaces y submenús" cols={1}>
        <NavLinksEditor value={v.links} onChange={(links) => set({ ...v, links })} />
      </Group>
      <Group title="Botones de navegación" cols={1}>
        {v.buttons.map((b, i) => (
          <div key={b.id} className="flex gap-1.5">
            <Input className="h-8" value={b.label} onChange={(e) => set({ ...v, buttons: v.buttons.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} aria-label="Texto" />
            <Input className="h-8 font-mono text-xs" value={b.href} onChange={(e) => set({ ...v, buttons: v.buttons.map((x, k) => (k === i ? { ...x, href: e.target.value } : x)) })} aria-label="Enlace" />
            <NativeSelect className="w-36" value={b.variant} onChange={(e) => set({ ...v, buttons: v.buttons.map((x, k) => (k === i ? { ...x, variant: e.target.value as "primary" } : x)) })}>
              <option value="primary">Primario</option>
              <option value="secondary">Secundario</option>
              <option value="outline">Contorno</option>
            </NativeSelect>
            <div className="w-28 shrink-0" title="Fondo propio (vacío = tema)">
              <ColorInput value={b.background ?? ""} onChange={(x) => set({ ...v, buttons: v.buttons.map((y, k) => (k === i ? { ...y, background: x || undefined } : y)) })} />
            </div>
            <div className="w-28 shrink-0" title="Texto propio">
              <ColorInput value={b.color ?? ""} onChange={(x) => set({ ...v, buttons: v.buttons.map((y, k) => (k === i ? { ...y, color: x || undefined } : y)) })} />
            </div>
            <Button size="icon-sm" variant="ghost" aria-label="Eliminar" onClick={() => set({ ...v, buttons: v.buttons.filter((_, k) => k !== i) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <div>
          <Button size="sm" variant="outline" onClick={() => set({ ...v, buttons: [...v.buttons, { id: uid(), label: "Botón", href: "#", variant: "primary" }] })}>
            <Plus /> Añadir botón
          </Button>
        </div>
      </Group>
      <Group title="Colores y tipografía" cols={4}>
        <FormRow label="Fondo"><ColorInput value={v.colors.background} onChange={(x) => set({ ...v, colors: { ...v.colors, background: x } })} /></FormRow>
        <FormRow label="Texto"><ColorInput value={v.colors.text} onChange={(x) => set({ ...v, colors: { ...v.colors, text: x } })} /></FormRow>
        <FormRow label="Hover"><ColorInput value={v.colors.hover} onChange={(x) => set({ ...v, colors: { ...v.colors, hover: x } })} /></FormRow>
        <FormRow label="Texto (transparente)"><ColorInput value={v.colors.transparentText} onChange={(x) => set({ ...v, colors: { ...v.colors, transparentText: x } })} /></FormRow>
        <FormRow label="Fuente">
          <NativeSelect value={v.fontFamily} onChange={(e) => set({ ...v, fontFamily: e.target.value as "primary" })}>
            <option value="primary">Principal</option>
            <option value="secondary">Secundaria</option>
          </NativeSelect>
        </FormRow>
        <FormRow label="Tamaño"><Input value={v.fontSize} onChange={(e) => set({ ...v, fontSize: e.target.value })} /></FormRow>
        <FormRow label="Peso"><Input type="number" step={100} value={v.fontWeight} onChange={(e) => set({ ...v, fontWeight: Number(e.target.value) })} /></FormRow>
        <FormRow label="Separación enlaces"><Input value={v.gap} onChange={(e) => set({ ...v, gap: e.target.value })} /></FormRow>
        <FormRow label="Padding vertical"><Input value={v.paddingY} onChange={(e) => set({ ...v, paddingY: e.target.value })} /></FormRow>
        <FormRow label="Ancho máximo"><Input value={v.maxWidth} onChange={(e) => set({ ...v, maxWidth: e.target.value })} /></FormRow>
      </Group>
    </div>
  );
}

function SidebarForm({ v, set }: { v: SidebarSettings; set: (v: SidebarSettings) => void }) {
  return (
    <div className="space-y-4">
      <Group title="General">
        <Toggle label="Mostrar sidebar" checked={v.enabled} onChange={(enabled) => set({ ...v, enabled })} />
        <FormRow label="Posición">
          <NativeSelect value={v.position} onChange={(e) => set({ ...v, position: e.target.value as "left" })}>
            <option value="left">Izquierda</option>
            <option value="right">Derecha</option>
          </NativeSelect>
        </FormRow>
        <FormRow label="Ancho"><Input value={v.width} onChange={(e) => set({ ...v, width: e.target.value })} /></FormRow>
        <FormRow label="En tablet y mobile">
          <NativeSelect value={v.mobileBehavior} onChange={(e) => set({ ...v, mobileBehavior: e.target.value as "drawer" })}>
            <option value="drawer">Panel deslizable con botón flotante</option>
            <option value="hidden">Ocultar</option>
          </NativeSelect>
        </FormRow>
        <VisibilityInputs value={v.visibility} onChange={(visibility) => set({ ...v, visibility })} />
      </Group>
      <Group title="Contenido">
        <FormRow label="Logo"><MediaField value={v.logo} onChange={(logo) => set({ ...v, logo })} /></FormRow>
        <FormRow label="Título"><Input value={v.title} onChange={(e) => set({ ...v, title: e.target.value })} /></FormRow>
      </Group>
      <Group title="Enlaces" cols={1}>
        <NavLinksEditor value={v.links} onChange={(links) => set({ ...v, links })} />
      </Group>
      <Group title="Colores" cols={3}>
        <FormRow label="Fondo"><ColorInput value={v.colors.background} onChange={(x) => set({ ...v, colors: { ...v.colors, background: x } })} /></FormRow>
        <FormRow label="Texto"><ColorInput value={v.colors.text} onChange={(x) => set({ ...v, colors: { ...v.colors, text: x } })} /></FormRow>
        <FormRow label="Hover"><ColorInput value={v.colors.hover} onChange={(x) => set({ ...v, colors: { ...v.colors, hover: x } })} /></FormRow>
      </Group>
    </div>
  );
}

function FooterForm({ v, set }: { v: FooterSettings; set: (v: FooterSettings) => void }) {
  return (
    <div className="space-y-4">
      <Group title="General">
        <Toggle label="Mostrar footer" checked={v.enabled} onChange={(enabled) => set({ ...v, enabled })} />
        <VisibilityInputs value={v.visibility} onChange={(visibility) => set({ ...v, visibility })} />
        <FormRow label="Padding vertical"><Input value={v.paddingY} onChange={(e) => set({ ...v, paddingY: e.target.value })} /></FormRow>
        <FormRow label="Ancho máximo"><Input value={v.maxWidth} onChange={(e) => set({ ...v, maxWidth: e.target.value })} /></FormRow>
      </Group>
      <Group title="Fondo">
        <FormRow label="Imagen de fondo (opcional)">
          <MediaField value={v.background.image} onChange={(image) => set({ ...v, background: { ...v.background, image } })} />
        </FormRow>
        <div className="space-y-3">
          <FormRow label="Color de la capa sobre la imagen"><ColorInput value={v.background.overlayColor} onChange={(x) => set({ ...v, background: { ...v.background, overlayColor: x } })} /></FormRow>
          <FormRow label={`Opacidad de la capa: ${Math.round(v.background.overlayOpacity * 100)}%`}>
            <input type="range" min={0} max={1} step={0.05} className="w-full" value={v.background.overlayOpacity} onChange={(e) => set({ ...v, background: { ...v.background, overlayOpacity: Number(e.target.value) } })} />
          </FormRow>
          <p className="text-xs text-muted-foreground">Sin imagen se usa el color de fondo de la sección «Colores».</p>
        </div>
      </Group>
      <Group title="Marca">
        <FormRow label="Logo"><MediaField value={v.logo} onChange={(logo) => set({ ...v, logo })} /></FormRow>
        <div className="space-y-3">
          <ResponsiveInputs label="Alto del logo" value={v.logoHeight} onChange={(logoHeight) => set({ ...v, logoHeight })} />
          <FormRow label="Descripción"><Textarea rows={4} value={v.about} onChange={(e) => set({ ...v, about: e.target.value })} /></FormRow>
          <FormRow label="Copyright" hint="{year} se reemplaza por el año actual"><Input value={v.copyright} onChange={(e) => set({ ...v, copyright: e.target.value })} /></FormRow>
        </div>
      </Group>
      <Group title="Columnas de enlaces" cols={1}>
        {v.columns.map((c, i) => (
          <div key={c.id} className="space-y-2 rounded-md border p-3">
            <div className="flex gap-2">
              <Input value={c.title} onChange={(e) => set({ ...v, columns: v.columns.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })} aria-label="Título de columna" />
              <Button size="icon-sm" variant="ghost" aria-label="Eliminar columna" onClick={() => set({ ...v, columns: v.columns.filter((_, k) => k !== i) })}>
                <Trash2 />
              </Button>
            </div>
            <SimpleLinksEditor value={c.links} onChange={(links) => set({ ...v, columns: v.columns.map((x, k) => (k === i ? { ...x, links } : x)) })} />
          </div>
        ))}
        <div>
          <Button size="sm" variant="outline" onClick={() => set({ ...v, columns: [...v.columns, { id: uid(), title: "Columna", links: [] }] })}>
            <Plus /> Añadir columna
          </Button>
        </div>
      </Group>
      <Group title="Redes sociales" cols={1}>
        <SocialLinksEditor value={v.social} onChange={(social) => set({ ...v, social })} />
      </Group>
      <Group title="Estilo de redes y enlaces" cols={4}>
        <FormRow label="Iconos de redes">
          <NativeSelect value={v.socialStyle.variant} onChange={(e) => set({ ...v, socialStyle: { ...v.socialStyle, variant: e.target.value as "soft" | "circle" } })}>
            <option value="soft">Suaves</option>
            <option value="circle">Círculo de color</option>
          </NativeSelect>
        </FormRow>
        <FormRow label="Fondo del círculo"><ColorInput value={v.socialStyle.background} onChange={(x) => set({ ...v, socialStyle: { ...v.socialStyle, background: x } })} /></FormRow>
        <FormRow label="Color del icono"><ColorInput value={v.socialStyle.color} onChange={(x) => set({ ...v, socialStyle: { ...v.socialStyle, color: x } })} /></FormRow>
        <FormRow label="Tamaño de los enlaces" hint="p. ej. 18px"><Input value={v.linkSize} onChange={(e) => set({ ...v, linkSize: e.target.value })} /></FormRow>
      </Group>
      <Group title="Newsletter (se guarda en la colección «suscritos»)">
        <Toggle label="Mostrar newsletter" checked={v.newsletter.enabled} onChange={(enabled) => set({ ...v, newsletter: { ...v.newsletter, enabled } })} />
        <FormRow label="Título"><Input value={v.newsletter.title} onChange={(e) => set({ ...v, newsletter: { ...v.newsletter, title: e.target.value } })} /></FormRow>
        <FormRow label="Texto"><Textarea rows={3} value={v.newsletter.text} onChange={(e) => set({ ...v, newsletter: { ...v.newsletter, text: e.target.value } })} /></FormRow>
        <div className="space-y-3">
          <FormRow label="Placeholder del correo"><Input value={v.newsletter.placeholder} onChange={(e) => set({ ...v, newsletter: { ...v.newsletter, placeholder: e.target.value } })} /></FormRow>
          <FormRow label="Texto del botón"><Input value={v.newsletter.buttonLabel} onChange={(e) => set({ ...v, newsletter: { ...v.newsletter, buttonLabel: e.target.value } })} /></FormRow>
        </div>
        <FormRow label="Mensaje al suscribirse"><Input value={v.newsletter.successMessage} onChange={(e) => set({ ...v, newsletter: { ...v.newsletter, successMessage: e.target.value } })} /></FormRow>
        <FormRow label="Borde del recuadro"><ColorInput value={v.newsletter.borderColor} onChange={(x) => set({ ...v, newsletter: { ...v.newsletter, borderColor: x } })} /></FormRow>
        <FormRow label="Fondo del botón"><ColorInput value={v.newsletter.buttonBackground} onChange={(x) => set({ ...v, newsletter: { ...v.newsletter, buttonBackground: x } })} /></FormRow>
        <FormRow label="Texto del botón (color)"><ColorInput value={v.newsletter.buttonColor} onChange={(x) => set({ ...v, newsletter: { ...v.newsletter, buttonColor: x } })} /></FormRow>
      </Group>
      <Group title="Barra inferior: enlaces legales" cols={1}>
        <SimpleLinksEditor value={v.legalLinks} onChange={(legalLinks) => set({ ...v, legalLinks })} />
        <p className="text-xs text-muted-foreground">El texto de la derecha es el «Copyright» de la sección Marca.</p>
      </Group>
      <Group title="Colores" cols={4}>
        <FormRow label="Fondo"><ColorInput value={v.colors.background} onChange={(x) => set({ ...v, colors: { ...v.colors, background: x } })} /></FormRow>
        <FormRow label="Texto"><ColorInput value={v.colors.text} onChange={(x) => set({ ...v, colors: { ...v.colors, text: x } })} /></FormRow>
        <FormRow label="Texto suave"><ColorInput value={v.colors.muted} onChange={(x) => set({ ...v, colors: { ...v.colors, muted: x } })} /></FormRow>
        <FormRow label="Enlaces / títulos"><ColorInput value={v.colors.link} onChange={(x) => set({ ...v, colors: { ...v.colors, link: x } })} /></FormRow>
      </Group>
    </div>
  );
}

function SiteForm({ v, set }: { v: SiteSettings; set: (v: SiteSettings) => void }) {
  const [pages, setPages] = useState<PageDoc[]>([]);
  useEffect(() => {
    listPages(db).then(setPages).catch(() => setPages([]));
  }, []);
  return (
    <Group title="Sitio">
      <FormRow label="Nombre del sitio"><Input value={v.siteName} onChange={(e) => set({ ...v, siteName: e.target.value })} /></FormRow>
      <FormRow label="Página de inicio (/)" hint="Debe estar publicada">
        <NativeSelect value={v.homeSlug} onChange={(e) => set({ ...v, homeSlug: e.target.value })}>
          <option value="">Ninguna</option>
          {pages.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.name} (/{p.slug}){p.status !== "published" ? " · sin publicar" : ""}
            </option>
          ))}
        </NativeSelect>
      </FormRow>
      <FormRow label="Idioma"><Input value={v.language} onChange={(e) => set({ ...v, language: e.target.value })} /></FormRow>
      <FormRow label="Favicon"><MediaField value={v.favicon} onChange={(favicon) => set({ ...v, favicon })} /></FormRow>
    </Group>
  );
}

// ---------- Editor ----------
export function SettingsEditor({ settingsKey }: { settingsKey: SettingsKey }) {
  const { actor, can, getIdToken } = useAuth();
  const [all, setAll] = useState<GlobalSettings | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const editable = settingsKey === "site" ? can.admin : can.edit;
  const publishable = settingsKey === "site" ? can.admin : can.publish;

  const load = useCallback(async () => {
    try {
      const [drafts, pub] = await Promise.all([loadSettings(db, "drafts"), loadSettings(db, "published")]);
      // Si no hay borrador todavía, se parte de lo publicado.
      const base = drafts.exists[settingsKey] ? drafts.settings : { ...drafts.settings, [settingsKey]: pub.settings[settingsKey] };
      setAll(base);
      setSaved(JSON.stringify(base[settingsKey]));
      setPublished(pub.exists[settingsKey] ? JSON.stringify(pub.settings[settingsKey]) : null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [settingsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = all ? JSON.stringify(all[settingsKey]) : "";
  const dirty = current !== saved;
  const unpublished = current !== published;

  const set = useMemo(() => (value: GlobalSettings[SettingsKey]) => setAll((prev) => (prev ? { ...prev, [settingsKey]: value } : prev)), [settingsKey]);

  async function save() {
    if (!actor || !all) return false;
    setBusy("save");
    try {
      await saveSettingsDraft(db, actor, settingsKey, all[settingsKey]);
      setSaved(JSON.stringify(all[settingsKey]));
      toast.success("Borrador guardado");
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!actor || !all) return;
    if (dirty && !(await save())) return;
    setBusy("publish");
    try {
      await publishSettings(db, actor, settingsKey);
      await publishSettingsAndRevalidate(getIdToken);
      setPublished(JSON.stringify(all[settingsKey]));
      toast.success("Publicado en todas las páginas");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const meta = TITLES[settingsKey];
  return (
    <>
      <PageHeader
        title={meta.title}
        description={meta.description}
        actions={
          <>
            {unpublished ? <Badge variant="outline">Cambios sin publicar</Badge> : <Badge variant="secondary">Publicado</Badge>}
            {editable ? (
              <Button variant="outline" onClick={save} disabled={!dirty || !!busy} data-testid="settings-save">
                {busy === "save" ? <Loader2 className="animate-spin" /> : <Save />} Guardar borrador
              </Button>
            ) : null}
            {publishable ? (
              <Button onClick={publish} disabled={!!busy || (!unpublished && !dirty)} data-testid="settings-publish">
                {busy === "publish" ? <Loader2 className="animate-spin" /> : <Rocket />} Publicar
              </Button>
            ) : null}
          </>
        }
      />
      {!all ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 p-8 2xl:grid-cols-[minmax(0,1fr)_520px]">
          <fieldset disabled={!editable} className="min-w-0 space-y-4">
            {settingsKey === "theme" ? <ThemeForm v={all.theme} set={set as (v: ThemeSettings) => void} /> : null}
            {settingsKey === "navbar" ? <NavbarForm v={all.navbar} set={set as (v: NavbarSettings) => void} /> : null}
            {settingsKey === "sidebar" ? <SidebarForm v={all.sidebar} set={set as (v: SidebarSettings) => void} /> : null}
            {settingsKey === "footer" ? <FooterForm v={all.footer} set={set as (v: FooterSettings) => void} /> : null}
            {settingsKey === "site" ? <SiteForm v={all.site} set={set as (v: SiteSettings) => void} /> : null}
          </fieldset>
          {settingsKey !== "site" ? (
            <div className="2xl:sticky 2xl:top-6 2xl:self-start">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Vista previa (borrador)</div>
              <div className="overflow-hidden rounded-xl border shadow-sm">
                <SettingsPreview settings={all} settingsKey={settingsKey} />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

function SettingsPreview({ settings, settingsKey }: { settings: GlobalSettings; settingsKey: SettingsKey }) {
  // Vista previa aislada: solo muestra el elemento editado sobre el tema actual.
  const s: GlobalSettings = {
    ...settings,
    navbar: { ...settings.navbar, enabled: settingsKey === "navbar" || settingsKey === "theme" ? settings.navbar.enabled : false, sticky: false, style: "solid" },
    sidebar: { ...settings.sidebar, enabled: settingsKey === "sidebar" && settings.sidebar.enabled },
    footer: { ...settings.footer, enabled: settingsKey === "footer" && settings.footer.enabled },
  };
  return (
    <div className="max-h-[70vh] overflow-auto [&_.lp-shell]:min-h-0 [&_.lp-sidebar]:h-auto [&_.lp-sidebar]:min-h-80">
      <LandingShell settings={s} editing>
        <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
          {settingsKey === "theme" ? (
            <>
              {(["h1", "h2", "h3"] as const).map((H) => (
                <H key={H}>Título {H.toUpperCase()}</H>
              ))}
              <p>Texto base con la fuente principal y el interlineado configurado.</p>
              <p style={{ color: "var(--lp-color-muted)" }}>Texto suave · <a href="#" style={{ color: "var(--lp-color-accent)" }}>enlace de acento</a></p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="lp-btn lp-btn-primary" href="#">Primario</a>
                <a className="lp-btn lp-btn-secondary" href="#">Secundario</a>
                <a className="lp-btn lp-btn-outline" href="#">Contorno</a>
              </div>
            </>
          ) : (
            <div style={{ height: 160, borderRadius: 12, border: "2px dashed var(--lp-color-border)", display: "grid", placeItems: "center", color: "var(--lp-color-muted)" }}>Contenido de la página</div>
          )}
        </div>
      </LandingShell>
    </div>
  );
}
