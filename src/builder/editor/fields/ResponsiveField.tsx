"use client";

import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Eye, EyeOff, RotateCcw } from "lucide-react";
import type { Device } from "@/lib/model/types";
import type { Anchor, BoxStyle, ResponsiveBox, Sides } from "../../styles/types";
import { compact, DeviceTabs, LengthInput, Row, Section, Segmented, SmallSelect, useEditorDevice } from "./controls";

export type ResponsiveGroup = "size" | "spacing" | "align" | "text" | "flex" | "grid" | "position" | "visibility";

const ORDER: Device[] = ["desktop", "tablet", "mobile"];

/** Valor heredado: mobile ← tablet ← desktop. */
function inheritedValue<K extends keyof BoxStyle>(value: ResponsiveBox, device: Device, key: K): BoxStyle[K] | undefined {
  const idx = ORDER.indexOf(device);
  for (let i = idx - 1; i >= 0; i--) {
    const v = value[ORDER[i]]?.[key];
    if (v !== undefined) return v;
  }
  return undefined;
}

const ANCHORS: Anchor[] = ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"];

export function ResponsiveField({
  value,
  onChange,
  groups,
  readOnly,
  label = "Diseño responsive",
}: {
  value: ResponsiveBox | undefined;
  onChange: (v: ResponsiveBox) => void;
  groups: ResponsiveGroup[];
  readOnly?: boolean;
  label?: string;
}) {
  const [device, setDevice] = useEditorDevice();
  const v = value ?? {};
  const cur = v[device] ?? {};
  const counts = Object.fromEntries(ORDER.map((d) => [d, Object.keys(v[d] ?? {}).length])) as Record<Device, number>;

  const set = <K extends keyof BoxStyle>(key: K, val: BoxStyle[K] | undefined) => {
    const nextDevice = compact({ ...cur, [key]: val } as Record<string, unknown>) as BoxStyle;
    const next: ResponsiveBox = { ...v, [device]: nextDevice };
    if (!Object.keys(nextDevice).length) delete next[device];
    onChange(next);
  };
  const ph = <K extends keyof BoxStyle>(key: K) => {
    const iv = inheritedValue(v, device, key);
    return iv === undefined ? undefined : String(iv);
  };
  const isSet = (key: keyof BoxStyle) => cur[key] !== undefined;
  const has = (g: ResponsiveGroup) => groups.includes(g);

  const sides = (key: "margin" | "padding") => {
    const s: Sides = cur[key] ?? {};
    const inh = (inheritedValue(v, device, key) ?? {}) as Sides;
    const upd = (side: keyof Sides, val?: string) => set(key, compact({ ...s, [side]: val }) as Sides);
    return (
      <div className="grid grid-cols-2 gap-1">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <LengthInput
            key={side}
            ariaLabel={`${key} ${side}`}
            value={s[side]}
            placeholder={inh[side] ?? { top: "↑", right: "→", bottom: "↓", left: "←" }[side]}
            readOnly={readOnly}
            onChange={(val) => upd(side, val)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2 rounded-md border p-2" data-testid="responsive-field">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{label}</span>
        {device !== "desktop" && counts[device] && !readOnly ? (
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              const next = { ...v };
              delete next[device];
              onChange(next);
            }}
            title="Volver a heredar de desktop"
          >
            <RotateCcw className="size-3" /> Restablecer
          </button>
        ) : null}
      </div>
      <DeviceTabs device={device} onChange={setDevice} counts={counts} />
      <p className="text-[10px] text-muted-foreground">
        {device === "desktop" ? "Base para todos los dispositivos." : `Solo ${device}. Lo vacío se hereda de ${device === "tablet" ? "desktop" : "tablet/desktop"}.`}
      </p>

      {has("size") ? (
        <Section title="Dimensiones" defaultOpen>
          <Row label="Ancho" inherited={!isSet("width")}>
            <LengthInput value={cur.width} placeholder={ph("width")} onChange={(x) => set("width", x)} readOnly={readOnly} ariaLabel="Ancho" />
          </Row>
          <Row label="Ancho máx." inherited={!isSet("maxWidth")}>
            <LengthInput value={cur.maxWidth} placeholder={ph("maxWidth")} onChange={(x) => set("maxWidth", x)} readOnly={readOnly} ariaLabel="Ancho máximo" />
          </Row>
          <Row label="Alto" inherited={!isSet("height")}>
            <LengthInput value={cur.height} placeholder={ph("height")} onChange={(x) => set("height", x)} readOnly={readOnly} ariaLabel="Alto" />
          </Row>
          <Row label="Alto mín." inherited={!isSet("minHeight")}>
            <LengthInput value={cur.minHeight} placeholder={ph("minHeight")} onChange={(x) => set("minHeight", x)} readOnly={readOnly} ariaLabel="Alto mínimo" />
          </Row>
        </Section>
      ) : null}

      {has("spacing") ? (
        <Section title="Márgenes y padding">
          <div className="text-[11px] text-muted-foreground">Margen (↑ → ↓ ←)</div>
          {sides("margin")}
          <div className="text-[11px] text-muted-foreground">Padding (↑ → ↓ ←)</div>
          {sides("padding")}
        </Section>
      ) : null}

      {has("align") ? (
        <Section title="Alineación" defaultOpen>
          <Row label="Bloque" inherited={!isSet("align")}>
            <Segmented
              value={cur.align}
              readOnly={readOnly}
              onChange={(x) => set("align", x)}
              options={[
                { value: "start", label: <AlignLeft className="size-3.5" />, title: "Izquierda" },
                { value: "center", label: <AlignCenter className="size-3.5" />, title: "Centro" },
                { value: "end", label: <AlignRight className="size-3.5" />, title: "Derecha" },
                { value: "stretch", label: <AlignJustify className="size-3.5" />, title: "Ancho completo" },
              ]}
            />
          </Row>
          <Row label="Texto" inherited={!isSet("textAlign")}>
            <Segmented
              value={cur.textAlign}
              readOnly={readOnly}
              onChange={(x) => set("textAlign", x)}
              options={[
                { value: "left", label: <AlignLeft className="size-3.5" />, title: "Izquierda" },
                { value: "center", label: <AlignCenter className="size-3.5" />, title: "Centro" },
                { value: "right", label: <AlignRight className="size-3.5" />, title: "Derecha" },
                { value: "justify", label: <AlignJustify className="size-3.5" />, title: "Justificado" },
              ]}
            />
          </Row>
        </Section>
      ) : null}

      {has("text") ? (
        <Section title="Tipografía">
          <Row label="Tamaño" inherited={!isSet("fontSize")}>
            <LengthInput value={cur.fontSize} placeholder={ph("fontSize")} onChange={(x) => set("fontSize", x)} readOnly={readOnly} units={["px", "rem", "em", "vw"]} ariaLabel="Tamaño de fuente" />
          </Row>
          <Row label="Interlineado" inherited={!isSet("lineHeight")}>
            <input
              className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs"
              value={cur.lineHeight ?? ""}
              placeholder={ph("lineHeight") ?? "1.5"}
              readOnly={readOnly}
              onChange={(e) => set("lineHeight", e.target.value || undefined)}
              aria-label="Altura de línea"
            />
          </Row>
        </Section>
      ) : null}

      {has("flex") ? (
        <Section title="Distribución de hijos">
          <p className="text-[10px] text-muted-foreground">
            En una <strong>Fila</strong> (horizontal), «Alinear» mueve los hijos en vertical. En una <strong>Columna</strong> (vertical), «Justificar» es vertical y «Alinear» es horizontal.
          </p>
          <Row label="Separación" inherited={!isSet("gap")}>
            <LengthInput value={cur.gap} placeholder={ph("gap")} onChange={(x) => set("gap", x)} readOnly={readOnly} units={["px", "rem", "%"]} ariaLabel="Separación" />
          </Row>
          <Row label="Dirección" inherited={!isSet("direction")}>
            <SmallSelect
              value={cur.direction}
              placeholder={ph("direction") ? `Heredado (${ph("direction")})` : undefined}
              readOnly={readOnly}
              onChange={(x) => set("direction", x as BoxStyle["direction"])}
              options={[
                { value: "row", label: "Horizontal" },
                { value: "column", label: "Vertical" },
                { value: "row-reverse", label: "Horizontal inversa" },
                { value: "column-reverse", label: "Vertical inversa" },
              ]}
            />
          </Row>
          <Row label="Justificar" inherited={!isSet("justify")}>
            <SmallSelect
              value={cur.justify}
              readOnly={readOnly}
              onChange={(x) => set("justify", x as BoxStyle["justify"])}
              options={[
                { value: "start", label: "Inicio" },
                { value: "center", label: "Centro" },
                { value: "end", label: "Final" },
                { value: "space-between", label: "Espacio entre" },
                { value: "space-around", label: "Espacio alrededor" },
              ]}
            />
          </Row>
          <Row label="Alinear" inherited={!isSet("alignItems")}>
            <SmallSelect
              value={cur.alignItems}
              readOnly={readOnly}
              onChange={(x) => set("alignItems", x as BoxStyle["alignItems"])}
              options={[
                { value: "start", label: "Inicio" },
                { value: "center", label: "Centro" },
                { value: "end", label: "Final" },
                { value: "stretch", label: "Estirar" },
              ]}
            />
          </Row>
          <Row label="Saltar línea" inherited={!isSet("wrap")}>
            <SmallSelect
              value={cur.wrap === undefined ? undefined : cur.wrap ? "1" : "0"}
              readOnly={readOnly}
              onChange={(x) => set("wrap", x === undefined ? undefined : x === "1")}
              options={[
                { value: "1", label: "Sí" },
                { value: "0", label: "No" },
              ]}
            />
          </Row>
        </Section>
      ) : null}

      {has("grid") ? (
        <Section title="Columnas" defaultOpen>
          <Row label="Columnas" inherited={!isSet("columns")}>
            <input
              type="number"
              min={1}
              max={12}
              className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs"
              value={cur.columns ?? ""}
              placeholder={ph("columns")}
              readOnly={readOnly}
              onChange={(e) => set("columns", e.target.value ? Number(e.target.value) : undefined)}
              aria-label="Columnas"
            />
          </Row>
          <Row label="Separación" inherited={!isSet("gap")}>
            <LengthInput value={cur.gap} placeholder={ph("gap")} onChange={(x) => set("gap", x)} readOnly={readOnly} units={["px", "rem"]} ariaLabel="Separación" />
          </Row>
        </Section>
      ) : null}

      {has("position") ? (
        <Section title="Posición" defaultOpen={groups.includes("position") && !groups.includes("size")}>
          {groups.includes("position") ? (
            <Row label="Anclaje" inherited={!isSet("anchor")}>
              <div className="grid w-20 grid-cols-3 gap-0.5" role="radiogroup" aria-label="Anclaje">
                {ANCHORS.map((a) => {
                  const active = (cur.anchor ?? inheritedValue(v, device, "anchor")) === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={cur.anchor === a}
                      aria-label={a}
                      title={a}
                      disabled={readOnly}
                      onClick={() => set("anchor", cur.anchor === a ? undefined : a)}
                      className={`size-6 rounded-sm border ${cur.anchor === a ? "border-primary bg-primary" : active ? "border-primary/60 bg-primary/30" : "bg-muted"}`}
                    />
                  );
                })}
              </div>
            </Row>
          ) : null}
          <Row label="Desplaz. X" inherited={!isSet("offsetX")}>
            <LengthInput value={cur.offsetX} placeholder={ph("offsetX") ?? "0"} onChange={(x) => set("offsetX", x)} readOnly={readOnly} units={["px", "%", "vw"]} ariaLabel="Desplazamiento X" />
          </Row>
          <Row label="Desplaz. Y" inherited={!isSet("offsetY")}>
            <LengthInput value={cur.offsetY} placeholder={ph("offsetY") ?? "0"} onChange={(x) => set("offsetY", x)} readOnly={readOnly} units={["px", "%", "vh"]} ariaLabel="Desplazamiento Y" />
          </Row>
          <Row label="Capa (z)" inherited={!isSet("zIndex")}>
            <input
              type="number"
              className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs"
              value={cur.zIndex ?? ""}
              placeholder={ph("zIndex")}
              readOnly={readOnly}
              onChange={(e) => set("zIndex", e.target.value ? Number(e.target.value) : undefined)}
              aria-label="Orden de capa"
            />
          </Row>
          <Row label="Orden" inherited={!isSet("order")}>
            <input
              type="number"
              className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs"
              value={cur.order ?? ""}
              placeholder={ph("order")}
              readOnly={readOnly}
              onChange={(e) => set("order", e.target.value ? Number(e.target.value) : undefined)}
              aria-label="Orden"
            />
          </Row>
        </Section>
      ) : null}

      {has("visibility") ? (
        <Section title="Visibilidad">
          <div className="grid grid-cols-3 gap-1">
            {ORDER.map((d) => {
              const hidden = !!v[d]?.hidden;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={readOnly}
                  aria-pressed={!hidden}
                  onClick={() => {
                    const dv = compact({ ...(v[d] ?? {}), hidden: hidden ? undefined : true } as Record<string, unknown>) as BoxStyle;
                    const next = { ...v, [d]: dv };
                    if (!Object.keys(dv).length) delete next[d];
                    onChange(next);
                  }}
                  className={`flex flex-col items-center gap-0.5 rounded-md border py-1 text-[10px] ${hidden ? "text-muted-foreground line-through" : ""}`}
                >
                  {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {d}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">Los bloques ocultos se ven atenuados en el editor.</p>
        </Section>
      ) : null}
    </div>
  );
}
