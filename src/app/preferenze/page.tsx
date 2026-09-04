import type { Metadata } from "next";

import { PreferencesManager } from "@/components/preferences/preferences-manager";

export const metadata: Metadata = {
  title: "Preferenze",
  description: "Gestisci filtri predefiniti e ricerche tornei salvate nel browser.",
};

export default function PreferencesPage() {
  return <PreferencesManager />;
}
