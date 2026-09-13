"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { markTourSeenAction } from "../tourActions";

interface TourStarter {
  start: (() => void) | null;
}

interface TourContextValue {
  hasSeen: (tourId: string) => boolean;
  markSeen: (tourId: string) => void;
  registerTour: (slot: "welcome" | "page", start: (() => void) | null) => void;
  replayWelcomeTour: () => void;
  replayPageTour: () => void;
  hasPageTour: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({
  initialSeenTours,
  children,
}: {
  initialSeenTours: string[];
  children: ReactNode;
}) {
  const [seenTours, setSeenTours] = useState<string[]>(initialSeenTours);
  const [welcomeStarter, setWelcomeStarter] = useState<TourStarter>({ start: null });
  const [pageStarter, setPageStarter] = useState<TourStarter>({ start: null });

  const hasSeen = useCallback((tourId: string) => seenTours.includes(tourId), [seenTours]);

  const markSeen = useCallback(
    (tourId: string) => {
      if (seenTours.includes(tourId)) return;
      setSeenTours((prev) => [...prev, tourId]);
      void markTourSeenAction(tourId);
    },
    [seenTours],
  );

  const registerTour = useCallback((slot: "welcome" | "page", start: (() => void) | null) => {
    const setter = slot === "welcome" ? setWelcomeStarter : setPageStarter;
    setter({ start });
  }, []);

  const replayWelcomeTour = useCallback(() => welcomeStarter.start?.(), [welcomeStarter]);
  const replayPageTour = useCallback(() => pageStarter.start?.(), [pageStarter]);

  const value = useMemo<TourContextValue>(
    () => ({
      hasSeen,
      markSeen,
      registerTour,
      replayWelcomeTour,
      replayPageTour,
      hasPageTour: pageStarter.start !== null,
    }),
    [hasSeen, markSeen, registerTour, replayWelcomeTour, replayPageTour, pageStarter],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTourContext(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTourContext must be used within a TourProvider");
  return ctx;
}
