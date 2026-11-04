import type { GlobalSettings } from "@/lib/model/settings";
import { EMPTY_SETTINGS } from "@/lib/model/settings";
import type { MediaRef, PageData } from "@/lib/model/types";
import { newBlockId, type ComponentNode } from "@/lib/serialization/page-data";

/**
 * Datos de demostración y plantillas base. Se escriben UNA vez en Firestore mediante el
 * inicializador; a partir de ahí todo se edita desde el panel y la landing solo lee Firestore.
 */

type Props = Record<string, unknown>;
const n = (type: string, props: Props = {}): ComponentNode => ({ type, props: { id: newBlockId(type), ...props } });

export type MediaMap = Record<string, MediaRef | null>;

const heading = (text: string, level = "h2", extra: Props = {}) => n("Heading", { text, level, layout: {}, appearance: {}, ...extra });
const subtitle = (text: string, extra: Props = {}) => n("Subtitle", { text, layout: {}, appearance: {}, ...extra });
const paragraph = (text: string, extra: Props = {}) => n("Paragraph", { text, layout: {}, appearance: {}, ...extra });
const button = (label: string, href: string, variant = "primary", extra: Props = {}) =>
  n("Button", { label, href, variant, newTab: false, icon: "", iconPosition: "right", layout: {}, appearance: {}, ...extra });
const section = (content: ComponentNode[], extra: Props = {}) =>
  n("Section", { content, contained: true, tag: "section", background: { type: "none" }, layout: {}, appearance: {}, ...extra });
const center = { desktop: { textAlign: "center", align: "center" } };

/** Botones del hero con tamaños distintos por dispositivo (ejemplo del requerimiento). */
const heroButtonLayout = (desktopAlign: "start" | "center") => ({
  desktop: { width: "220px", height: "52px", align: desktopAlign },
  tablet: { width: "180px", height: "48px", align: "center" },
  mobile: { width: "100%", height: "48px", align: "stretch" },
});

export function demoSettings(m: MediaMap): GlobalSettings {
  const base = structuredClone(EMPTY_SETTINGS);
  return {
    theme: {
      ...base.theme,
      fonts: { primary: "Inter", secondary: "Montserrat" },
      colors: {
        primary: "#0b3c5d",
        secondary: "#0f172a",
        accent: "#0d9488",
        text: "#0f172a",
        muted: "#5b6b80",
        background: "#ffffff",
        surface: "#f4f8fb",
        border: "#dbe5ee",
      },
      buttons: {
        ...base.theme.buttons,
        radius: "999px",
        primary: { background: "#0d9488", color: "#ffffff", border: "#0d9488", hoverBackground: "#0f766e", hoverColor: "#ffffff" },
        secondary: { background: "#0b3c5d", color: "#ffffff", border: "#0b3c5d", hoverBackground: "#082c45", hoverColor: "#ffffff" },
        outline: { background: "transparent", color: "#0b3c5d", border: "#0b3c5d", hoverBackground: "#0b3c5d", hoverColor: "#ffffff" },
      },
    },
    navbar: {
      ...base.navbar,
      enabled: true,
      style: "transparent",
      sticky: true,
      logo: m["demo-logo-light"] ?? null,
      logoText: "Congreso ACHO",
      links: [
        { id: "l1", label: "Beneficios", href: "#beneficios", newTab: false, children: [] },
        { id: "l2", label: "El congreso", href: "#congreso", newTab: false, children: [] },
        {
          id: "l3",
          label: "Contenido",
          href: "#galeria",
          newTab: false,
          children: [
            { id: "l3a", label: "Galería", href: "#galeria", newTab: false },
            { id: "l3b", label: "Video", href: "#video", newTab: false },
            { id: "l3c", label: "Preguntas frecuentes", href: "#faq", newTab: false },
          ],
        },
        { id: "l4", label: "Contacto", href: "#inscripcion", newTab: false, children: [] },
      ],
      buttons: [{ id: "b1", label: "Inscríbete", href: "#inscripcion", variant: "primary" }],
      colors: { background: "#0b3c5d", text: "#ffffff", hover: "#5eead4", transparentText: "#ffffff" },
      fontFamily: "primary",
      collapseAt: "tablet",
      mobileMenu: "drawer",
    },
    sidebar: {
      ...base.sidebar,
      enabled: false,
      title: "Congreso ACHO",
      logo: m["demo-logo-light"] ?? null,
      links: [
        { id: "s1", label: "Inicio", href: "#", newTab: false, children: [] },
        { id: "s2", label: "Beneficios", href: "#beneficios", newTab: false, children: [] },
        { id: "s3", label: "Inscripción", href: "#inscripcion", newTab: false, children: [] },
      ],
      colors: { background: "#0b3c5d", text: "#e2e8f0", hover: "#5eead4" },
    },
    footer: {
      ...base.footer,
      enabled: true,
      logo: m["demo-logo-light"] ?? null,
      about: "Un espacio de encuentro para la comunidad científica: actualización académica, investigación e intercambio entre especialistas.",
      columns: [
        {
          id: "c1",
          title: "Congreso",
          links: [
            { id: "c1a", label: "Beneficios", href: "#beneficios", newTab: false },
            { id: "c1b", label: "Galería", href: "#galeria", newTab: false },
            { id: "c1c", label: "Preguntas frecuentes", href: "#faq", newTab: false },
          ],
        },
        {
          id: "c2",
          title: "Participa",
          links: [
            { id: "c2a", label: "Inscripción", href: "#inscripcion", newTab: false },
            { id: "c2b", label: "Contacto", href: "mailto:contacto@example.com", newTab: false },
          ],
        },
      ],
      social: [
        { id: "so1", network: "facebook", url: "https://facebook.com" },
        { id: "so2", network: "instagram", url: "https://instagram.com" },
        { id: "so3", network: "linkedin", url: "https://linkedin.com" },
      ],
      copyright: "© {year} Congreso ACHO. Todos los derechos reservados.",
      colors: { background: "#06243a", text: "#e2e8f0", muted: "#94a3b8", link: "#ffffff" },
    },
    site: { siteName: "Congreso ACHO", homeSlug: "demo", favicon: null, language: "es" },
  };
}

