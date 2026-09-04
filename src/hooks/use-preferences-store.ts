"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  emptyPreferences,
  inspectPreferences,
  type PreferencesInspection,
  preferencesChangedEvent,
  preferencesStorageKey,
} from "@/lib/preferences";

const emptySnapshot = "empty";
const unavailableSnapshot = "unavailable";
const storedSnapshotPrefix = "stored:";

export type PreferencesStoreState =
  | PreferencesInspection
  | { status: "unavailable"; preferences: ReturnType<typeof emptyPreferences> };

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(preferencesChangedEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(preferencesChangedEvent, onStoreChange);
  };
}

function browserSnapshot() {
  try {
    const stored = window.localStorage.getItem(preferencesStorageKey);
    return stored === null ? emptySnapshot : `${storedSnapshotPrefix}${stored}`;
  } catch {
    return unavailableSnapshot;
  }
}

export function usePreferencesStoreState(): PreferencesStoreState {
  const snapshot = useSyncExternalStore(
    subscribe,
    browserSnapshot,
    () => emptySnapshot,
  );

  return useMemo(() => {
    if (snapshot === unavailableSnapshot) {
      return { status: "unavailable", preferences: emptyPreferences() };
    }

    if (snapshot === emptySnapshot) return inspectPreferences(null);

    return inspectPreferences(snapshot.slice(storedSnapshotPrefix.length));
  }, [snapshot]);
}

export function usePreferencesStore() {
  return usePreferencesStoreState().preferences;
}
