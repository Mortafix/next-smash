import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { config } from "@fortawesome/fontawesome-svg-core";

import { fontVariables } from "@/app/fonts";
import { AppHeader } from "@/components/shell/app-header";
import { MainContainer } from "@/components/shell/main-container";
import { MobileNavigation } from "@/components/shell/mobile-navigation";
import { SiteFooter } from "@/components/shell/site-footer";
import { absoluteUrl, siteConfig, websiteJsonLd } from "@/lib/site";

import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import "./product.css";

config.autoAddCss = false;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/tornei",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.socialImage.path,
        width: siteConfig.socialImage.width,
        height: siteConfig.socialImage.height,
        alt: siteConfig.socialImage.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: {
      url: absoluteUrl(siteConfig.socialImage.path),
      alt: siteConfig.socialImage.alt,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#006b8f",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="it" className={`${fontVariables} h-full`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
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
