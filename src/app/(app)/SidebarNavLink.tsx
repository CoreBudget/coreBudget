"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTokens } from "@/theme";

export default function SidebarNavLink({
  href,
  children,
  muted,
}: {
  href: string;
  children: ReactNode;
  muted?: boolean;
}) {
  const tokens = useTokens();
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "9px 12px",
        borderRadius: 7,
        fontSize: muted ? 13 : 13.5,
        textDecoration: "none",
        marginBottom: 2,
        background: active ? `${tokens.blue}1f` : "transparent",
        color: active ? tokens.blue : muted ? tokens.textMuted : tokens.textSecondary,
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </Link>
  );
}
