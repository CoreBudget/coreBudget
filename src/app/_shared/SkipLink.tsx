"use client";

import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";

export default function SkipLink({ targetId = "main-content" }: { targetId?: string }) {
  const t = useTranslations();
  const tokens = useTokens();

  return (
    <a
      href={`#${targetId}`}
      style={{
        position: "absolute",
        left: 8,
        top: -48,
        zIndex: 1300,
        padding: "10px 16px",
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 600,
        textDecoration: "none",
        color: tokens.blueContrast,
        backgroundColor: tokens.blue,
        transition: "top 0.15s ease",
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = "8px";
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = "-48px";
      }}
    >
      {t("common.skipToContent")}
    </a>
  );
}
