"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SectionHeader from "../../../admin/_shared/SectionHeader";
import { useTokens } from "@/theme";
import { useIsMobile } from "../../useIsMobile";
import { useToast } from "../../../_shared/ToastProvider";
import { td } from "@/lib/i18n/translateDynamicKey";
import { accountTypeLabel, ACCOUNT_TYPE_LABEL_KEYS } from "../../accountTypeLabels";
import {
  moveAccountAction,
  moveAssetAction,
  moveLiabilityAction,
  renameAccountAction,
  renameAssetAction,
  renameLiabilityAction,
  setAccountCardExpirationAction,
  setAccountPaymentDueDayAction,
  setAccountTypeAction,
  setAccountWebsiteAction,
} from "./actions";

const ACCOUNT_TYPE_OPTIONS = Object.keys(ACCOUNT_TYPE_LABEL_KEYS);

export interface AccountRow {
  id: string;
  name: string;
  type: string;
  website?: string | null;
  paymentDueDay?: number | null;
  cardExpiration?: string | null;
}

export interface NetWorthRow {
  id: string;
  name: string;
}

export default function AccountsPanel({
  canEdit,
  cashAccounts,
  creditAccounts,
  assets,
  liabilities,
}: {
  canEdit: boolean;
  cashAccounts: AccountRow[];
  creditAccounts: AccountRow[];
  assets: NetWorthRow[];
  liabilities: NetWorthRow[];
}) {
  const tRoot = useTranslations();
  const t = useTranslations("budgetSettings.accounts");
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) showToast(td(tRoot, result.error), "error");
      router.refresh();
    });
  }

  return (
    <Box>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} headingLevel="h2" />

      <Stack sx={{ gap: "24px" }}>
        <AccountGroup
          title={t("cashAccountsTitle")}
          emptyLabel={t("noCashAccounts")}
          rows={cashAccounts}
          canEdit={canEdit}
          isMobile={isMobile}
          tokens={tokens}
          t={t}
          tRoot={tRoot}
          onRename={(id, name) => run(() => renameAccountAction(id, name))}
          onSetType={(id, type) => run(() => setAccountTypeAction(id, type))}
          onMove={(id, direction) => run(() => moveAccountAction(id, direction))}
          onSetWebsite={(id, website) => run(() => setAccountWebsiteAction(id, website))}
        />
        <AccountGroup
          title={t("creditAccountsTitle")}
          emptyLabel={t("noCreditAccounts")}
          rows={creditAccounts}
          canEdit={canEdit}
          isMobile={isMobile}
          tokens={tokens}
          t={t}
          tRoot={tRoot}
          showPaymentDate
          onRename={(id, name) => run(() => renameAccountAction(id, name))}
          onSetType={(id, type) => run(() => setAccountTypeAction(id, type))}
          onMove={(id, direction) => run(() => moveAccountAction(id, direction))}
          onSetWebsite={(id, website) => run(() => setAccountWebsiteAction(id, website))}
          onSetPaymentDueDay={(id, paymentDueDay) =>
            run(() => setAccountPaymentDueDayAction(id, paymentDueDay))
          }
          onSetCardExpiration={(id, cardExpiration) =>
            run(() => setAccountCardExpirationAction(id, cardExpiration))
          }
        />

        <Box>
          <Typography
            sx={{ fontSize: 15, fontWeight: 700, mb: "10px" }}
            style={{ color: tokens.textBody }}
          >
            {t("netWorthOrderTitle")}
          </Typography>
          <Stack sx={{ gap: "16px" }}>
            <NetWorthGroup
              title={t("assetsTitle")}
              emptyLabel={t("noAssets")}
              rows={assets}
              canEdit={canEdit}
              tokens={tokens}
              onMove={(id, direction) => run(() => moveAssetAction(id, direction))}
              onRename={(id, name) => run(() => renameAssetAction(id, name))}
            />
            <NetWorthGroup
              title={t("liabilitiesTitle")}
              emptyLabel={t("noLiabilities")}
              rows={liabilities}
              canEdit={canEdit}
              tokens={tokens}
              onMove={(id, direction) => run(() => moveLiabilityAction(id, direction))}
              onRename={(id, name) => run(() => renameLiabilityAction(id, name))}
            />
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function AccountGroup({
  title,
  emptyLabel,
  rows,
  canEdit,
  isMobile,
  tokens,
  t,
  tRoot,
  showPaymentDate,
  onRename,
  onSetType,
  onMove,
  onSetWebsite,
  onSetPaymentDueDay,
  onSetCardExpiration,
}: {
  title: string;
  emptyLabel: string;
  rows: AccountRow[];
  canEdit: boolean;
  isMobile: boolean;
  tokens: Record<string, string>;
  t: ReturnType<typeof useTranslations<"budgetSettings.accounts">>;
  tRoot: ReturnType<typeof useTranslations>;
  showPaymentDate?: boolean;
  onRename: (id: string, name: string) => void;
  onSetType: (id: string, type: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onSetWebsite: (id: string, website: string) => void;
  onSetPaymentDueDay?: (id: string, paymentDueDay: string) => void;
  onSetCardExpiration?: (id: string, cardExpiration: string) => void;
}) {
  return (
    <Box
      sx={{ border: `1px solid ${tokens.border}`, borderRadius: "8px", p: "12px" }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      <Typography
        sx={{ fontSize: 13, fontWeight: 600, mb: rows.length ? "10px" : 0 }}
        style={{ color: tokens.textBody }}
      >
        {title}
      </Typography>

      {rows.length === 0 && (
        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
          {emptyLabel}
        </Typography>
      )}

      <Stack sx={{ gap: isMobile ? "10px" : "6px" }}>
        {rows.map((row, index) => (
          <Box
            key={row.id}
            sx={
              isMobile
                ? { border: `1px solid ${tokens.border}`, borderRadius: "8px", p: "14px" }
                : undefined
            }
          >
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: isMobile ? "14px" : 1, flexWrap: "wrap" }}
            >
              {canEdit ? (
                <>
                  <IconButton
                    size="small"
                    disabled={index === 0}
                    onClick={() => onMove(row.id, "up")}
                    aria-label={td(tRoot, "common.moveUp")}
                  >
                    <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === rows.length - 1}
                    onClick={() => onMove(row.id, "down")}
                    aria-label={td(tRoot, "common.moveDown")}
                  >
                    <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <TextField
                    size="small"
                    defaultValue={row.name}
                    aria-label={t("accountNameLabel")}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== row.name) onRename(row.id, name);
                    }}
                    sx={{ flex: 1 }}
                    slotProps={{ htmlInput: { style: { fontSize: 12.5 } } }}
                  />
                  {isMobile && <Box sx={{ flexBasis: "100%", height: 0 }} />}
                  <TextField
                    select
                    size="small"
                    value={row.type}
                    aria-label={t("accountTypeLabel")}
                    onChange={(e) => onSetType(row.id, e.target.value)}
                    sx={{ width: isMobile ? "100%" : 160, flex: isMobile ? "1 1 100%" : "none" }}
                  >
                    {ACCOUNT_TYPE_OPTIONS.map((value) => (
                      <MenuItem key={value} value={value}>
                        {td(tRoot, ACCOUNT_TYPE_LABEL_KEYS[value])}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label={t("websiteLabel")}
                    placeholder="e.g., chase.com"
                    defaultValue={row.website ?? ""}
                    onBlur={(e) => onSetWebsite(row.id, e.target.value)}
                    sx={{ width: isMobile ? "100%" : 170, flex: isMobile ? "1 1 100%" : "none" }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  {showPaymentDate && (
                    <TextField
                      type="number"
                      size="small"
                      label={t("paymentDueDayLabel")}
                      placeholder="1-31"
                      defaultValue={row.paymentDueDay ?? ""}
                      onBlur={(e) => onSetPaymentDueDay?.(row.id, e.target.value)}
                      sx={{
                        width: isMobile ? "100%" : 120,
                        flex: isMobile ? "1 1 100%" : "none",
                      }}
                      slotProps={{
                        htmlInput: { min: 1, max: 31, step: 1 },
                        inputLabel: { shrink: true },
                      }}
                    />
                  )}
                  {row.type === "credit" && (
                    <TextField
                      size="small"
                      label={t("cardExpirationLabel")}
                      placeholder="MM/YYYY"
                      defaultValue={row.cardExpiration ?? ""}
                      onBlur={(e) => onSetCardExpiration?.(row.id, e.target.value)}
                      sx={{
                        width: isMobile ? "100%" : 130,
                        flex: isMobile ? "1 1 100%" : "none",
                      }}
                      slotProps={{
                        htmlInput: { maxLength: 7, inputMode: "numeric" },
                        inputLabel: { shrink: true },
                      }}
                    />
                  )}
                </>
              ) : (
                <>
                  <Typography sx={{ fontSize: 12.5, flex: 1 }} style={{ color: tokens.textBody }}>
                    {row.name}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12, width: isMobile ? "100%" : 160 }}
                    style={{ color: tokens.textMuted }}
                  >
                    {accountTypeLabel(tRoot, row.type)}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12, width: isMobile ? "100%" : 170 }}
                    style={{ color: tokens.textMuted }}
                  >
                    {row.website || t("noWebsite")}
                  </Typography>
                  {showPaymentDate && (
                    <Typography
                      sx={{ fontSize: 12, width: isMobile ? "100%" : 120 }}
                      style={{ color: tokens.textMuted }}
                    >
                      {row.paymentDueDay
                        ? t("paymentDueDayValue", { day: row.paymentDueDay })
                        : t("noPaymentDueDate")}
                    </Typography>
                  )}
                  {row.type === "credit" && (
                    <Typography
                      sx={{ fontSize: 12, width: isMobile ? "100%" : 130 }}
                      style={{ color: tokens.textMuted }}
                    >
                      {row.cardExpiration || t("noCardExpiration")}
                    </Typography>
                  )}
                </>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function NetWorthGroup({
  title,
  emptyLabel,
  rows,
  canEdit,
  tokens,
  onMove,
  onRename,
}: {
  title: string;
  emptyLabel: string;
  rows: NetWorthRow[];
  canEdit: boolean;
  tokens: Record<string, string>;
  onMove: (id: string, direction: "up" | "down") => void;
  onRename: (id: string, name: string) => void;
}) {
  const tRoot = useTranslations();
  return (
    <Box
      sx={{ border: `1px solid ${tokens.border}`, borderRadius: "8px", p: "12px" }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      <Typography
        sx={{ fontSize: 13, fontWeight: 600, mb: rows.length ? "10px" : 0 }}
        style={{ color: tokens.textBody }}
      >
        {title}
      </Typography>

      {rows.length === 0 && (
        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
          {emptyLabel}
        </Typography>
      )}

      <Stack sx={{ gap: "6px" }}>
        {rows.map((row, index) => (
          <Stack key={row.id} direction="row" sx={{ alignItems: "center", gap: 1 }}>
            {canEdit && (
              <>
                <IconButton
                  size="small"
                  disabled={index === 0}
                  onClick={() => onMove(row.id, "up")}
                  aria-label={td(tRoot, "common.moveUp")}
                >
                  <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={index === rows.length - 1}
                  onClick={() => onMove(row.id, "down")}
                  aria-label={td(tRoot, "common.moveDown")}
                >
                  <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </>
            )}
            {canEdit ? (
              <TextField
                size="small"
                defaultValue={row.name}
                aria-label={td(tRoot, "budgetSettings.accounts.itemNameLabel")}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== row.name) onRename(row.id, name);
                }}
                sx={{ flex: 1 }}
                slotProps={{ htmlInput: { style: { fontSize: 12.5 } } }}
              />
            ) : (
              <Typography sx={{ fontSize: 12.5, flex: 1 }} style={{ color: tokens.textBody }}>
                {row.name}
              </Typography>
            )}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
