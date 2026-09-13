"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTokens } from "@/theme";

export default function TopNavLink({ href, children }: { href: string; children: ReactNode }) {
  const tokens = useTokens();
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      style={{
        padding: "8px 12px",
        borderRadius: 6,
        fontSize: 13.5,
        textDecoration: "none",
        color: active ? tokens.textPrimary : tokens.textSecondary,
        fontWeight: active ? 600 : 400,
        background: active ? tokens.hoverBackground : "transparent",
      }}
    >
      {children}
    </Link>
  );
}
