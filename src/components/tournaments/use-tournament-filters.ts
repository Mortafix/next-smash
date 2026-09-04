"use client";

import type { SetStateAction } from "react";

import { usePreferencesStore } from "@/hooks/use-preferences-store";
import { readPreferences, writePreferences } from "@/lib/preferences";
import type { TournamentFilters } from "@/lib/tournaments/filters";

export function useTournamentFilters() {
  const preferences = usePreferencesStore();
  const filters = preferences.lastFilters;

  function setFilters(action: SetStateAction<TournamentFilters>) {
    const currentPreferences = readPreferences();
    const current = currentPreferences.lastFilters;
    const next = typeof action === "function" ? action(current) : action;
    writePreferences({ ...currentPreferences, lastFilters: next });
  }

  function updateFilters(patch: Partial<TournamentFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  return { filters, setFilters, updateFilters };
}
