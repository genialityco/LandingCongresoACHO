"use client";

import { ArrowDown, ArrowUp, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NavLink } from "@/lib/model/settings";

type SimpleLink = { id: string; label: string; href: string; newTab: boolean };

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function LinkRow({ link, onChange, onRemove, onUp, onDown, child }: { link: SimpleLink; onChange: (l: SimpleLink) => void; onRemove: () => void; onUp: () => void; onDown: () => void; child?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${child ? "pl-6" : ""}`}>
      {child ? <CornerDownRight className="size-4 shrink-0 text-muted-foreground" /> : null}
      <Input className="h-8" placeholder="Texto" value={link.label} onChange={(e) => onChange({ ...link, label: e.target.value })} aria-label="Texto del enlace" />
      <Input className="h-8 font-mono text-xs" placeholder="/ruta, #ancla o https://" value={link.href} onChange={(e) => onChange({ ...link, href: e.target.value })} aria-label="URL del enlace" />
      <label className="flex shrink-0 items-center gap-1 text-xs" title="Abrir en nueva pestaña">
        <input type="checkbox" checked={link.newTab} onChange={(e) => onChange({ ...link, newTab: e.target.checked })} /> ↗
      </label>
      <Button size="icon-xs" variant="ghost" onClick={onUp} aria-label="Subir">
        <ArrowUp />
      </Button>
      <Button size="icon-xs" variant="ghost" onClick={onDown} aria-label="Bajar">
        <ArrowDown />
      </Button>
      <Button size="icon-xs" variant="ghost" onClick={onRemove} aria-label="Eliminar">
        <Trash2 />
      </Button>
    </div>
  );
}

/** Editor de enlaces con orden y submenús (navbar y sidebar). */
export function NavLinksEditor({ value, onChange, allowChildren = true }: { value: NavLink[]; onChange: (v: NavLink[]) => void; allowChildren?: boolean }) {
  const links = value ?? [];
  const set = (i: number, l: NavLink) => onChange(links.map((x, k) => (k === i ? l : x)));
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={l.id} className="space-y-1.5 rounded-md border p-2">
          <LinkRow
            link={l}
            onChange={(n) => set(i, { ...l, ...n })}
            onRemove={() => onChange(links.filter((_, k) => k !== i))}
            onUp={() => onChange(move(links, i, -1))}
            onDown={() => onChange(move(links, i, 1))}
          />
          {(l.children ?? []).map((c, ci) => (
            <LinkRow
              key={c.id}
              child
              link={c}
              onChange={(n) => set(i, { ...l, children: l.children.map((x, k) => (k === ci ? n : x)) })}
              onRemove={() => set(i, { ...l, children: l.children.filter((_, k) => k !== ci) })}
              onUp={() => set(i, { ...l, children: move(l.children, ci, -1) })}
              onDown={() => set(i, { ...l, children: move(l.children, ci, 1) })}
            />
          ))}
          <label className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
            <input type="checkbox" checked={!!l.highlight} onChange={(e) => set(i, { ...l, highlight: e.target.checked || undefined })} />
            Subrayado por defecto (enlace activo si ninguna sección coincide)
          </label>
          {allowChildren ? (
            <Button size="xs" variant="ghost" onClick={() => set(i, { ...l, children: [...(l.children ?? []), { id: uid(), label: "Subenlace", href: "#", newTab: false }] })}>
              <Plus /> Submenú
            </Button>
          ) : null}
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...links, { id: uid(), label: "Enlace", href: "#", newTab: false, children: [] }])}>
        <Plus /> Añadir enlace
      </Button>
    </div>
  );
}

export function SimpleLinksEditor({ value, onChange }: { value: SimpleLink[]; onChange: (v: SimpleLink[]) => void }) {
  const links = value ?? [];
  return (
    <div className="space-y-1.5">
      {links.map((l, i) => (
        <LinkRow
          key={l.id}
          link={l}
          onChange={(n) => onChange(links.map((x, k) => (k === i ? n : x)))}
          onRemove={() => onChange(links.filter((_, k) => k !== i))}
          onUp={() => onChange(move(links, i, -1))}
          onDown={() => onChange(move(links, i, 1))}
        />
      ))}
      <Button size="xs" variant="outline" onClick={() => onChange([...links, { id: uid(), label: "Enlace", href: "#", newTab: false }])}>
        <Plus /> Enlace
      </Button>
    </div>
  );
}
