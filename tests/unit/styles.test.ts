import { describe, expect, it } from "vitest";
import { buttonCss } from "@/builder/blocks/content";
import { sanitizeRichText, safeHref, parseEmbed } from "@/builder/blocks/shared";
import { anchorDecls, blockCss, cssValue, responsiveCss, visibilityCss } from "@/builder/styles/css";
import { googleFontsHref, themeCss } from "@/builder/styles/theme";
import { EMPTY_SETTINGS } from "@/lib/model/settings";
import { safeFileName, validateMediaFile } from "@/lib/services/media";

describe("CSS seguro", () => {
  it("impide cerrar reglas o escapar de <style>", () => {
    expect(cssValue("red;}</style><script>alert(1)</script>")).not.toMatch(/[<>{};]/);
    expect(cssValue("/* x */ 10px")).not.toContain("/*");
    expect(cssValue("")).toBeUndefined();
  });
});

describe("responsive con herencia desktop → tablet → mobile", () => {
  it("genera reglas base y media queries solo con los overrides", () => {
    const css = responsiveCss(".b", { desktop: { width: "220px" }, mobile: { width: "100%" } }, (b) => ({ width: b.width }));
    expect(css).toBe(".b{width:220px}@media (max-width:640px){.b{width:100%}}");
  });

  it("el botón del ejemplo usa tamaños distintos por dispositivo", () => {
    const css = buttonCss(".lp-btn1", {
      variant: "primary",
      layout: {
        desktop: { width: "220px", height: "52px", align: "start" },
        tablet: { width: "180px", height: "48px", align: "center" },
        mobile: { width: "100%", height: "48px", align: "center" },
      },
    });
    expect(css).toContain(".lp-btn1{justify-content:flex-start}");
    expect(css).toContain(".lp-btn1 > .lp-btn{width:220px;height:52px}");
    expect(css).toContain("@media (max-width:1024px){.lp-btn1{justify-content:center}}");
    expect(css).toContain("@media (max-width:1024px){.lp-btn1 > .lp-btn{width:180px;height:48px}}");
    expect(css).toContain("@media (max-width:640px){.lp-btn1 > .lp-btn{width:100%;height:48px}}");
  });

  it("la visibilidad usa rangos exclusivos (no se hereda) y en el editor solo atenúa", () => {
    const pub = visibilityCss(".x", { mobile: { hidden: true } }, false);
    expect(pub).toBe("@media (max-width:640px){.x{display:none!important}}");
    expect(visibilityCss(".x", { desktop: { hidden: true } }, true)).toContain("@media (min-width:1025px){.x{opacity:.35");
  });

  it("anclaje relativo al contenedor con desplazamientos", () => {
    expect(anchorDecls("bottom-right", "5%", "24px")).toMatchObject({ position: "absolute", right: "calc(-1 * 5%)", bottom: "calc(-1 * 24px)", left: "auto", top: "auto" });
    expect(anchorDecls("center")).toMatchObject({ left: "calc(50% + 0px)", top: "calc(50% + 0px)", translate: "-50% -50%" });
  });

  it("blockCss combina caja, apariencia, hover y visibilidad", () => {
    const css = blockCss("Heading-a1", { desktop: { textAlign: "center" }, tablet: { hidden: true } }, { color: "#fff", hover: { color: "#000" } });
    expect(css).toContain(".lp-Heading-a1{color:#fff}");
    expect(css).toContain(".lp-Heading-a1{text-align:center}");
    expect(css).toContain(".lp-Heading-a1:hover{color:#000}");
    expect(css).toContain("@media (min-width:641px) and (max-width:1024px){.lp-Heading-a1{display:none!important}}");
  });
});

describe("tema global", () => {
  it("expone variables y tamaños responsive de H1", () => {
    const css = themeCss(EMPTY_SETTINGS.theme);
    expect(css).toContain("--lp-color-primary:#111827");
    expect(css).toContain(".lp-root{--lp-h1-size:56px}");
    expect(css).toContain("@media (max-width:640px){.lp-root{--lp-h1-size:34px}}");
  });
  it("construye la URL de Google Fonts sin duplicados y omite fuentes del sistema", () => {
    expect(googleFontsHref({ ...EMPTY_SETTINGS.theme, fonts: { primary: "Inter", secondary: "Inter" } })).toBe(
      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
    );
    expect(googleFontsHref({ ...EMPTY_SETTINGS.theme, fonts: { primary: "system-ui", secondary: "Georgia" } })).toBeNull();
  });
});

describe("contenido seguro", () => {
  it("sanea texto enriquecido", () => {
    const html = sanitizeRichText('<p onclick="x()">Hola<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">l</a></p>');
    expect(html).not.toMatch(/script|onerror|onclick|javascript:|<img/);
    expect(html).toContain("<p>Hola");
  });
  it("solo permite enlaces seguros", () => {
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref("#beneficios")).toBe("#beneficios");
    expect(safeHref("https://x.com")).toBe("https://x.com");
    expect(safeHref("contacto")).toBe("/contacto");
  });
  it("reconoce YouTube y Vimeo", () => {
    expect(parseEmbed("https://youtu.be/dQw4w9WgXcQ")).toEqual({ provider: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseEmbed("https://vimeo.com/123456789")).toEqual({ provider: "vimeo", id: "123456789" });
    expect(parseEmbed("https://evil.com/video")).toBeNull();
  });
});

describe("validación de archivos", () => {
  const f = (name: string, type: string, size = 1000) => ({ name, type, size });
  it("acepta imágenes, videos y PDF válidos", () => {
    expect(validateMediaFile(f("a.png", "image/png")).kind).toBe("image");
    expect(validateMediaFile(f("a.mp4", "video/mp4")).kind).toBe("video");
    expect(validateMediaFile(f("a.pdf", "application/pdf")).kind).toBe("document");
  });
  it("rechaza SVG, ejecutables, extensiones falsas y tamaños excesivos", () => {
    expect(() => validateMediaFile(f("a.svg", "image/svg+xml"))).toThrow();
    expect(() => validateMediaFile(f("a.exe", "application/x-msdownload"))).toThrow();
    expect(() => validateMediaFile(f("foto.exe", "image/png"))).toThrow(/extensión/);
    expect(() => validateMediaFile(f("a.png", "image/png", 11 * 1024 * 1024))).toThrow(/máximo/);
    expect(() => validateMediaFile(f("a.mp4", "video/mp4", 201 * 1024 * 1024))).toThrow(/máximo/);
  });
  it("normaliza nombres para que cumplan la regex de storage.rules", () => {
    const name = safeFileName("Foto Año Nuevo (1).JPG");
    expect(name).toBe("foto-ano-nuevo-1.jpg");
    expect(/^[a-z0-9._-]{1,120}\.(png|jpe?g|webp|gif|avif|mp4|webm|mov|ogv|pdf)$/i.test(name)).toBe(true);
  });
});
