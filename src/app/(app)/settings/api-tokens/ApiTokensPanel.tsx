"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SectionHeader from "../../../admin/_shared/SectionHeader";
import AdminButton from "../../../admin/_shared/AdminButton";
import AddIcon from "@mui/icons-material/Add";
import BlockIcon from "@mui/icons-material/Block";
import CheckIcon from "@mui/icons-material/Check";
import { useTokens } from "@/theme";
import { useToast } from "../../../_shared/ToastProvider";
import { useServerAction } from "../../../_shared/useServerAction";
import { formatDateTime } from "@/lib/date";
import { createApiTokenAction, revokeApiTokenAction } from "./actions";

export interface ApiTokenRow {
  id: string;
  label: string;
  tokenPreview: string;
  budgetName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiTokenBudgetOption {
  id: string;
  name: string;
  householdName: string;
}

export default function ApiTokensPanel({
  budgets,
  defaultBudgetId,
  timezone,
  dateFormatPreference,
  tokens,
}: {
  budgets: ApiTokenBudgetOption[];
  defaultBudgetId: string;
  timezone: string | null;
  dateFormatPreference: string | null;
  tokens: ApiTokenRow[];
}) {
  const t = useTranslations("settings.apiTokens");
  const tok = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const { pending, run } = useServerAction();

  const [newLabel, setNewLabel] = useState("");
  const [selectedBudgetId, setSelectedBudgetId] = useState(defaultBudgetId);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [newlyCreatedBudgetName, setNewlyCreatedBudgetName] = useState<string | null>(null);

  function handleCreate() {
    const fd = new FormData();
    fd.set("label", newLabel);
    fd.set("budgetId", selectedBudgetId);
    run(
      () => createApiTokenAction({}, fd),
      (result) => {
        setNewLabel("");
        setNewlyCreatedToken(result.token ?? null);
        setNewlyCreatedBudgetName(budgets.find((b) => b.id === selectedBudgetId)?.name ?? null);
        router.refresh();
      },
    );
  }

  function handleRevoke(id: string) {
    run(
      () => revokeApiTokenAction(id),
      () => {
        showToast(t("revokeSuccessToast"), "success");
        router.refresh();
      },
    );
  }

  return (
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} />

      {newlyCreatedToken && (
        <Box
          sx={{
            border: `1px solid ${tok.blue}66`,
            borderRadius: "10px",
            p: "16px",
            mb: "16px",
          }}
          style={{ backgroundColor: tok.cardBackground }}
        >
          <Typography
            sx={{ fontSize: 12.5, fontWeight: 600, mb: "8px" }}
            style={{ color: tok.textBody }}
          >
            {t("revealTitle")}
          </Typography>
          {newlyCreatedBudgetName && (
            <Typography sx={{ fontSize: 11.5, mb: "10px" }} style={{ color: tok.textFaint }}>
              {t("revealBudgetLabel", { budgetName: newlyCreatedBudgetName })}
            </Typography>
          )}
          <Box
            sx={{
              fontFamily: "monospace",
              fontSize: 12.5,
              p: "10px 12px",
              borderRadius: "6px",
              wordBreak: "break-all",
              mb: "10px",
            }}
            style={{ backgroundColor: tok.inputBackground, color: tok.blue }}
          >
            {newlyCreatedToken}
          </Box>
          <AdminButton
            variant="contained"
            startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
            onClick={() => setNewlyCreatedToken(null)}
          >
            {t("doneButton")}
          </AdminButton>
        </Box>
      )}

      <Stack sx={{ gap: "10px", mb: "16px" }}>
        {tokens.map((token) => (
          <Stack
            key={token.id}
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              border: `1px solid ${tok.border}`,
              borderRadius: "8px",
              p: "12px 14px",
            }}
            style={{ backgroundColor: tok.cardBackground }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" sx={{ alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }} style={{ color: tok.textBody }}>
                  {token.label}
                </Typography>
                <Box
                  sx={{
                    borderRadius: "999px",
                    px: "8px",
                    py: "2px",
                    fontSize: 10.5,
                    fontWeight: 600,
                  }}
                  style={{ backgroundColor: `${tok.blue}1f`, color: tok.blue }}
                >
                  {token.budgetName}
                </Box>
              </Stack>
              <Typography
                sx={{ fontSize: 11.5, mt: "2px", fontFamily: "monospace" }}
                style={{ color: tok.textFaint }}
              >
                cb_...{token.tokenPreview}
              </Typography>
              <Typography sx={{ fontSize: 11, mt: "2px" }} style={{ color: tok.textFaint }}>
                {t("createdLabel", {
                  date: formatDateTime(token.createdAt, timezone, dateFormatPreference),
                })}
                {" · "}
                {token.lastUsedAt
                  ? t("lastUsedLabel", {
                      date: formatDateTime(token.lastUsedAt, timezone, dateFormatPreference),
                    })
                  : t("neverUsedLabel")}
              </Typography>
            </Box>
            <AdminButton
              danger
              disabled={pending}
              startIcon={<BlockIcon sx={{ fontSize: 14 }} />}
              onClick={() => handleRevoke(token.id)}
            >
              {t("revokeButton")}
            </AdminButton>
          </Stack>
        ))}

        {tokens.length === 0 && (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tok.textFaint }}>
            {t("empty")}
          </Typography>
        )}
      </Stack>

      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder={t("labelPlaceholder")}
          aria-label={t("labelPlaceholder")}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          sx={{ flex: "1 1 220px" }}
        />
        <TextField
          select
          size="small"
          label={t("budgetLabel")}
          value={selectedBudgetId}
          onChange={(e) => setSelectedBudgetId(e.target.value)}
          sx={{ flex: "1 1 220px" }}
        >
          {budgets.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.householdName} / {b.name}
            </MenuItem>
          ))}
        </TextField>
        <AdminButton
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
          onClick={handleCreate}
          disabled={pending || !newLabel.trim() || !selectedBudgetId}
        >
          {t("createButton")}
        </AdminButton>
      </Stack>
    </Box>
  );
}
