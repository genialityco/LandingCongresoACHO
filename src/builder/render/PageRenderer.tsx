import type { CSSProperties, ReactNode } from "react";
import type { GlobalSettings } from "@/lib/model/settings";
import type { PageData } from "@/lib/model/types";
import type { ComponentNode } from "@/lib/serialization/page-data";
import { REGISTRY } from "../registry";
import { slotsOf } from "../schema";
import { LandingShell, type PageLayoutOverrides } from "../site/LandingShell";

type Ctx = { editing: boolean; depth: number };

function makeSlot(children: unknown, ctx: Ctx) {
  const list = Array.isArray(children) ? (children as ComponentNode[]) : [];
  function Slot({ className, style }: { className?: string; style?: CSSProperties } = {}) {
    return (
      <div className={className} style={style}>
        {list.map((c, i) => (
          <RenderNode key={c.props?.id ?? i} node={c} ctx={{ ...ctx, depth: ctx.depth + 1 }} />
        ))}
      </div>
    );
  }
  return Slot;
}

export function RenderNode({ node, ctx }: { node: ComponentNode; ctx: Ctx }): ReactNode {
  if (!node || ctx.depth > 40) return null;
  if (node.type === "SharedBlock") {
    // El contenido del bloque compartido se incrusta al publicar (props.resolved).
    const resolved = node.props.resolved as ComponentNode | null | undefined;
    return resolved ? <RenderNode node={resolved} ctx={{ ...ctx, depth: ctx.depth + 1 }} /> : null;
  }
  const Component = REGISTRY[node.type as keyof typeof REGISTRY];
  if (!Component) return null;
  const props: Record<string, unknown> = { ...node.props };
  for (const slot of slotsOf(node.type)) props[slot] = makeSlot(props[slot], ctx);
  return <Component {...props} puck={{ isEditing: ctx.editing, dragRef: null }} />;
}

export function renderContent(data: PageData, editing = false) {
  return (data.content as ComponentNode[]).map((n, i) => (
    <RenderNode key={n.props?.id ?? i} node={n} ctx={{ editing, depth: 0 }} />
  ));
}

/**
 * Renderiza una página publicada (o un borrador en la vista previa) sin cargar Puck.
 * Funciona como Server Component y también en cliente.
 */
export function PageRenderer({ data, settings }: { data: PageData; settings: GlobalSettings }) {
  const root = ((data.root as { props?: PageLayoutOverrides })?.props ?? {}) as PageLayoutOverrides;
  return (
    <LandingShell settings={settings} overrides={root}>
      {renderContent(data)}
    </LandingShell>
  );
}