export function demoPage(m: MediaMap): PageData {
  const gallery = [1, 2, 3, 4, 5, 6].map((i) => ({ image: m[`demo-gallery-${i}`] ?? null, caption: ["Plenaria", "Talleres", "Póster científico", "Networking", "Simposio", "Clausura"][i - 1] }));
  return {
    root: { props: { title: "Demo", navbar: "global", sidebar: "global", footer: "global" } as Props },
    content: [
      // 2-5. Hero con video de fondo, overlay oscuro, texto superpuesto y dos botones.
      n("HeroVideo", {
        ariaLabel: "Presentación del congreso",
        background: {
          type: "video",
          video: { source: "storage", media: m["demo-hero-video"] ?? null },
          poster: m["demo-hero-poster"] ?? null,
          videoOnMobile: false,
          overlay: { enabled: true, color: "#041a2b", opacity: 0.62 },
        },
        contentPosition: {
          desktop: { h: "start", v: "center", maxWidth: "700px", textAlign: "left", gap: "22px" },
          tablet: { h: "center", textAlign: "center", maxWidth: "620px" },
          mobile: { h: "center", textAlign: "center", gap: "16px" },
        },
        layout: { desktop: { minHeight: "760px", padding: { top: "96px" } }, tablet: { minHeight: "640px" }, mobile: { minHeight: "580px" } },
        appearance: { color: "#ffffff" },
        content: [
          subtitle("Edición 2027 · Ciencia, innovación y comunidad", { appearance: { color: "#5eead4" } }),
          heading("Congreso ACHO: el encuentro que impulsa el conocimiento", "h1", { appearance: { color: "#ffffff" } }),
          paragraph("Conferencias magistrales, talleres prácticos y espacios de investigación para especialistas, residentes y equipos de salud.", {
            layout: { desktop: { fontSize: "19px" }, mobile: { fontSize: "16px" } },
            appearance: { color: "rgba(255,255,255,.88)" },
          }),
          n("Row", {
            layout: { desktop: { gap: "14px", direction: "row", wrap: true }, tablet: { justify: "center" }, mobile: { direction: "column", gap: "12px" } },
            appearance: {},
            content: [
              button("Inscríbete ahora", "#inscripcion", "primary", { icon: "arrow-right", layout: heroButtonLayout("start") }),
              button("Ver programa", "#congreso", "custom", {
                colors: { background: "transparent", color: "#ffffff", border: "#ffffff", hoverBackground: "#ffffff", hoverColor: "#0b3c5d" },
                layout: heroButtonLayout("start"),
              }),
            ],
          }),
        ],
      }),
      n("Section", {
        contained: true,
        tag: "section",
        background: { type: "color", color: "#0b3c5d" },
        layout: { desktop: { padding: { top: "40px", bottom: "40px" } } },
        appearance: { color: "#ffffff" },
        content: [
          n("Stats", {
            items: [
              { value: "3", label: "días de programa" },
              { value: "40+", label: "conferencistas" },
              { value: "25", label: "talleres prácticos" },
              { value: "1.500", label: "asistentes esperados" },
            ],
            layout: { desktop: { columns: 4 }, tablet: { columns: 2 }, mobile: { columns: 2 } },
            appearance: {},
          }),
        ],
      }),
      // 6. Beneficios
      section(
        [
          subtitle("Por qué asistir", { layout: center }),
          heading("Beneficios de participar", "h2", { layout: center }),
          paragraph("Una agenda diseñada para actualizar la práctica clínica y conectar con colegas de todo el país.", { layout: { desktop: { textAlign: "center", align: "center", maxWidth: "640px" } }, appearance: { color: "var(--lp-color-muted)" } }),
          n("Cards", {
            media: "icon",
            items: [
              { icon: "graduation", title: "Actualización académica", text: "Sesiones con evidencia reciente y guías de manejo aplicables a la consulta.", linkLabel: "", href: "" },
              { icon: "users", title: "Comunidad y networking", text: "Encuentros con especialistas, grupos de investigación y sociedades científicas.", linkLabel: "", href: "" },
              { icon: "award", title: "Certificación", text: "Certificado de asistencia y participación en talleres para tu desarrollo profesional.", linkLabel: "", href: "" },
              { icon: "lightbulb", title: "Investigación", text: "Presenta tus trabajos en la sesión de pósteres y recibe retroalimentación.", linkLabel: "", href: "" },
              { icon: "mic", title: "Conferencias magistrales", text: "Invitados nacionales e internacionales en sesiones plenarias.", linkLabel: "", href: "" },
              { icon: "calendar", title: "Agenda flexible", text: "Elige los talleres y simposios que mejor se ajustan a tu práctica.", linkLabel: "", href: "" },
            ],
            layout: { desktop: { columns: 3, gap: "24px", margin: { top: "16px" } }, tablet: { columns: 2 }, mobile: { columns: 1 } },
            appearance: { animation: { type: "slide-up", duration: 700 } },
          }),
        ],
        { appearance: { anchorId: "beneficios" } },
      ),
      // 7. Imagen y texto
      section(
        [
          n("Row", {
            layout: { desktop: { gap: "56px", alignItems: "center", direction: "row" }, tablet: { gap: "32px" }, mobile: { direction: "column", gap: "24px" } },
            appearance: {},
            content: [
              n("Column", {
                layout: { desktop: { width: "50%" } },
                appearance: {},
                content: [n("Image", { image: m["demo-about"] ?? null, alt: "Asistentes en una sesión plenaria del congreso", aspectRatio: "4/3", fit: "cover", radius: "20px", caption: "", layout: {}, appearance: { shadow: "lg", border: { radius: "20px" } } })],
              }),
              n("Column", {
                layout: { desktop: { width: "50%", gap: "18px" } },
                appearance: {},
                content: [
                  subtitle("El congreso"),
                  heading("Tres días para compartir avances y experiencias", "h2"),
                  paragraph("El programa combina plenarias, simposios por áreas y talleres en grupos pequeños, con espacios para la discusión de casos y la presentación de investigación.", { appearance: { color: "var(--lp-color-muted)" } }),
                  n("List", {
                    style: "icon",
                    icon: "check-circle",
                    iconColor: "#0d9488",
                    items: [{ text: "Plenarias con expertos invitados" }, { text: "Talleres prácticos con cupos limitados" }, { text: "Sesión de pósteres y premios a la investigación" }],
                    layout: {},
                    appearance: {},
                  }),
                  button("Reserva tu cupo", "#inscripcion", "secondary", { layout: { desktop: { align: "start" }, mobile: { align: "stretch" } } }),
                ],
              }),
            ],
          }),
        ],
        { background: { type: "color", color: "#f4f8fb" }, appearance: { anchorId: "congreso" } },
      ),
      // 8. Galería multimedia
      section(
        [
          subtitle("Galería", { layout: center }),
          heading("Así se vive el congreso", "h2", { layout: center }),
          n("Gallery", { images: gallery, aspect: "4/3", lightbox: true, layout: { desktop: { columns: 3, gap: "16px" }, tablet: { columns: 2 }, mobile: { columns: 1 } }, appearance: {} }),
        ],
        { appearance: { anchorId: "galeria" } },
      ),
      // 9. Video incrustado
      section(
        [
          heading("Revive la edición anterior", "h2", { layout: center }),
          n("Video", {
            video: { source: "storage", media: m["demo-hero-video"] ?? null },
            poster: m["demo-hero-poster"] ?? null,
            title: "Resumen en video del congreso",
            aspectRatio: "16/9",
            autoplay: false,
            muted: false,
            loop: false,
            controls: true,
            radius: "20px",
            layout: { desktop: { maxWidth: "960px", align: "center" } },
            appearance: { shadow: "xl" },
          }),
          paragraph("El bloque de video admite archivos de Firebase Storage, YouTube y Vimeo; se carga solo al pulsar reproducir.", { layout: { desktop: { textAlign: "center", align: "center", maxWidth: "620px" } }, appearance: { color: "var(--lp-color-muted)" } }),
        ],
        { background: { type: "color", color: "#f4f8fb" }, appearance: { anchorId: "video" } },
      ),
      section(
        [
          heading("Preguntas frecuentes", "h2", { layout: center }),
          n("FAQ", {
            openFirst: true,
            items: [
              { question: "¿Quién puede inscribirse?", answer: "Profesionales de la salud, residentes y estudiantes del área." },
              { question: "¿Se entrega certificado?", answer: "Sí, se entrega certificado digital de asistencia." },
              { question: "¿Hay tarifas para grupos?", answer: "Escríbenos desde el formulario y te enviaremos las opciones disponibles." },
            ],
            layout: { desktop: { maxWidth: "820px", align: "center" } },
            appearance: {},
          }),
        ],
        { appearance: { anchorId: "faq" } },
      ),
      // 10. CTA con imagen de fondo
      section(
        [
          n("CTA", {
            background: { type: "image", image: m["demo-cta-bg"] ?? null, position: { desktop: { x: 50, y: 40 } }, overlay: { enabled: true, color: "#04263d", opacity: 0.7 } },
            eyebrow: "Cupos limitados",
            title: "Asegura tu lugar en el Congreso ACHO",
            text: "Completa el formulario y nuestro equipo te enviará la información de inscripción.",
            buttons: [
              { label: "Quiero inscribirme", href: "#formulario", variant: "primary" },
              { label: "Escríbenos", href: "mailto:contacto@example.com", variant: "outline" },
            ],
            align: "center",
            layout: { desktop: { padding: { top: "88px", bottom: "88px" } } },
            appearance: { border: { radius: "24px" } },
          }),
          n("Container", {
            layout: { desktop: { maxWidth: "620px", align: "center", gap: "16px", margin: { top: "24px" } } },
            appearance: { anchorId: "formulario" },
            content: [
              heading("Solicita información", "h3", { layout: center }),
              n("Form", {
                formId: "inscripcion-demo",
                fields: [
                  { label: "Nombre completo", name: "nombre", type: "text", required: true, placeholder: "" },
                  { label: "Correo", name: "email", type: "email", required: true, placeholder: "" },
                  { label: "Especialidad", name: "especialidad", type: "select", required: false, placeholder: "Selecciona", options: "Hematología, Oncología, Residente, Otra" },
                  { label: "Mensaje", name: "mensaje", type: "textarea", required: false, placeholder: "" },
                ],
                submitLabel: "Enviar solicitud",
                successMessage: "¡Gracias! Te contactaremos pronto.",
                buttonVariant: "primary",
                layout: {},
                appearance: {},
              }),
            ],
          }),
        ],
        { appearance: { anchorId: "inscripcion" } },
      ),
    ],
  };
}

