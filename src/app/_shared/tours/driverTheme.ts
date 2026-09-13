import type { PopoverDOM } from "driver.js";

export function applyTourPopoverTheme(popover: PopoverDOM, tokens: Record<string, string>) {
  popover.wrapper.style.backgroundColor = tokens.menuBackground;
  popover.wrapper.style.color = tokens.textBody;
  popover.wrapper.style.border = `1px solid ${tokens.borderStrong}`;
  popover.wrapper.style.borderRadius = "10px";
  popover.wrapper.style.boxShadow = tokens.menuShadow;
  popover.wrapper.style.fontFamily = "inherit";

  popover.title.style.color = tokens.textPrimary;
  popover.title.style.fontSize = "15px";
  popover.title.style.fontWeight = "700";

  popover.description.style.color = tokens.textSecondary;
  popover.description.style.fontSize = "13px";
  popover.description.style.lineHeight = "1.5";

  popover.arrow.style.borderColor = "transparent";
  const arrowSide = Array.from(popover.arrow.classList).find((c) =>
    c.startsWith("driver-popover-arrow-side-"),
  );
  if (arrowSide === "driver-popover-arrow-side-top") {
    popover.arrow.style.borderTopColor = tokens.menuBackground;
  } else if (arrowSide === "driver-popover-arrow-side-bottom") {
    popover.arrow.style.borderBottomColor = tokens.menuBackground;
  } else if (arrowSide === "driver-popover-arrow-side-left") {
    popover.arrow.style.borderLeftColor = tokens.menuBackground;
  } else if (arrowSide === "driver-popover-arrow-side-right") {
    popover.arrow.style.borderRightColor = tokens.menuBackground;
  }

  popover.progress.style.color = tokens.textFaint;
  popover.progress.style.fontSize = "11.5px";

  for (const button of [popover.previousButton, popover.nextButton, popover.closeButton]) {
    button.style.backgroundColor = "transparent";
    button.style.textShadow = "none";
    button.style.border = `1px solid ${tokens.borderStrong}`;
    button.style.borderRadius = "6px";
    button.style.color = tokens.textSecondary;
    button.style.fontSize = "12.5px";
    button.style.padding = "5px 10px";
  }

  popover.nextButton.style.backgroundColor = tokens.blue;
  popover.nextButton.style.borderColor = tokens.blue;
  popover.nextButton.style.color = tokens.blueContrast;

  if (popover.previousButton.disabled) {
    popover.previousButton.style.opacity = "0.5";
  }
}
