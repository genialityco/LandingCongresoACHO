import type { CSSProperties, ReactNode } from "react";
import type { DeviceVisibility, GlobalSettings } from "@/lib/model/settings";
import { cssValue, responsiveCss, rule, visibilityCss } from "../styles/css";
import { googleFontsHref, themeCss } from "../styles/theme";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

/** Excepciones por página (props de root en Puck). */
export type PageLayoutOverrides = {
  title?: string;
  navbar?: "global" | "hidden" | "solid" | "transparent";
  sidebar?: "global" | "hidden";
  footer?: "global" | "hidden";
  background?: string;
};

export function visibilityLayout(v: DeviceVisibility) {
  return { desktop: { hidden: !v.desktop }, tablet: { hidden: !v.tablet }, mobile: { hidden: !v.mobile } };
}

export function ThemeStyle({ settings }: { settings: GlobalSettings }) {
  const href = googleFontsHref(settings.theme);
  return (
    <>
      {href ? (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={href} />
        </>
      ) : null}
      <style dangerouslySetInnerHTML={{ __html: themeCss(settings.theme) }} />
    </>
  );
}

export function LandingShell({
  settings,
  overrides = {},
  editing,
  children,
}: {
  settings: GlobalSettings;
  overrides?: PageLayoutOverrides;
  editing?: boolean;
  children: ReactNode;
}) {
  const nav = settings.navbar;
  const showNav = nav.enabled && overrides.navbar !== "hidden";
  const navStyle = overrides.navbar === "solid" || overrides.navbar === "transparent" ? overrides.navbar : nav.style;
  const sidebar = settings.sidebar;
  const showSidebar = sidebar.enabled && overrides.sidebar !== "hidden";
  const showFooter = settings.footer.enabled && overrides.footer !== "hidden";

  let css = "";
  if (showNav) {
    css += responsiveCss(".lp-nav-brand img", nav.logoHeight, (h) => ({ height: h }));
    css += visibilityCss(".lp-nav", visibilityLayout(nav.visibility), editing);
  }
  if (showSidebar) css += visibilityCss(".lp-sidebar", visibilityLayout(sidebar.visibility), editing);
  if (showFooter) css += visibilityCss(".lp-footer", visibilityLayout(settings.footer.visibility), editing);
  if (overrides.background) css += rule(".lp-root", { background: overrides.background });

  return (
    <div className="lp-root lp-shell" style={{ position: "relative" } as CSSProperties}>
      <ThemeStyle settings={settings} />
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {showNav ? <Navbar settings={nav} styleMode={navStyle} editing={editing} /> : null}
      <div className="lp-body" style={{ flexDirection: sidebar.position === "right" ? "row-reverse" : "row" }}>
        {showSidebar ? <Sidebar settings={sidebar} /> : null}
        <main className="lp-main" id="contenido">
          {children}
        </main>
      </div>
      {showFooter ? <Footer settings={settings.footer} /> : null}
    </div>
  );
}

export function cssVar(v?: string) {
  return cssValue(v);
}
