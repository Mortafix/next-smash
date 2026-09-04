"use client";

import { useCallback, useRef, useState } from "react";

import type { TournamentOrigin } from "@/lib/tournaments/filters";

export type CurrentPositionRequestSource = "filters" | "sort";
export type CurrentPositionStatus = "idle" | "loading" | "error";

export type CurrentPositionController = {
  message: string;
  request: (
    source: CurrentPositionRequestSource,
  ) => Promise<TournamentOrigin | null>;
  requestSource: CurrentPositionRequestSource | null;
  status: CurrentPositionStatus;
};

function geolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Posizione non autorizzata. Abilitala nelle impostazioni del browser e riprova.";
  }
  if (error.code === error.TIMEOUT) {
    return "La richiesta della posizione è scaduta. Riprova.";
  }
  return "Posizione non disponibile. Controlla il segnale e riprova.";
}

export function useCurrentPositionController(): CurrentPositionController {
  const [status, setStatus] = useState<CurrentPositionStatus>("idle");
  const [message, setMessage] = useState("");
  const [requestSource, setRequestSource] =
    useState<CurrentPositionRequestSource | null>(null);
  const pendingRequest = useRef<Promise<TournamentOrigin | null> | null>(null);

  const request = useCallback(
    (source: CurrentPositionRequestSource) => {
      if (pendingRequest.current) return pendingRequest.current;

      setMessage("");
      setRequestSource(source);

      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setStatus("error");
        setMessage("La posizione non è disponibile in questo browser.");
        return Promise.resolve(null);
      }

      setStatus("loading");
      const positionRequest = new Promise<TournamentOrigin | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setStatus("idle");
            setMessage("");
            resolve({
              label: "La mia posizione",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            setStatus("error");
            setMessage(geolocationErrorMessage(error));
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
        );
      });

      pendingRequest.current = positionRequest;
      void positionRequest.finally(() => {
        if (pendingRequest.current === positionRequest) {
          pendingRequest.current = null;
        }
      });
      return positionRequest;
    },
    [],
  );

  return { message, request, requestSource, status };
}
