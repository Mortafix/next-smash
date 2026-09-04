import { Oswald, Source_Sans_3 } from "next/font/google";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
});

export const fontVariables = [sourceSans.variable, oswald.variable].join(" ");
