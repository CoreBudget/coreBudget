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
import SectionHeader from "../../../admin/_shared/SectionHeader";
import AdminButton from "../../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { useIsMobile } from "../../useIsMobile";
import { useToast } from "../../../_shared/ToastProvider";
import { useServerAction } from "../../../_shared/useServerAction";
import ConfirmDialog from "../../../_shared/ConfirmDialog";
import ClickableText from "../../../_shared/ClickableText";
import { td } from "@/lib/i18n/translateDynamicKey";
import {
  createJobAction,
  deleteJobAction,
  renameJobAction,
  setJobPayPeriodAction,
  toggleJobActiveAction,
} from "./actions";

export interface JobRow {
  id: string;
  name: string;
  payPeriodType: string;
  isActive: boolean;
}

const PAY_PERIOD_OPTIONS = ["weekly", "bi_weekly", "semi_monthly", "monthly"];
const PAY_PERIOD_LABEL_KEYS: Record<string, string> = {
  weekly: "settings.jobs.payPeriodTypes.weekly",
  bi_weekly: "settings.jobs.payPeriodTypes.biWeekly",
  semi_monthly: "settings.jobs.payPeriodTypes.semiMonthly",
  monthly: "settings.jobs.payPeriodTypes.monthly",
};

export default function JobsPanel({ jobs }: { jobs: JobRow[] }) {
  const t = useTranslations("settings.jobs");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { run: runAction } = useServerAction();

  const [newName, setNewName] = useState("");
  const [newPayPeriod, setNewPayPeriod] = useState(PAY_PERIOD_OPTIONS[0]);
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
    fd.set("payPeriodType", newPayPeriod);
    runAction(
      () => createJobAction({}, fd),
      () => {
        setNewName("");
        setNewPayPeriod(PAY_PERIOD_OPTIONS[0]);
        router.refresh();
      },
    );
  }

  const fieldSx = (basis: number) => ({
    width: isMobile ? "100%" : basis,
    flex: isMobile ? "1 1 100%" : "none",
  });

  return (
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} />

      <Stack sx={{ gap: isMobile ? "10px" : "8px", mb: "16px" }}>
        {jobs.map((job) => (
          <Box
            key={job.id}
            sx={{
              border: `1px solid ${tokens.border}`,
              borderRadius: "8px",
              p: isMobile ? "14px" : "10px 12px",
            }}
            style={{ backgroundColor: tokens.cardBackground, opacity: job.isActive ? 1 : 0.55 }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: isMobile ? "14px" : 1, flexWrap: "wrap" }}
            >
              <TextField
                size="small"
                defaultValue={job.name}
                aria-label={t("namePlaceholder")}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== job.name) run(() => renameJobAction(job.id, name));
                }}
                sx={{ flex: "1 1 160px" }}
              />
              <TextField
                select
                size="small"
                value={job.payPeriodType}
                aria-label={t("payPeriodLabel")}
                onChange={(e) => run(() => setJobPayPeriodAction(job.id, e.target.value))}
                sx={fieldSx(220)}
              >
                {PAY_PERIOD_OPTIONS.map((value) => (
                  <MenuItem key={value} value={value}>
                    {td(tRoot, PAY_PERIOD_LABEL_KEYS[value])}
                  </MenuItem>
                ))}
              </TextField>
              <ClickableText
                onClick={() => run(() => toggleJobActiveAction(job.id))}
                sx={{ fontSize: 11.5, cursor: "pointer", flex: "none" }}
                style={{ color: job.isActive ? tokens.green : tokens.textFaint }}
              >
                {job.isActive ? t("activeStatus") : t("inactiveStatus")}
              </ClickableText>
              <IconButton
                size="small"
                title={t("deleteButton")}
                onClick={() => setDeleteTargetId(job.id)}
              >
                <CloseIcon sx={{ fontSize: 16 }} style={{ color: tokens.red }} />
              </IconButton>
            </Stack>
          </Box>
        ))}

        {jobs.length === 0 && (
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
          value={newPayPeriod}
          aria-label={t("payPeriodLabel")}
          onChange={(e) => setNewPayPeriod(e.target.value)}
          sx={fieldSx(220)}
        >
          {PAY_PERIOD_OPTIONS.map((value) => (
            <MenuItem key={value} value={value}>
              {td(tRoot, PAY_PERIOD_LABEL_KEYS[value])}
            </MenuItem>
          ))}
        </TextField>
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
          if (deleteTargetId) run(() => deleteJobAction(deleteTargetId));
          setDeleteTargetId(null);
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </Box>
  );
}