// ---------- Plantillas base ----------
const placeholderHero = (title: string, sub: string, m: MediaMap, imageId: string) =>
  n("HeroImage", {
    background: { type: "image", image: m[imageId] ?? null, overlay: { enabled: true, color: "#000000", opacity: 0.5 } },
    contentPosition: { desktop: { h: "start", v: "center", maxWidth: "640px", textAlign: "left" }, mobile: { h: "center", textAlign: "center" } },
    layout: { desktop: { minHeight: "620px" }, mobile: { minHeight: "480px" } },
    appearance: { color: "#ffffff" },
    content: [
      heading(title, "h1", { appearance: { color: "#ffffff" } }),
      paragraph(sub, { appearance: { color: "rgba(255,255,255,.88)" } }),
      n("Row", {
        layout: { desktop: { gap: "12px", direction: "row", wrap: true }, mobile: { direction: "column" } },
        appearance: {},
        content: [button("Acción principal", "#", "primary", { layout: heroButtonLayout("start") }), button("Acción secundaria", "#", "outline", { layout: heroButtonLayout("start"), appearance: {} })],
      }),
    ],
  });

const cards = (titles: string[], icons: string[]) =>
  n("Cards", {
    media: "icon",
    items: titles.map((t, i) => ({ icon: icons[i % icons.length], title: t, text: "Describe este punto en una o dos frases.", linkLabel: "", href: "" })),
    layout: { desktop: { columns: 3, gap: "24px" }, tablet: { columns: 2 }, mobile: { columns: 1 } },
    appearance: {},
  });

