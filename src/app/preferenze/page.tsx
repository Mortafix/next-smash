import type { Metadata } from "next";

import { PreferencesManager } from "@/components/preferences/preferences-manager";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Preferenze",
  description: "Gestisci filtri predefiniti e ricerche tornei salvate nel browser.",
  path: "/preferenze",
  index: false,
});

export default function PreferencesPage() {
  return <PreferencesManager />;
}
