"use client";

import { useEffect } from "react";
import { recordClientErrorAction } from "./errorActions";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    recordClientErrorAction(error.message, error.stack, undefined);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0e12",
          color: "#e4e7eb",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24 }}>
          {/* Hardcoded English, not translated. This replaces the root layout entirely, so
              NextIntlClientProvider (and everything else in it) is unavailable here. */}
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 13.5, color: "#9aa4b2" }}>
            CoreBudget hit an unexpected error. Try reloading the page.
          </p>
        </div>
      </body>
    </html>
  );
}