export function templates(m: MediaMap): { id: string; name: string; category: string; description: string; data: PageData }[] {
  const root = { props: { title: "", navbar: "global", sidebar: "global", footer: "global" } as Props };
  return [
    {
      id: "tpl-corporativa",
      name: "Corporativa",
      category: "corporativa",
      description: "Hero, servicios, sobre nosotros, cifras, testimonios y contacto.",
      data: {
        root,
        content: [
          placeholderHero("Soluciones para tu organización", "Presenta tu propuesta de valor en una frase clara.", m, "demo-cta-bg"),
          section([subtitle("Servicios", { layout: center }), heading("Lo que hacemos", "h2", { layout: center }), cards(["Consultoría", "Implementación", "Soporte"], ["briefcase", "settings", "shield"])]),
          section([n("Stats", { items: [{ value: "15", label: "años" }, { value: "300+", label: "clientes" }, { value: "98%", label: "satisfacción" }], layout: { desktop: { columns: 3 }, mobile: { columns: 1 } }, appearance: {} })], { background: { type: "color", color: "#f4f8fb" } }),
          section([heading("Lo que dicen nuestros clientes", "h2", { layout: center }), n("Testimonials", { items: [{ quote: "Un equipo comprometido con resultados.", name: "Nombre Apellido", role: "Cargo, Empresa", avatar: m["demo-avatar-1"] ?? null, rating: 5 }, { quote: "Excelente acompañamiento en todo el proceso.", name: "Nombre Apellido", role: "Cargo, Empresa", avatar: m["demo-avatar-2"] ?? null, rating: 5 }], layout: { desktop: { columns: 2 }, mobile: { columns: 1 } }, appearance: {} })]),
          section([n("CTA", { background: { type: "color", color: "#0b3c5d" }, title: "Hablemos de tu proyecto", text: "Te respondemos en menos de 24 horas.", buttons: [{ label: "Contactar", href: "#", variant: "primary" }], align: "center", layout: {}, appearance: {} })]),
        ],
      },
    },
    {
      id: "tpl-producto",
      name: "Producto",
      category: "producto",
      description: "Lanzamiento de producto con beneficios, galería, FAQ y CTA.",
      data: {
        root,
        content: [
          placeholderHero("Tu producto, en una frase", "Explica el problema que resuelve y para quién.", m, "demo-gallery-2"),
          section([heading("Características principales", "h2", { layout: center }), cards(["Rápido", "Seguro", "Fácil de usar"], ["zap", "lock", "thumbs-up"])]),
          section([heading("Galería", "h2", { layout: center }), n("Gallery", { images: [1, 2, 3].map((i) => ({ image: m[`demo-gallery-${i}`] ?? null, caption: "" })), aspect: "4/3", lightbox: true, layout: { desktop: { columns: 3 }, tablet: { columns: 2 }, mobile: { columns: 1 } }, appearance: {} })]),
          section([heading("Preguntas frecuentes", "h2", { layout: center }), n("FAQ", { items: [{ question: "¿Cómo funciona?", answer: "Explica el funcionamiento." }, { question: "¿Cuánto cuesta?", answer: "Indica precios o planes." }], openFirst: true, layout: { desktop: { maxWidth: "800px", align: "center" } }, appearance: {} })]),
          section([n("CTA", { background: { type: "gradient", gradient: "linear-gradient(135deg,#0d9488,#0b3c5d)" }, title: "Pruébalo hoy", text: "Sin compromiso.", buttons: [{ label: "Comprar", href: "#", variant: "primary" }], align: "center", layout: {}, appearance: {} })]),
        ],
      },
    },
    {
      id: "tpl-curso",
      name: "Curso",
      category: "curso",
      description: "Curso u online: temario, docentes, testimonios e inscripción.",
      data: {
        root,
        content: [
          placeholderHero("Nombre del curso", "Aprende X en Y semanas con proyectos reales.", m, "demo-gallery-4"),
          section([
            n("Row", {
              layout: { desktop: { gap: "48px", direction: "row", alignItems: "center" }, mobile: { direction: "column" } },
              appearance: {},
              content: [
                n("Column", { layout: { desktop: { width: "55%" } }, appearance: {}, content: [heading("Qué aprenderás", "h2"), n("List", { style: "icon", icon: "check", iconColor: "", items: [{ text: "Módulo 1" }, { text: "Módulo 2" }, { text: "Módulo 3" }, { text: "Proyecto final" }], layout: {}, appearance: {} })] }),
                n("Column", { layout: { desktop: { width: "45%" } }, appearance: {}, content: [n("Image", { image: m["demo-about"] ?? null, alt: "", aspectRatio: "4/3", fit: "cover", radius: "16px", layout: {}, appearance: {} })] }),
              ],
            }),
          ]),
          section([heading("Testimonios", "h2", { layout: center }), n("Testimonials", { items: [{ quote: "Aprendí muchísimo.", name: "Estudiante", role: "Cohorte 2026", avatar: m["demo-avatar-3"] ?? null, rating: 5 }], layout: { desktop: { columns: 1, maxWidth: "640px", align: "center" } }, appearance: {} })]),
          section([heading("Inscripción", "h2", { layout: center }), n("Form", { formId: "curso", fields: [{ label: "Nombre", name: "nombre", type: "text", required: true }, { label: "Correo", name: "email", type: "email", required: true }], submitLabel: "Inscribirme", successMessage: "¡Gracias!", buttonVariant: "primary", layout: { desktop: { maxWidth: "520px", align: "center" } }, appearance: {} })]),
        ],
      },
    },
    {
      id: "tpl-evento",
      name: "Evento",
      category: "evento",
      description: "Evento o congreso: hero con video, agenda, ponentes, galería y registro.",
      data: {
        root,
        content: [
          n("HeroVideo", {
            background: { type: "video", video: { source: "storage", media: m["demo-hero-video"] ?? null }, poster: m["demo-hero-poster"] ?? null, overlay: { enabled: true, color: "#000000", opacity: 0.55 } },
            contentPosition: { desktop: { h: "center", v: "center", maxWidth: "760px", textAlign: "center" } },
            layout: { desktop: { minHeight: "700px" }, mobile: { minHeight: "520px" } },
            appearance: { color: "#ffffff" },
            content: [subtitle("Fecha · Ciudad", { appearance: { color: "#5eead4" } }), heading("Nombre del evento", "h1", { appearance: { color: "#ffffff" } }), button("Regístrate", "#registro", "primary", { layout: heroButtonLayout("center") })],
          }),
          section([heading("Agenda", "h2", { layout: center }), cards(["Día 1 · Apertura", "Día 2 · Talleres", "Día 3 · Clausura"], ["calendar", "mic", "trophy"])]),
          section([heading("Galería", "h2", { layout: center }), n("Carousel", { slides: [4, 5, 6].map((i) => ({ image: m[`demo-gallery-${i}`] ?? null, title: "", text: "", buttonLabel: "", buttonHref: "" })), autoplay: true, interval: 5000, showArrows: true, showDots: true, ariaLabel: "Galería del evento", layout: { desktop: { height: "520px" }, mobile: { height: "320px" } }, appearance: {} })]),
          section([heading("Registro", "h2", { layout: center }), n("Form", { formId: "registro", fields: [{ label: "Nombre", name: "nombre", type: "text", required: true }, { label: "Correo", name: "email", type: "email", required: true }], submitLabel: "Registrarme", successMessage: "¡Registro recibido!", buttonVariant: "primary", layout: { desktop: { maxWidth: "520px", align: "center" } }, appearance: {} })], { appearance: { anchorId: "registro" } }),
        ],
      },
    },
  ];
}
