import { BREAKPOINTS } from "@/lib/model/types";
import { cssValue, flexDecls, gridDecls, MEDIA, responsiveCss, rule } from "../styles/css";
import type { Background } from "../styles/types";
import {
  BackgroundLayer,
  backgroundCss,
  getBlockStyle,
  isEditing,
  rootRef,
  StyleTag,
  type BlockProps,
  type SlotRender,
} from "./shared";

const EMPTY_SLOT = 64;

export type SectionProps = BlockProps<{
  content: SlotRender;
  tag?: "section" | "div" | "header" | "aside";
  contained?: boolean;
  background?: Background;
  ariaLabel?: string;
}>;

export function SectionBlock(p: SectionProps) {
  const s = getBlockStyle(p, {});
  const Tag = p.tag ?? "section";
  const Content = p.content;
  const css =
    s.css +
    backgroundCss(s.selector, p.background) +
    responsiveCss(`${s.selector} > .lp-section-inner`, p.layout, (b) => ({ ...flexDecls(b), "max-width": undefined }));
  return (
    <Tag
      ref={rootRef(p) as never}
      className={`lp-section ${p.contained !== false ? "lp-contained" : ""} ${s.className}`}
      aria-label={p.ariaLabel || undefined}
      {...s.attrs}
    >
      <StyleTag css={css} />
      <BackgroundLayer bg={p.background} isEditing={isEditing(p)} />
      <Content className="lp-section-inner" minEmptyHeight={EMPTY_SLOT} />
    </Tag>
  );
}

export type ContainerProps = BlockProps<{ content: SlotRender }>;

export function ContainerBlock(p: ContainerProps) {
  const s = getBlockStyle(p);
  const Content = p.content;
  const css = s.css + responsiveCss(`${s.selector} > .lp-flow`, p.layout, flexDecls);
  return (
    <div ref={rootRef(p)} className={`lp-container ${s.className}`} {...s.attrs}>
      <StyleTag css={css} />
      <Content className="lp-flow lp-flow-container" minEmptyHeight={EMPTY_SLOT} />
    </div>
  );
}

export type RowProps = BlockProps<{ content: SlotRender }>;

export function RowBlock(p: RowProps) {
  const s = getBlockStyle(p);
  const Content = p.content;
  const css = s.css + responsiveCss(`${s.selector} > .lp-row`, p.layout, flexDecls);
  return (
    <div ref={rootRef(p)} className={`lp-row-outer ${s.className}`} style={{ width: "100%" }} {...s.attrs}>
      <StyleTag css={css} />
      <Content className="lp-row" minEmptyHeight={EMPTY_SLOT} />
    </div>
  );
}

export type ColumnProps = BlockProps<{ content: SlotRender }>;

export function ColumnBlock(p: ColumnProps) {
  const s = getBlockStyle(p, { omit: ["width"] });
  const Content = p.content;
  // Si se define un ancho, la columna deja de repartirse equitativamente. En mobile la fila
  // se apila, así que el ancho de desktop/tablet no se hereda salvo override explícito.
  const flexFor = (w?: string) => (w ? `flex:0 1 ${cssValue(w)}` : "");
  const d = flexFor(p.layout?.desktop?.width);
  const t = flexFor(p.layout?.tablet?.width);
  const m = flexFor(p.layout?.mobile?.width);
  const sel = `.lp-row > ${s.selector}`;
  const css =
    s.css +
    (d ? `@media (min-width:${BREAKPOINTS.mobile + 1}px){${sel}{${d}}}` : "") +
    (t ? `${MEDIA.tablet}{@media (min-width:${BREAKPOINTS.mobile + 1}px){${sel}{${t}}}}` : "") +
    (m ? `${MEDIA.mobile}{${sel}{${m}}}` : "") +
    responsiveCss(`${s.selector} > .lp-flow`, p.layout, flexDecls);
  return (
    <div ref={rootRef(p)} className={`lp-column ${s.className}`} {...s.attrs}>
      <StyleTag css={css} />
      <Content className="lp-flow lp-flow-column" minEmptyHeight={EMPTY_SLOT} />
    </div>
  );
}

export type GridProps = BlockProps<{ content: SlotRender }>;

export function GridBlock(p: GridProps) {
  const s = getBlockStyle(p);
  const Content = p.content;
  const css = s.css + responsiveCss(`${s.selector} > .lp-grid`, p.layout, gridDecls);
  return (
    <div ref={rootRef(p)} className={s.className} style={{ width: "100%" }} {...s.attrs}>
      <StyleTag css={css} />
      <Content className="lp-grid" minEmptyHeight={EMPTY_SLOT} />
    </div>
  );
}

export type DividerProps = BlockProps<{ color?: string; thickness?: string; lineStyle?: "solid" | "dashed" | "dotted" }>;

export function DividerBlock(p: DividerProps) {
  const s = getBlockStyle(p);
  const css =
    s.css +
    rule(`${s.selector} > hr`, {
      "border-top-color": p.color,
      "border-top-width": p.thickness,
      "border-top-style": p.lineStyle,
    });
  return (
    <div ref={rootRef(p)} className={s.className} style={{ width: "100%" }} {...s.attrs}>
      <StyleTag css={css} />
      <hr className="lp-divider" />
    </div>
  );
}

export type SpacerProps = BlockProps;

export function SpacerBlock(p: SpacerProps) {
  const s = getBlockStyle(p);
  return (
    <div ref={rootRef(p)} className={`lp-spacer ${s.className}`} aria-hidden {...s.attrs}>
      <StyleTag css={s.css} />
    </div>
  );
}
