/**
 * Serialización por fragmentos. Firestore limita cada documento a 1 MiB y a 20 niveles de
 * anidamiento, así que las páginas se guardan como JSON en texto y, si superan
 * MAX_CHUNK_BYTES, se dividen en varios documentos "chunks".
 */
export const MAX_CHUNK_BYTES = 700_000;

const encoder = new TextEncoder();

export function byteLength(s: string): number {
  return encoder.encode(s).length;
}

/** Divide un string en fragmentos de como máximo `maxBytes` bytes UTF-8 sin partir caracteres. */
export function splitIntoChunks(json: string, maxBytes = MAX_CHUNK_BYTES): string[] {
  if (byteLength(json) <= maxBytes) return [json];
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const ch of json) {
    const cp = ch.codePointAt(0)!;
    const b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (currentBytes + b > maxBytes) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += ch;
    currentBytes += b;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function joinChunks(chunks: { index: number; json: string }[]): string {
  return [...chunks].sort((a, b) => a.index - b.index).map((c) => c.json).join("");
}

export type SerializedSnapshot = {
  /** Si cabe en un solo documento, se guarda en el documento principal (1 lectura). */
  inline: string | null;
  chunks: string[];
  chunkCount: number;
  byteSize: number;
};

export function serializeSnapshot(value: unknown, maxBytes = MAX_CHUNK_BYTES): SerializedSnapshot {
  const json = JSON.stringify(value);
  const byteSize = byteLength(json);
  const parts = splitIntoChunks(json, maxBytes);
  if (parts.length === 1) return { inline: json, chunks: [], chunkCount: 1, byteSize };
  return { inline: null, chunks: parts, chunkCount: parts.length, byteSize };
}
