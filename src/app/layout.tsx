import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { config } from "@fortawesome/fontawesome-svg-core";

import { fontVariables } from "@/app/fonts";
import { AppHeader } from "@/components/shell/app-header";
import { MainContainer } from "@/components/shell/main-container";
import { MobileNavigation } from "@/components/shell/mobile-navigation";
import { SiteFooter } from "@/components/shell/site-footer";

import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import "./product.css";

config.autoAddCss = false;

export const metadata: Metadata = {
  title: {
    default: "NextSmash",
    template: "%s | NextSmash",
  },
  description:
    "Trova e confronta i tornei agonistici di padel FITP e TPRA in Italia.",
};

export const viewport: Viewport = {
  themeColor: "#006b8f",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="it" className={`${fontVariables} h-full`}>
      <body>
        <a className="skip-link" href="#contenuto-principale">
          Vai al contenuto
        </a>
        <div className="app-shell">
          <AppHeader />
          <MainContainer>{children}</MainContainer>
          <SiteFooter />
          <MobileNavigation />
        </div>
      </body>
    </html>
  );
}
