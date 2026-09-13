"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import ListSubheader from "@mui/material/ListSubheader";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import SectionHeader from "../../../admin/_shared/SectionHeader";
import AdminButton from "../../../admin/_shared/AdminButton";
import Field from "../../../_shared/Field";
import { useIsMobile } from "../../useIsMobile";
import { useTokens } from "@/theme";
import { useToast } from "../../../_shared/ToastProvider";
import { useServerAction } from "../../../_shared/useServerAction";
import ConfirmDialog from "../../../_shared/ConfirmDialog";
import { td } from "@/lib/i18n/translateDynamicKey";
import { deletePayeeAutoCategoryAction, setPayeeAutoCategoryAction } from "./actions";
import type { PayeeOption, SectionOption } from "../../_shared/budgetPickerTypes";

export interface PayeeAutoCategoryMapping {
  payeeId: string;
  payeeName: string;
  payeeAutoCategoryEnabled: boolean;
  categoryId: string;
  categoryName: string;
  sectionName: string;
}

interface CategoryChoice {
  id: string;
  name: string;
  group: string;
}

function buildCategoryOptions(sections: SectionOption[]): CategoryChoice[] {
  return sections.flatMap((s) =>
    s.categories.map((c) => ({ id: c.id, name: c.name, group: s.name })),
  );
}

export default function PayeeCategorizationPanel({
  canEdit,
  mappings,
  payees,
  sections,
}: {
  canEdit: boolean;
  mappings: PayeeAutoCategoryMapping[];
  payees: PayeeOption[];
  sections: SectionOption[];
}) {
  const t = useTranslations("budgetSettings.payeeCategorization");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { pending: addPending, run } = useServerAction();
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string>();
  const [selectedPayee, setSelectedPayee] = useState<PayeeOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryChoice | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const categoryOptions = useMemo(() => buildCategoryOptions(sections), [sections]);

  function openAdd() {
    setSelectedPayee(null);
    setSelectedCategory(null);
    setAddError(undefined);
    setAddOpen(true);
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(undefined);
    const formData = new FormData();
    if (selectedPayee) formData.set("payeeId", selectedPayee.id);
    if (selectedCategory) formData.set("categoryId", selectedCategory.id);
    run(
      () => setPayeeAutoCategoryAction({}, formData),
      () => {
        setAddOpen(false);
        router.refresh();
      },
      (err) => setAddError(err),
    );
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    startTransition(async () => {
      const result = await deletePayeeAutoCategoryAction(deleteTargetId);
      if (result.error) showToast(td(tRoot, result.error), "error");
      setDeleteTargetId(null);
      router.refresh();
    });
  }

  return (
    <Box>
      <SectionHeader
        title={t("title")}
        subtitle={t("subtitle")}
        headingLevel="h2"
        action={
          canEdit && !isMobile ? (
            <AdminButton
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={openAdd}
            >
              {t("addButton")}
            </AdminButton>
          ) : undefined
        }
      />

      {canEdit && isMobile && (
        <Box
          component="button"
          onClick={openAdd}
          aria-label={t("addButton")}
          sx={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 22,
            boxShadow: tokens.menuShadow,
          }}
          style={{ backgroundColor: tokens.blue, color: tokens.blueContrast }}
        >
          <AddIcon sx={{ fontSize: 26 }} />
        </Box>
      )}

      <Stack sx={{ gap: "8px" }}>
        {mappings.length === 0 && (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("empty")}
          </Typography>
        )}
        {mappings.map((m) => (
          <Stack
            key={m.payeeId}
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              p: "12px 14px",
              borderRadius: "8px",
            }}
            style={{ border: `1px solid ${tokens.border}` }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                style={{ color: tokens.textBody }}
              >
                {m.payeeName}
                <ArrowRightAltIcon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
                {m.categoryName}
              </Typography>
              <Typography sx={{ fontSize: 11.5, mt: "2px" }} style={{ color: tokens.textFaint }}>
                {m.sectionName}
                {!m.payeeAutoCategoryEnabled && ` · ${t("inertNote")}`}
              </Typography>
            </Box>
            {canEdit && (
              <IconButton
                size="small"
                onClick={() => setDeleteTargetId(m.payeeId)}
                disabled={pending}
                aria-label={td(tRoot, "common.delete")}
              >
                <DeleteOutlineIcon sx={{ fontSize: 16 }} style={{ color: tokens.red }} />
              </IconButton>
            )}
          </Stack>
        ))}
      </Stack>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>{t("addButton")}</DialogTitle>
        <Stack component="form" onSubmit={handleAdd} key={addOpen ? "open" : "closed"}>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("payeeLabel")} htmlFor="mapping-payee">
                <Autocomplete
                  id="mapping-payee"
                  size="small"
                  options={payees}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, val) => option.id === val.id}
                  value={selectedPayee}
                  onChange={(_e, next) => setSelectedPayee(next)}
                  renderInput={(params) => (
                    <TextField {...params} placeholder={t("payeeSearchPlaceholder")} />
                  )}
                />
              </Field>
              <Field label={t("categoryLabel")} htmlFor="mapping-category">
                <Autocomplete
                  id="mapping-category"
                  size="small"
                  options={categoryOptions}
                  groupBy={(option) => option.group}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, val) => option.id === val.id}
                  value={selectedCategory}
                  onChange={(_e, next) => setSelectedCategory(next)}
                  renderGroup={(params) => (
                    <li key={params.key}>
                      <ListSubheader component="div" sx={{ lineHeight: "28px" }}>
                        {params.group}
                      </ListSubheader>
                      <Box component="ul" sx={{ p: 0 }}>
                        {params.children}
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} placeholder={t("categorySearchPlaceholder")} />
                  )}
                />
              </Field>
              {addError && <Alert severity="error">{td(tRoot, addError)}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddOpen(false)} sx={{ color: "text.secondary" }}>
              {tRoot("common.cancel")}
            </Button>
            <Button type="submit" variant="contained" disabled={addPending}>
              {tRoot("common.save")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title={t("deleteConfirm.title")}
        description={t("deleteConfirm.description")}
        confirmLabel={tRoot("common.delete")}
        cancelLabel={tRoot("common.cancel")}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </Box>
  );
}
