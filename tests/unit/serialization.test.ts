import { describe, expect, it } from "vitest";
import { byteLength, joinChunks, MAX_CHUNK_BYTES, serializeSnapshot, splitIntoChunks } from "@/lib/serialization/chunks";
import {
  cloneWithNewIds,
  collectMediaIds,
  findComponent,
  insertIntoZone,
  mapMediaRefs,
  parsePageData,
  validatePageData,
  walkComponents,
  type ComponentNode,
} from "@/lib/serialization/page-data";
import type { PageData } from "@/lib/model/types";
import { slugify } from "@/lib/utils/slug";

const page = (): PageData =>
  ({
    root: { props: { title: "x" } },
    content: [
      {
        type: "Section",
        props: {
          id: "Section-1",
          background: { type: "image", image: { mediaId: "m-bg", url: "https://old/bg.jpg", path: "shared/images/m-bg/bg.jpg" } },
          content: [
            { type: "Heading", props: { id: "Heading-1", text: "Hola", level: "h2" } },
            {
              type: "Row",
              props: { id: "Row-1", content: [{ type: "Image", props: { id: "Image-1", image: { mediaId: "m-img", url: "https://old/img.jpg" } } }] },
            },
          ],
        },
      },
    ],
  }) as unknown as PageData;

describe("chunks", () => {
  it("no divide contenido pequeño y lo guarda inline", () => {
    const s = serializeSnapshot({ a: 1 });
    expect(s.inline).toBe('{"a":1}');
    expect(s.chunkCount).toBe(1);
  });

  it("divide por bytes UTF-8 sin partir caracteres multibyte y reconstruye igual", () => {
    const text = "ñáé😀".repeat(50_000) + "fin";
    const parts = splitIntoChunks(text, 1000);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(byteLength(p)).toBeLessThanOrEqual(1000);
    expect(joinChunks(parts.map((json, index) => ({ index, json })).reverse())).toBe(text);
  });

  it("páginas grandes superan el umbral y se fragmentan por debajo del límite de Firestore", () => {
    const big = { content: Array.from({ length: 4000 }, (_, i) => ({ type: "Paragraph", props: { id: `p${i}`, text: "x".repeat(300) } })) };
    const s = serializeSnapshot(big);
    expect(s.inline).toBeNull();
    expect(s.chunkCount).toBeGreaterThan(1);
    expect(s.chunks.every((c) => byteLength(c) <= MAX_CHUNK_BYTES && byteLength(c) < 1_048_576)).toBe(true);
    expect(JSON.parse(s.chunks.join(""))).toEqual(big);
  });
});

describe("page-data", () => {
  it("recorre slots anidados", () => {
    const ids: string[] = [];
    walkComponents(page(), (n) => ids.push(n.props.id));
    expect(ids).toEqual(["Section-1", "Heading-1", "Row-1", "Image-1"]);
  });

  it("valida tipos desconocidos, ids duplicados y slots inválidos", () => {
    const bad = page() as unknown as { content: ComponentNode[] };
    bad.content.push({ type: "Desconocido", props: { id: "Heading-1" } });
    bad.content.push({ type: "Section", props: { id: "S2", content: "no-es-lista" } });
    const issues = validatePageData(bad).map((i) => i.message);
    expect(issues).toContain('Tipo de bloque desconocido "Desconocido"');
    expect(issues).toContain('Id duplicado "Heading-1"');
    expect(issues).toContain('El slot "content" debe ser una lista');
    expect(validatePageData(page())).toEqual([]);
  });

  it("rechaza JSON con forma inválida", () => {
    expect(() => parsePageData('{"content": 1}')).toThrow(/inválidos/);
  });

  it("detecta referencias multimedia en cualquier profundidad", () => {
    expect(collectMediaIds(page())).toEqual(["m-bg", "m-img"]);
  });

  it("refresca URLs multimedia sin perder el texto alternativo", () => {
    const out = mapMediaRefs(page(), (ref) => ({ ...ref, url: `https://new/${ref.mediaId}` }));
    expect(findComponent(out, "Image-1")!.props.image).toMatchObject({ url: "https://new/m-img" });
    expect(findComponent(page(), "Image-1")!.props.image).toMatchObject({ url: "https://old/img.jpg" });
  });

  it("clona con ids nuevos en todos los niveles (insertar copia)", () => {
    const original = page().content[0] as ComponentNode;
    const copy = cloneWithNewIds(original);
    const ids = new Set<string>();
    walkComponents({ root: {}, content: [original, copy] } as PageData, (n) => ids.add(n.props.id));
    expect(ids.size).toBe(8);
  });

  it("inserta en un slot anidado y en la raíz", () => {
    const node = { type: "Paragraph", props: { id: "P-new", text: "x" } };
    const nested = insertIntoZone(page(), "Row-1:content", 0, node);
    expect((findComponent(nested, "Row-1")!.props.content as ComponentNode[])[0].props.id).toBe("P-new");
    const root = insertIntoZone(page(), "root:default-zone", 1, node);
    expect((root.content[1] as ComponentNode).props.id).toBe("P-new");
  });
});

describe("slugify", () => {
  it("normaliza acentos y símbolos", () => {
    expect(slugify("  Congreso ACHO 2027: ¡Inscripción!  ")).toBe("congreso-acho-2027-inscripcion");
  });
});
