"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { MediaField } from "@/components/admin/media/MediaField";
import type { Device } from "@/lib/model/types";
import type { ContentPosition } from "../../blocks/advanced";
import type { ButtonColors } from "../../blocks/content";
import type { Appearance, Background, VideoSource } from "../../styles/types";
import { ColorControl, compact, DeviceTabs, FieldShell, LengthInput, Row, Section, Segmented, SmallSelect, TextControl, useEditorDevice } from "./controls";

export type AppearanceGroup = "colors" | "typography" | "border" | "effects" | "animation" | "advanced";

export function AppearanceField({
  value,
  onChange,
  groups = ["colors", "typography", "border", "effects", "animation", "advanced"],
  readOnly,
}: {
  value: Appearance | undefined;
  onChange: (v: Appearance) => void;
  groups?: AppearanceGroup[];
  readOnly?: boolean;
}) {
  const a = value ?? {};
  const set = (patch: Partial<Appearance>) => onChange(compact({ ...a, ...patch } as Record<string, unknown>) as Appearance);
  const has = (g: AppearanceGroup) => groups.includes(g);
  return (
    <div className="rounded-md border px-2" data-testid="appearance-field">
      {has("colors") ? (
        <Section title="Colores y fondo" defaultOpen>
          <Row label="Fondo">
            <ColorControl value={a.background} onChange={(v) => set({ background: v })} readOnly={readOnly} />
          </Row>
          <Row label="Texto">
            <ColorControl value={a.color} onChange={(v) => set({ color: v })} readOnly={readOnly} />
          </Row>
          <p className="text-[10px] text-muted-foreground">Admite colores, variables del tema (var(--lp-color-accent)) o degradados.</p>
        </Section>
      ) : null}
      {has("typography") ? (
        <Section title="Tipografía">
          <Row label="Fuente">
            <SmallSelect
              value={a.fontFamily}
              readOnly={readOnly}
              onChange={(v) => set({ fontFamily: v as Appearance["fontFamily"] })}
              options={[
                { value: "primary", label: "Principal (tema)" },
                { value: "secondary", label: "Secundaria (tema)" },
              ]}
            />
          </Row>
          <Row label="Peso">
            <SmallSelect
              value={a.fontWeight}
              readOnly={readOnly}
              onChange={(v) => set({ fontWeight: v })}
              options={["300", "400", "500", "600", "700", "800", "900"].map((w) => ({ value: w, label: w }))}
            />
          </Row>
          <Row label="Estilo">
            <SmallSelect value={a.fontStyle} readOnly={readOnly} onChange={(v) => set({ fontStyle: v as Appearance["fontStyle"] })} options={[{ value: "normal", label: "Normal" }, { value: "italic", label: "Cursiva" }]} />
          </Row>
          <Row label="Espaciado">
            <LengthInput value={a.letterSpacing} onChange={(v) => set({ letterSpacing: v })} units={["em", "px"]} readOnly={readOnly} ariaLabel="Espaciado entre letras" />
          </Row>
          <Row label="Mayúsculas">
            <SmallSelect
              value={a.textTransform}
              readOnly={readOnly}
              onChange={(v) => set({ textTransform: v as Appearance["textTransform"] })}
              options={[
                { value: "none", label: "Ninguna" },
                { value: "uppercase", label: "MAYÚSCULAS" },
                { value: "lowercase", label: "minúsculas" },
                { value: "capitalize", label: "Capitalizar" },
              ]}
            />
          </Row>
        </Section>
      ) : null}
      {has("border") ? (
        <Section title="Borde y sombra">
          <Row label="Grosor">
            <LengthInput value={a.border?.width} onChange={(v) => set({ border: { ...a.border, width: v } })} units={["px"]} readOnly={readOnly} ariaLabel="Grosor del borde" />
          </Row>
          <Row label="Estilo">
            <SmallSelect
              value={a.border?.style}
              readOnly={readOnly}
              onChange={(v) => set({ border: { ...a.border, style: v as "solid" } })}
              options={[
                { value: "solid", label: "Sólido" },
                { value: "dashed", label: "Discontinuo" },
                { value: "dotted", label: "Punteado" },
                { value: "none", label: "Ninguno" },
              ]}
            />
          </Row>
          <Row label="Color">
            <ColorControl value={a.border?.color} onChange={(v) => set({ border: { ...a.border, color: v } })} readOnly={readOnly} />
          </Row>
          <Row label="Radio">
            <LengthInput value={a.border?.radius} onChange={(v) => set({ border: { ...a.border, radius: v } })} units={["px", "%", "rem"]} readOnly={readOnly} ariaLabel="Radio del borde" />
          </Row>
          <Row label="Sombra">
            <SmallSelect
              value={a.shadow}
              readOnly={readOnly}
              onChange={(v) => set({ shadow: v as Appearance["shadow"] })}
              options={[
                { value: "none", label: "Ninguna" },
                { value: "sm", label: "Pequeña" },
                { value: "md", label: "Media" },
                { value: "lg", label: "Grande" },
                { value: "xl", label: "Muy grande" },
                { value: "theme", label: "Del tema" },
              ]}
            />
          </Row>
        </Section>
      ) : null}
      {has("effects") ? (
        <Section title="Efectos y hover">
          <Row label="Opacidad">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={readOnly}
              value={a.opacity ?? 1}
              onChange={(e) => set({ opacity: Number(e.target.value) === 1 ? undefined : Number(e.target.value) })}
              className="w-full"
              aria-label="Opacidad"
            />
          </Row>
          <Row label="Fondo hover">
            <ColorControl value={a.hover?.background} onChange={(v) => set({ hover: { ...a.hover, background: v } })} readOnly={readOnly} />
          </Row>
          <Row label="Texto hover">
            <ColorControl value={a.hover?.color} onChange={(v) => set({ hover: { ...a.hover, color: v } })} readOnly={readOnly} />
          </Row>
          <Row label="Elevar">
            <input type="checkbox" checked={!!a.hover?.lift} disabled={readOnly} onChange={(e) => set({ hover: { ...a.hover, lift: e.target.checked || undefined } })} aria-label="Elevar al pasar el cursor" />
          </Row>
        </Section>
      ) : null}
      {has("animation") ? (
        <Section title="Animación de entrada">
          <Row label="Tipo">
            <SmallSelect
              value={a.animation?.type}
              placeholder="Ninguna"
              readOnly={readOnly}
              onChange={(v) => set({ animation: v ? { ...a.animation, type: v as "fade-in" } : undefined })}
              options={[
                { value: "fade-in", label: "Aparecer" },
                { value: "slide-up", label: "Deslizar hacia arriba" },
                { value: "slide-left", label: "Deslizar desde la derecha" },
                { value: "zoom-in", label: "Acercar" },
              ]}
            />
          </Row>
          {a.animation?.type ? (
            <>
              <Row label="Duración ms">
                <input type="number" className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs" value={a.animation.duration ?? 700} onChange={(e) => set({ animation: { ...a.animation!, duration: Number(e.target.value) } })} />
              </Row>
              <Row label="Retraso ms">
                <input type="number" className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs" value={a.animation.delay ?? 0} onChange={(e) => set({ animation: { ...a.animation!, delay: Number(e.target.value) } })} />
              </Row>
              <p className="text-[10px] text-muted-foreground">Se ve en la página publicada y en la vista previa. Respeta “reducir movimiento”.</p>
            </>
          ) : null}
        </Section>
      ) : null}
      {has("advanced") ? (
        <Section title="Avanzado">
          <Row label="ID ancla">
            <TextControl value={a.anchorId} placeholder="p. ej. beneficios" onChange={(v) => set({ anchorId: v?.replace(/[^a-zA-Z0-9_-]/g, "") })} readOnly={readOnly} />
          </Row>
          <p className="text-[10px] text-muted-foreground">Enlaza desde la navbar con #{a.anchorId || "id"}.</p>
        </Section>
      ) : null}
    </div>
  );
}

