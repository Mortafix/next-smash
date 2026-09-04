import type { Metadata } from "next";

const SITE_URL = "https://smash.moris.dev";

export const siteConfig = {
  name: "NextSmash",
  tagline: "Trova il prossimo torneo",
  title: "NextSmash — Trova il prossimo torneo",
  description:
    "Trova e confronta i prossimi tornei individuali di padel FITP e TPRA in Italia per data, livello e distanza.",
  url: SITE_URL,
  locale: "it_IT",
  language: "it-IT",
  socialImage: {
    path: "/brand/nextsmash-social-card.png",
    width: 1200,
    height: 630,
    alt: "NextSmash — Trova il prossimo torneo",
  },
} as const;

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}`;
  index?: boolean;
};

export function absoluteUrl(path: `/${string}`) {
  return new URL(path, siteConfig.url).toString();
}

export function buildPageMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetadataOptions): Metadata {
  const socialTitle = `${title} | ${siteConfig.name}`;
  const socialImage = {
    url: siteConfig.socialImage.path,
    width: siteConfig.socialImage.width,
    height: siteConfig.socialImage.height,
    alt: siteConfig.socialImage.alt,
  };

  return {
    title,
    description,
    ...(index ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url: path,
      siteName: siteConfig.name,
      title: socialTitle,
      description,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: {
        url: absoluteUrl(siteConfig.socialImage.path),
        alt: siteConfig.socialImage.alt,
      },
    },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: siteConfig.language,
  image: absoluteUrl(siteConfig.socialImage.path),
};
