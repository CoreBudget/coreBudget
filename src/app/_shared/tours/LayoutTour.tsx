"use client";

import { useIsMobile } from "../../(app)/useIsMobile";
import { useTour, type TourStepDef } from "./useTour";

export default function LayoutTour({
  tourId,
  desktopSteps,
  mobileSteps,
}: {
  tourId: string;
  desktopSteps: TourStepDef[];
  mobileSteps: TourStepDef[];
}) {
  const isMobile = useIsMobile();
  useTour(tourId, isMobile ? mobileSteps : desktopSteps);
  return null;
}
