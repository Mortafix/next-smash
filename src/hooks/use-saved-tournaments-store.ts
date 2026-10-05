"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  inspectSavedTournaments,
  type SavedTournamentsInspection,
  savedTournamentsChangedEvent,
  savedTournamentsStorageKey,
} from "@/lib/saved-tournaments";

const emptySnapshot = "empty";
const unavailableSnapshot = "unavailable";
const storedSnapshotPrefix = "stored:";

export type SavedTournamentsStoreState =
  | SavedTournamentsInspection
  | { status: "unavailable"; tournaments: [] };

function subscribe(onStoreChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === null || event.key === savedTournamentsStorageKey) onStoreChange();
  }

  window.addEventListener("storage", onStorage);
  window.addEventListener(savedTournamentsChangedEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(savedTournamentsChangedEvent, onStoreChange);
  };
}

function browserSnapshot() {
  try {
    const stored = window.localStorage.getItem(savedTournamentsStorageKey);
    return stored === null ? emptySnapshot : `${storedSnapshotPrefix}${stored}`;
  } catch {
    return unavailableSnapshot;
  }
}

export function useSavedTournamentsStoreState(): SavedTournamentsStoreState {
  const snapshot = useSyncExternalStore(subscribe, browserSnapshot, () => emptySnapshot);

  return useMemo(() => {
    if (snapshot === unavailableSnapshot) {
      return { status: "unavailable", tournaments: [] };
    }

    return inspectSavedTournaments(
      snapshot === emptySnapshot ? null : snapshot.slice(storedSnapshotPrefix.length),
    );
  }, [snapshot]);
}
