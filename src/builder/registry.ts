import type { ComponentType } from "react";
import type { BlockType } from "./schema";
import { CardsBlock, CarouselBlock, CtaBlock, FaqBlock, FormBlock, GalleryBlock, HeroBlock, OverlayContainerBlock, OverlayLayerBlock, PromoBannerBlock, StatsBlock, CountdownBlock, TestimonialsBlock } from "./blocks/advanced";
import { ButtonBlock, HeadingBlock, IconBlock, ImageBlock, LinkBlock, ListBlock, ParagraphBlock, RichTextBlock, SubtitleBlock, VideoBlock } from "./blocks/content";
import { ColumnBlock, ContainerBlock, DividerBlock, GridBlock, RowBlock, SectionBlock, SpacerBlock } from "./blocks/structure";

/**
 * Componentes de render por tipo. Los usan tanto Puck (editor) como PageRenderer
 * (landing pública), así que el resultado visual es el mismo en ambos.
 * SharedBlock se resuelve aparte (en el renderer y en el editor).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const REGISTRY: Record<Exclude<BlockType, "SharedBlock">, ComponentType<any>> = {
  Section: SectionBlock,
  Container: ContainerBlock,
  Row: RowBlock,
  Column: ColumnBlock,
  Grid: GridBlock,
  Divider: DividerBlock,
  Spacer: SpacerBlock,
  Heading: HeadingBlock,
  Subtitle: SubtitleBlock,
  Paragraph: ParagraphBlock,
  RichText: RichTextBlock,
  Image: ImageBlock,
  Video: VideoBlock,
  Button: ButtonBlock,
  Icon: IconBlock,
  List: ListBlock,
  Link: LinkBlock,
  HeroImage: HeroBlock,
  HeroVideo: HeroBlock,
  Carousel: CarouselBlock,
  Gallery: GalleryBlock,
  Cards: CardsBlock,
  Testimonials: TestimonialsBlock,
  Stats: StatsBlock,
  Form: FormBlock,
  CTA: CtaBlock,
  FAQ: FaqBlock,
  PromoBanner: PromoBannerBlock,
  Countdown: CountdownBlock,
  OverlayContainer: OverlayContainerBlock,
  OverlayLayer: OverlayLayerBlock,
};
