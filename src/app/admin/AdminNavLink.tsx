"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTokens } from "@/theme";

export default function AdminNavLink({ href, children }: { href: string; children: ReactNode }) {
  const tokens = useTokens();
  const pathname = usePathname();
  const active = pathname.startsWith(href);

  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "9px 12px",
        borderRadius: 7,
        fontSize: 13.5,
        textDecoration: "none",
        background: active ? `${tokens.blue}24` : "transparent",
        color: active ? tokens.blue : tokens.textSecondary,
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </Link>
  );
}
