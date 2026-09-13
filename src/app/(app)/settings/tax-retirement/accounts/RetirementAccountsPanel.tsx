"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import SectionHeader from "../../../../admin/_shared/SectionHeader";
import AdminButton from "../../../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { useIsMobile } from "../../../useIsMobile";
import { useToast } from "../../../../_shared/ToastProvider";
import { useServerAction } from "../../../../_shared/useServerAction";
import ConfirmDialog from "../../../../_shared/ConfirmDialog";
import { td } from "@/lib/i18n/translateDynamicKey";
import { formatCurrency } from "@/lib/currency";
import {
  createRetirementAccountAction,
  deleteRetirementAccountAction,
  updateRetirementAccountAction,
} from "../actions";

export interface RetirementAccountRow {
  id: string;
  name: string;
  type: string;
  balance: string;
  contributionPct: string | null;
}

const TYPE_OPTIONS = ["four01k", "ira", "roth_ira", "pension"];
const TYPE_LABEL_KEYS: Record<string, string> = {
  four01k: "settings.taxRetirement.accounts.types.four01k",
  ira: "settings.taxRetirement.accounts.types.ira",
  roth_ira: "settings.taxRetirement.accounts.types.rothIra",
  pension: "settings.taxRetirement.accounts.types.pension",
};

export default function RetirementAccountsPanel({
  locale,
  currencyCode,
  accounts,
}: {
  locale: string | null;
  currencyCode: string;
  accounts: RetirementAccountRow[];
}) {
  const t = useTranslations("settings.taxRetirement.accounts");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { run: runAction } = useServerAction();

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(TYPE_OPTIONS[0]);
  const [newBalance, setNewBalance] = useState("");
  const [newContribution, setNewContribution] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) showToast(td(tRoot, result.error), "error");
      router.refresh();
    });
  }

  function handleAdd() {
    const fd = new FormData();
    fd.set("name", newName);
    fd.set("type", newType);
    fd.set("balance", newBalance || "0");
    fd.set("contributionPct", newContribution);
    runAction(
      () => createRetirementAccountAction({}, fd),
      () => {
        setNewName("");
        setNewType(TYPE_OPTIONS[0]);
        setNewBalance("");
        setNewContribution("");
        router.refresh();
      },
    );
  }

  const total = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  const fieldSx = (basis: number) => ({
    width: isMobile ? "100%" : basis,
    flex: isMobile ? "1 1 100%" : "none",
  });

  return (
    <Box>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} headingLevel="h2" />

      <Typography sx={{ fontSize: 12.5, mb: "14px" }} style={{ color: tokens.textFaint }}>
        {t("total")}{" "}
        <span style={{ color: tokens.textBody, fontWeight: 600 }}>
          {formatCurrency(total, locale, currencyCode)}
        </span>
      </Typography>

      <Stack sx={{ gap: isMobile ? "10px" : "8px", mb: "16px" }}>
        {accounts.map((a) => (
          <Box
            key={a.id}
            sx={
              isMobile
                ? { border: `1px solid ${tokens.border}`, borderRadius: "8px", p: "14px" }
                : {
                    border: `1px solid ${tokens.border}`,
                    borderRadius: "8px",
                    p: "10px 12px",
                  }
            }
            style={{ backgroundColor: tokens.cardBackground }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: isMobile ? "14px" : 1, flexWrap: "wrap" }}
            >
              <TextField
                size="small"
                defaultValue={a.name}
                aria-label={t("namePlaceholder")}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== a.name) {
                    run(() => updateRetirementAccountAction(a.id, "name", name));
                  }
                }}
                sx={{ flex: "1 1 160px" }}
              />
              <TextField
                select
                size="small"
                value={a.type}
                aria-label={t("typeLabel")}
                onChange={(e) =>
                  run(() => updateRetirementAccountAction(a.id, "type", e.target.value))
                }
                sx={fieldSx(140)}
              >
                {TYPE_OPTIONS.map((value) => (
                  <MenuItem key={value} value={value}>
                    {td(tRoot, TYPE_LABEL_KEYS[value])}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label={t("balanceLabel")}
                defaultValue={a.balance}
                onBlur={(e) =>
                  run(() => updateRetirementAccountAction(a.id, "balance", e.target.value))
                }
                sx={fieldSx(130)}
                slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
              />
              <TextField
                size="small"
                label={t("contributionLabel")}
                defaultValue={a.contributionPct ?? ""}
                onBlur={(e) =>
                  run(() => updateRetirementAccountAction(a.id, "contributionPct", e.target.value))
                }
                sx={fieldSx(110)}
                slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
              />
              <IconButton
                size="small"
                title={t("deleteButton")}
                onClick={() => setDeleteTargetId(a.id)}
              >
                <CloseIcon sx={{ fontSize: 16 }} style={{ color: tokens.red }} />
              </IconButton>
            </Stack>
          </Box>
        ))}

        {accounts.length === 0 && (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("empty")}
          </Typography>
        )}
      </Stack>

      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder={t("namePlaceholder")}
          aria-label={t("namePlaceholder")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          sx={{ flex: "1 1 160px" }}
        />
        <TextField
          select
          size="small"
          value={newType}
          aria-label={t("typeLabel")}
          onChange={(e) => setNewType(e.target.value)}
          sx={fieldSx(140)}
        >
          {TYPE_OPTIONS.map((value) => (
            <MenuItem key={value} value={value}>
              {td(tRoot, TYPE_LABEL_KEYS[value])}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          placeholder={t("balancePlaceholder")}
          aria-label={t("balanceLabel")}
          value={newBalance}
          onChange={(e) => setNewBalance(e.target.value)}
          sx={fieldSx(130)}
          slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
        />
        <TextField
          size="small"
          placeholder={t("contributionPlaceholder")}
          aria-label={t("contributionLabel")}
          value={newContribution}
          onChange={(e) => setNewContribution(e.target.value)}
          sx={fieldSx(110)}
          slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
        />
        <AdminButton
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
          onClick={handleAdd}
          disabled={!newName.trim()}
        >
          {t("addButton")}
        </AdminButton>
      </Stack>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title={t("deleteConfirm.title")}
        description={t("deleteConfirm.description")}
        confirmLabel={tRoot("common.delete")}
        cancelLabel={tRoot("common.cancel")}
        onConfirm={() => {
          if (deleteTargetId) run(() => deleteRetirementAccountAction(deleteTargetId));
          setDeleteTargetId(null);
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </Box>
  );
}
