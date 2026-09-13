import type { KeyboardEvent } from "react";

/**
 * For a clickable container that can't be a real <button> (e.g. it contains nested
 * interactive controls, which would make nested buttons invalid HTML): activates `handler`
 * on Enter or Space, matching native button behavior, so the container works from a keyboard
 * once `role="button"` and `tabIndex={0}` are also applied to it.
 */
export function activateOnEnterOrSpace(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
}