// ---------- Video ----------
export function VideoSourceField({ value, onChange, readOnly }: { value: VideoSource | undefined; onChange: (v: VideoSource) => void; readOnly?: boolean }) {
  const v = value ?? { source: "youtube" };
  return (
    <div className="space-y-2">
      <Segmented
        allowEmpty={false}
        value={v.source}
        readOnly={readOnly}
        onChange={(s) => onChange({ ...v, source: s ?? "youtube" })}
        options={[
          { value: "storage", label: "Archivo" },
          { value: "youtube", label: "YouTube" },
          { value: "vimeo", label: "Vimeo" },
          { value: "url", label: "URL" },
        ]}
      />
      {v.source === "storage" ? (
        <MediaField kinds={["video"]} value={v.media} onChange={(m) => onChange({ ...v, media: m })} showAlt={false} readOnly={readOnly} label="Elegir video de Storage" />
      ) : (
        <TextControl
          value={v.url}
          readOnly={readOnly}
          placeholder={v.source === "youtube" ? "https://www.youtube.com/watch?v=…" : v.source === "vimeo" ? "https://vimeo.com/…" : "https://…/video.mp4"}
          onChange={(url) => onChange({ ...v, url })}
        />
      )}
    </div>
  );
}

// ---------- Fondo ----------
export function BackgroundField({ value, onChange, readOnly, types }: { value: Background | undefined; onChange: (v: Background) => void; readOnly?: boolean; types?: Background["type"][] }) {
  const bg: Background = value ?? { type: "none" };
  const [device, setDevice] = useEditorDevice();
  const set = (patch: Partial<Background>) => onChange({ ...bg, ...patch });
  const pos = bg.position?.[device] ?? bg.position?.desktop ?? { x: 50, y: 50 };
  const setPos = (p: { x: number; y: number }) => set({ position: { ...bg.position, [device]: p } });
  const allowed = types ?? ["none", "color", "gradient", "image", "video"];
  const overlay = bg.overlay ?? { enabled: false, color: "#000000", opacity: 0.45 };
  return (
    <div className="space-y-2 rounded-md border p-2" data-testid="background-field">
      <div className="text-xs font-semibold">Fondo</div>
      <SmallSelect
        value={bg.type}
        placeholder="Sin fondo"
        readOnly={readOnly}
        ariaLabel="Tipo de fondo"
        onChange={(t) => set({ type: (t as Background["type"]) ?? "none" })}
        options={[
          { value: "color", label: "Color" },
          { value: "gradient", label: "Degradado" },
          { value: "image", label: "Imagen" },
          { value: "video", label: "Video" },
        ].filter((o) => allowed.includes(o.value as Background["type"]))}
      />
      {bg.type === "color" ? <ColorControl value={bg.color} onChange={(c) => set({ color: c })} readOnly={readOnly} /> : null}
      {bg.type === "gradient" ? <TextControl value={bg.gradient} placeholder="linear-gradient(135deg,#0f172a,#1e3a8a)" onChange={(g) => set({ gradient: g })} readOnly={readOnly} /> : null}
      {bg.type === "image" ? (
        <>
          <MediaField value={bg.image} onChange={(m) => set({ image: m })} showAlt={false} readOnly={readOnly} />
          <FieldShell label="Imagen alternativa para mobile (opcional)">
            <MediaField value={bg.mobileImage} onChange={(m) => set({ mobileImage: m })} showAlt={false} readOnly={readOnly} label="Elegir imagen mobile" />
          </FieldShell>
        </>
      ) : null}
      {bg.type === "video" ? (
        <>
          <VideoSourceField value={bg.video} onChange={(video) => set({ video })} readOnly={readOnly} />
          <FieldShell label="Póster (se muestra mientras carga)">
            <MediaField value={bg.poster} onChange={(m) => set({ poster: m })} showAlt={false} readOnly={readOnly} label="Elegir póster" />
          </FieldShell>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" disabled={readOnly} checked={bg.videoOnMobile !== false} onChange={(e) => set({ videoOnMobile: e.target.checked })} />
            Reproducir video en mobile (si no, muestra el póster)
          </label>
          <p className="text-[10px] text-muted-foreground">El video de fondo se reproduce silenciado y en bucle: es lo que permiten los navegadores para autoplay.</p>
        </>
      ) : null}
      {bg.type === "image" || bg.type === "video" ? (
        <>
          <Row label="Ajuste">
            <SmallSelect
              value={bg.fit}
              placeholder="Cubrir (cover)"
              readOnly={readOnly}
              onChange={(f) => set({ fit: f as Background["fit"] })}
              options={[
                { value: "contain", label: "Contener" },
                { value: "auto", label: "Tamaño original" },
              ]}
            />
          </Row>
          {bg.type === "image" ? (
            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground">Punto focal / recorte por dispositivo</div>
              <DeviceTabs device={device as Device} onChange={setDevice} counts={Object.fromEntries(Object.keys(bg.position ?? {}).map((d) => [d, 1]))} />
              <Row label={`Horizontal ${pos.x}%`}>
                <input type="range" min={0} max={100} value={pos.x} disabled={readOnly} onChange={(e) => setPos({ ...pos, x: Number(e.target.value) })} className="w-full" aria-label="Posición horizontal" />
              </Row>
              <Row label={`Vertical ${pos.y}%`}>
                <input type="range" min={0} max={100} value={pos.y} disabled={readOnly} onChange={(e) => setPos({ ...pos, y: Number(e.target.value) })} className="w-full" aria-label="Posición vertical" />
              </Row>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" disabled={readOnly} checked={!!bg.fixed} onChange={(e) => set({ fixed: e.target.checked })} />
                Fondo fijo (parallax)
              </label>
            </div>
          ) : null}
        </>
      ) : null}
      {bg.type !== "none" ? (
        <div className="space-y-1.5 border-t pt-2">
          <label className="flex items-center gap-2 text-xs font-medium">
            <input type="checkbox" disabled={readOnly} checked={overlay.enabled} onChange={(e) => set({ overlay: { ...overlay, enabled: e.target.checked } })} data-testid="overlay-toggle" />
            Superposición (overlay)
          </label>
          {overlay.enabled ? (
            <>
              <Row label="Color">
                <ColorControl value={overlay.color} onChange={(c) => set({ overlay: { ...overlay, color: c ?? "#000000" } })} readOnly={readOnly} />
              </Row>
              <Row label={`Opacidad ${Math.round(overlay.opacity * 100)}%`}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={overlay.opacity}
                  disabled={readOnly}
                  onChange={(e) => set({ overlay: { ...overlay, opacity: Number(e.target.value) } })}
                  className="w-full"
                  aria-label="Opacidad del overlay"
                />
              </Row>
              <Row label="Degradado">
                <TextControl value={overlay.gradient} placeholder="opcional: linear-gradient(...)" onChange={(g) => set({ overlay: { ...overlay, gradient: g } })} readOnly={readOnly} />
              </Row>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------- Posición del contenido (hero) ----------
const POS: { h: "start" | "center" | "end"; v: "start" | "center" | "end" }[] = (["start", "center", "end"] as const).flatMap((v) =>
  (["start", "center", "end"] as const).map((h) => ({ h, v })),
);

export function ContentPositionField({
  value,
  onChange,
  readOnly,
}: {
  value: Partial<Record<Device, ContentPosition>> | undefined;
  onChange: (v: Partial<Record<Device, ContentPosition>>) => void;
  readOnly?: boolean;
}) {
  const [device, setDevice] = useEditorDevice();
  const v = value ?? {};
  const cur = v[device] ?? {};
  const inh = device === "mobile" ? { ...v.desktop, ...v.tablet } : device === "tablet" ? { ...v.desktop } : {};
  const eff = { ...inh, ...cur };
  const set = (patch: Partial<ContentPosition>) => {
    const next = compact({ ...cur, ...patch } as Record<string, unknown>) as ContentPosition;
    const out = { ...v, [device]: next };
    if (!Object.keys(next).length) delete out[device];
    onChange(out);
  };
  return (
    <div className="space-y-2 rounded-md border p-2" data-testid="content-position-field">
      <div className="text-xs font-semibold">Contenido superpuesto</div>
      <DeviceTabs device={device} onChange={setDevice} counts={Object.fromEntries(Object.entries(v).map(([d, x]) => [d, Object.keys(x ?? {}).length]))} />
      <Row label="Posición">
        <div className="grid w-20 grid-cols-3 gap-0.5" role="radiogroup" aria-label="Posición del contenido">
          {POS.map((p) => {
            const active = eff.h === p.h && eff.v === p.v;
            const own = cur.h === p.h && cur.v === p.v;
            return (
              <button
                key={`${p.v}-${p.h}`}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${p.v} ${p.h}`}
                disabled={readOnly}
                onClick={() => set({ h: p.h, v: p.v })}
                className={`size-6 rounded-sm border ${own ? "border-primary bg-primary" : active ? "border-primary/60 bg-primary/30" : "bg-muted"}`}
              />
            );
          })}
        </div>
      </Row>
      <Row label="Ancho máx.">
        <LengthInput value={cur.maxWidth} placeholder={inh.maxWidth} onChange={(x) => set({ maxWidth: x })} readOnly={readOnly} units={["px", "%", "rem", "vw"]} ariaLabel="Ancho del contenido" />
      </Row>
      <Row label="Separación">
        <LengthInput value={cur.gap} placeholder={inh.gap} onChange={(x) => set({ gap: x })} readOnly={readOnly} units={["px", "rem"]} ariaLabel="Separación entre elementos" />
      </Row>
      <Row label="Texto">
        <Segmented
          value={cur.textAlign}
          readOnly={readOnly}
          onChange={(x) => set({ textAlign: x })}
          options={[
            { value: "left", label: <AlignLeft className="size-3.5" /> },
            { value: "center", label: <AlignCenter className="size-3.5" /> },
            { value: "right", label: <AlignRight className="size-3.5" /> },
          ]}
        />
      </Row>
    </div>
  );
}

// ---------- Colores de botón ----------
export function ButtonColorsField({ value, onChange, readOnly }: { value: ButtonColors | undefined; onChange: (v: ButtonColors) => void; readOnly?: boolean }) {
  const c = value ?? {};
  const set = (patch: Partial<ButtonColors>) => onChange(compact({ ...c, ...patch } as Record<string, unknown>) as ButtonColors);
  return (
    <div className="space-y-1.5 rounded-md border p-2">
      <div className="text-xs font-semibold">Colores personalizados</div>
      <Row label="Fondo">
        <ColorControl value={c.background} onChange={(v) => set({ background: v })} readOnly={readOnly} />
      </Row>
      <Row label="Texto">
        <ColorControl value={c.color} onChange={(v) => set({ color: v })} readOnly={readOnly} />
      </Row>
      <Row label="Borde">
        <ColorControl value={c.border} onChange={(v) => set({ border: v })} readOnly={readOnly} />
      </Row>
      <Row label="Fondo hover">
        <ColorControl value={c.hoverBackground} onChange={(v) => set({ hoverBackground: v })} readOnly={readOnly} />
      </Row>
      <Row label="Texto hover">
        <ColorControl value={c.hoverColor} onChange={(v) => set({ hoverColor: v })} readOnly={readOnly} />
      </Row>
    </div>
  );
}
