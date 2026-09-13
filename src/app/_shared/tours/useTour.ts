"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { driver } from "driver.js";
import type { Side, Alignment } from "driver.js";
import { useTokens } from "@/theme";
import { useTourContext } from "./TourProvider";
import { applyTourPopoverTheme } from "./driverTheme";

export interface TourStepDef {
  element: string;
  title: string;
  description: string;
  side?: Side;
  align?: Alignment;
}

export function useTour(
  tourId: string,
  steps: TourStepDef[],
  options?: { auto?: boolean; slot?: "welcome" | "page" },
): { start: () => void } {
  const tokens = useTokens();
  const tRoot = useTranslations();
  const buttonLabels = {
    next: tRoot("tour.next"),
    previous: tRoot("tour.previous"),
    done: tRoot("tour.done"),
  };
  const { hasSeen, markSeen, registerTour } = useTourContext();
  const slot = options?.slot ?? "page";
  const auto = options?.auto ?? true;
  const latest = useRef({ tokens, steps, buttonLabels, markSeen });
  const startRef = useRef<() => void>(() => {});

  useEffect(() => {
    latest.current = { tokens, steps, buttonLabels, markSeen };
  });

  useEffect(() => {
    startRef.current = () => {
      const { tokens: t, steps: s, buttonLabels: labels, markSeen: mark } = latest.current;
      if (s.length === 0) return;
      const instance = driver({
        steps: s.map((step) => ({
          element: step.element,
          popover: {
            title: step.title,
            description: step.description,
            side: step.side,
            align: step.align,
          },
        })),
        showProgress: true,
        skipMissingElement: true,
        allowClose: true,
        overlayColor: "#000000",
        overlayOpacity: 0.65,
        stagePadding: 6,
        stageRadius: 8,
        nextBtnText: labels.next,
        prevBtnText: labels.previous,
        doneBtnText: labels.done,
        onPopoverRender: (popover) => applyTourPopoverTheme(popover, t),
        onDestroyed: () => mark(tourId),
      });
      instance.drive();
    };
  });

  useEffect(() => {
    registerTour(slot, () => startRef.current());
    return () => registerTour(slot, null);
  }, [slot, registerTour, tourId]);

  useEffect(() => {
    if (!auto) return;
    if (steps.length === 0) return;
    if (hasSeen(tourId)) return;
    const timer = setTimeout(() => startRef.current(), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, auto]);

  return { start: () => startRef.current() };
}
