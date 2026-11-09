/**
 * Metadatos de los bloques independientes de React/Puck (se usan en servidor, cliente,
 * validación y pruebas). Cada tipo declara qué props son slots (componentes anidados)
 * y cuáles son texto enriquecido (HTML saneado).
 */
export type BlockMeta = {
  label: string;
  category: "estructura" | "contenido" | "avanzados";
  slots?: string[];
  richtext?: string[];
};

export const BLOCKS = {
  // Estructura
  Section: { label: "Sección", category: "estructura", slots: ["content"] },
  Container: { label: "Contenedor", category: "estructura", slots: ["content"] },
  Row: { label: "Fila", category: "estructura", slots: ["content"] },
  Column: { label: "Columna", category: "estructura", slots: ["content"] },
  Grid: { label: "Grid", category: "estructura", slots: ["content"] },
  Divider: { label: "Separador", category: "estructura" },
  Spacer: { label: "Espaciador", category: "estructura" },
  // Contenido
  Heading: { label: "Título", category: "contenido" },
  Subtitle: { label: "Subtítulo", category: "contenido" },
  Paragraph: { label: "Párrafo", category: "contenido" },
  RichText: { label: "Texto enriquecido", category: "contenido", richtext: ["body"] },
  Image: { label: "Imagen", category: "contenido" },
  Video: { label: "Video", category: "contenido" },
  Button: { label: "Botón", category: "contenido" },
  Icon: { label: "Icono", category: "contenido" },
  List: { label: "Lista", category: "contenido" },
  Link: { label: "Enlace", category: "contenido" },
  // Avanzados
  HeroImage: { label: "Hero con imagen", category: "avanzados", slots: ["content"] },
  HeroVideo: { label: "Hero con video", category: "avanzados", slots: ["content"] },
  Carousel: { label: "Carrusel", category: "avanzados" },
  Gallery: { label: "Galería", category: "avanzados" },
  Cards: { label: "Tarjetas", category: "avanzados" },
  Testimonials: { label: "Testimonios", category: "avanzados" },
  Stats: { label: "Estadísticas", category: "avanzados" },
  Form: { label: "Formulario", category: "avanzados" },
  Registration: { label: "Inscripción al evento", category: "avanzados" },
  CTA: { label: "CTA", category: "avanzados" },
  FAQ: { label: "FAQ", category: "avanzados" },
  PromoBanner: { label: "Banner promocional", category: "avanzados" },
  Countdown: { label: "Contador", category: "avanzados" },
  OverlayContainer: { label: "Contenedor con superposición", category: "avanzados", slots: ["layers"] },
  OverlayLayer: { label: "Capa superpuesta", category: "avanzados", slots: ["content"] },
  SharedBlock: { label: "Bloque compartido", category: "avanzados" },
} satisfies Record<string, BlockMeta>;

export type BlockType = keyof typeof BLOCKS;

export const BLOCK_TYPES = Object.keys(BLOCKS) as BlockType[];

export function getBlockMeta(type: string): BlockMeta | undefined {
  return (BLOCKS as Record<string, BlockMeta>)[type];
}

export function slotsOf(type: string): string[] {
  return getBlockMeta(type)?.slots ?? [];
}
