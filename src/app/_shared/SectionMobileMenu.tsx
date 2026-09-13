"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useTokens } from "@/theme";

export interface SectionTab {
  href: string;
  label: string;
}

export default function SectionMobileMenu({
  tabs,
  dataTour,
}: {
  tabs: SectionTab[];
  dataTour?: string;
}) {
  const tokens = useTokens();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  function handleOpen(e: MouseEvent<HTMLElement>) {
    setAnchorEl(e.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  return (
    <>
      <IconButton
        onClick={handleOpen}
        aria-label="Open section menu"
        data-tour={dataTour}
        sx={{ display: { xs: "inline-flex", sm: "none" } }}
      >
        <MoreVertIcon style={{ color: tokens.textBody }} />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <MenuItem
              key={tab.href}
              component={Link}
              href={tab.href}
              onClick={handleClose}
              sx={{ fontSize: 13.5, fontWeight: active ? 600 : 400 }}
              style={{ color: active ? tokens.blue : tokens.textBody }}
            >
              {tab.label}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
