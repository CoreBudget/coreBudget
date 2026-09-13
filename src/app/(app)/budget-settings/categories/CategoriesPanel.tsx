"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AddIcon from "@mui/icons-material/Add";
import SectionHeader from "../../../admin/_shared/SectionHeader";
import AdminButton from "../../../admin/_shared/AdminButton";
import Pill from "../../../admin/_shared/Pill";
import { useTokens } from "@/theme";
import { useIsMobile } from "../../useIsMobile";
import { useToast } from "../../../_shared/ToastProvider";
import ConfirmDialog from "../../../_shared/ConfirmDialog";
import { td } from "@/lib/i18n/translateDynamicKey";
import {
  createCategoryAction,
  createSectionAction,
  deleteCategoryAction,
  deleteSectionAction,
  moveCategoryAction,
  moveSectionAction,
  renameCategoryAction,
  renameSectionAction,
  setSectionTypeAction,
  toggleCategoryActiveAction,
  toggleSectionActiveAction,
} from "./actions";
import type { SectionType } from "./sectionType";

const SECTION_TYPE_OPTIONS: { value: SectionType; labelKey: string }[] = [
  { value: "expense", labelKey: "budgetSettings.categories.sectionTypes.expense" },
  { value: "income", labelKey: "budgetSettings.categories.sectionTypes.income" },
  { value: "savings", labelKey: "budgetSettings.categories.sectionTypes.savings" },
  { value: "cc_payment", labelKey: "budgetSettings.categories.sectionTypes.ccPayment" },
];

interface CategoryData {
  id: string;
  name: string;
  isActive: boolean;
  hasHistory: boolean;
}

export interface SectionData {
  id: string;
  name: string;
  type: SectionType;
  isActive: boolean;
  categories: CategoryData[];
}

export default function CategoriesPanel({
  canEdit,
  sections,
}: {
  canEdit: boolean;
  sections: SectionData[];
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newSectionName, setNewSectionName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState<Record<string, string>>({});
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) showToast(td(t, result.error), "error");
      router.refresh();
    });
  }

  function handleAddSection() {
    const name = newSectionName.trim();
    if (!name) return;
    setNewSectionName("");
    run(() => createSectionAction(name));
  }

  function handleAddCategory(sectionId: string) {
    const name = (newCategoryName[sectionId] ?? "").trim();
    if (!name) return;
    setNewCategoryName((prev) => ({ ...prev, [sectionId]: "" }));
    run(() => createCategoryAction(sectionId, name));
  }

  function handleDeleteSection() {
    if (!deleteSectionId) return;
    run(() => deleteSectionAction(deleteSectionId));
    setDeleteSectionId(null);
  }

  function handleDeleteCategory() {
    if (!deleteCategoryId) return;
    run(() => deleteCategoryAction(deleteCategoryId));
    setDeleteCategoryId(null);
  }

  return (
    <Box>
      <SectionHeader
        title={t("budgetSettings.categories.title")}
        subtitle={t("budgetSettings.categories.subtitle")}
        headingLevel="h2"
      />

      <Stack sx={{ gap: "14px" }}>
        {sections.map((section, sectionIndex) => (
          <Box
            key={section.id}
            sx={{
              border: `1px solid ${tokens.border}`,
              borderRadius: "8px",
              p: "12px",
              opacity: section.isActive ? 1 : 0.55,
            }}
            style={{ backgroundColor: tokens.cardBackground }}
          >
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                mb: section.categories.length ? "10px" : "4px",
              }}
            >
              {canEdit ? (
                <>
                  <IconButton
                    size="small"
                    disabled={sectionIndex === 0}
                    onClick={() => run(() => moveSectionAction(section.id, "up"))}
                    aria-label={td(t, "common.moveUp")}
                  >
                    <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={sectionIndex === sections.length - 1}
                    onClick={() => run(() => moveSectionAction(section.id, "down"))}
                    aria-label={td(t, "common.moveDown")}
                  >
                    <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <TextField
                    size="small"
                    defaultValue={section.name}
                    aria-label={t("budgetSettings.categories.groupNameLabel")}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== section.name)
                        run(() => renameSectionAction(section.id, name));
                    }}
                    sx={{ flex: 1 }}
                    slotProps={{ htmlInput: { style: { fontWeight: 600, fontSize: 13 } } }}
                  />
                  {isMobile && <Box sx={{ flexBasis: "100%", height: 0 }} />}
                  <TextField
                    select
                    size="small"
                    value={section.type}
                    aria-label={t("budgetSettings.categories.groupTypeLabel")}
                    onChange={(e) => run(() => setSectionTypeAction(section.id, e.target.value))}
                    sx={{ width: isMobile ? "auto" : 130, flex: isMobile ? 1 : "none" }}
                  >
                    {SECTION_TYPE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {td(t, o.labelKey)}
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              ) : (
                <Typography
                  sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}
                  style={{ color: tokens.textBody }}
                >
                  {section.name}
                </Typography>
              )}
              {!section.isActive && (
                <Pill label={t("budgetSettings.categories.hiddenPill")} color={tokens.textFaint} />
              )}
              {canEdit && (
                <IconButton
                  size="small"
                  title={
                    section.isActive
                      ? t("budgetSettings.categories.hideGroup")
                      : t("budgetSettings.categories.unhideGroup")
                  }
                  onClick={() => run(() => toggleSectionActiveAction(section.id))}
                >
                  {section.isActive ? (
                    <VisibilityIcon sx={{ fontSize: 16 }} style={{ color: tokens.textMuted }} />
                  ) : (
                    <VisibilityOffIcon sx={{ fontSize: 16 }} style={{ color: tokens.blue }} />
                  )}
                </IconButton>
              )}
              {canEdit && section.categories.length === 0 && (
                <IconButton
                  size="small"
                  title={t("budgetSettings.categories.deleteGroup")}
                  onClick={() => setDeleteSectionId(section.id)}
                >
                  <CloseIcon sx={{ fontSize: 16 }} style={{ color: tokens.red }} />
                </IconButton>
              )}
            </Stack>

            <Stack sx={{ gap: "6px", ml: canEdit ? (isMobile ? "12px" : "76px") : 0 }}>
              {section.categories.map((category, categoryIndex) => (
                <Stack
                  key={category.id}
                  direction="row"
                  sx={{ alignItems: "center", gap: 1, opacity: category.isActive ? 1 : 0.6 }}
                >
                  {canEdit ? (
                    <>
                      <IconButton
                        size="small"
                        disabled={categoryIndex === 0}
                        onClick={() => run(() => moveCategoryAction(category.id, "up"))}
                        aria-label={td(t, "common.moveUp")}
                      >
                        <ArrowUpwardIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={categoryIndex === section.categories.length - 1}
                        onClick={() => run(() => moveCategoryAction(category.id, "down"))}
                        aria-label={td(t, "common.moveDown")}
                      >
                        <ArrowDownwardIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                      <TextField
                        size="small"
                        defaultValue={category.name}
                        aria-label={t("budgetSettings.categories.categoryNameLabel")}
                        onBlur={(e) => {
                          const name = e.target.value.trim();
                          if (name && name !== category.name) {
                            run(() => renameCategoryAction(category.id, name));
                          }
                        }}
                        sx={{ flex: 1 }}
                        slotProps={{ htmlInput: { style: { fontSize: 12.5 } } }}
                      />
                    </>
                  ) : (
                    <Typography sx={{ fontSize: 12.5, flex: 1 }} style={{ color: tokens.textBody }}>
                      {category.name}
                    </Typography>
                  )}
                  {!category.isActive && (
                    <Pill
                      label={t("budgetSettings.categories.hiddenPill")}
                      color={tokens.textFaint}
                    />
                  )}
                  {canEdit && (
                    <IconButton
                      size="small"
                      title={
                        category.isActive
                          ? t("budgetSettings.categories.hideCategory")
                          : t("budgetSettings.categories.unhideCategory")
                      }
                      onClick={() => run(() => toggleCategoryActiveAction(category.id))}
                    >
                      {category.isActive ? (
                        <VisibilityIcon sx={{ fontSize: 14 }} style={{ color: tokens.textMuted }} />
                      ) : (
                        <VisibilityOffIcon sx={{ fontSize: 14 }} style={{ color: tokens.blue }} />
                      )}
                    </IconButton>
                  )}
                  {canEdit &&
                    (category.hasHistory ? (
                      <Tooltip title={t("budgetSettings.categories.hasHistoryTitle")}>
                        <IconButton
                          size="small"
                          aria-label={t("budgetSettings.categories.hasHistoryTitle")}
                        >
                          <InfoOutlinedIcon
                            sx={{ fontSize: 14 }}
                            style={{ color: tokens.textFaint }}
                          />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <IconButton
                        size="small"
                        title={t("budgetSettings.categories.deleteCategory")}
                        onClick={() => setDeleteCategoryId(category.id)}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} style={{ color: tokens.red }} />
                      </IconButton>
                    ))}
                </Stack>
              ))}

              {canEdit && (
                <Stack direction="row" sx={{ gap: 1, mt: "4px" }}>
                  <TextField
                    size="small"
                    placeholder={t("budgetSettings.categories.newCategoryPlaceholder")}
                    aria-label={t("budgetSettings.categories.newCategoryPlaceholder")}
                    value={newCategoryName[section.id] ?? ""}
                    onChange={(e) =>
                      setNewCategoryName((prev) => ({ ...prev, [section.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCategory(section.id);
                    }}
                    sx={{ flex: 1 }}
                    slotProps={{ htmlInput: { style: { fontSize: 12.5 } } }}
                  />
                  <AdminButton
                    startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                    onClick={() => handleAddCategory(section.id)}
                  >
                    {t("budgetSettings.categories.addCategoryButton")}
                  </AdminButton>
                </Stack>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      {canEdit && (
        <Stack direction="row" sx={{ gap: 1, mt: "16px" }}>
          <TextField
            size="small"
            placeholder={t("budgetSettings.categories.newGroupPlaceholder")}
            aria-label={t("budgetSettings.categories.newGroupPlaceholder")}
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSection();
            }}
            sx={{ flex: 1 }}
          />
          <AdminButton
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            onClick={handleAddSection}
          >
            {t("budgetSettings.categories.addGroupButton")}
          </AdminButton>
        </Stack>
      )}

      <ConfirmDialog
        open={deleteSectionId !== null}
        title={t("budgetSettings.categories.deleteGroupConfirm.title")}
        description={t("budgetSettings.categories.deleteGroupConfirm.description")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDeleteSection}
        onCancel={() => setDeleteSectionId(null)}
      />

      <ConfirmDialog
        open={deleteCategoryId !== null}
        title={t("budgetSettings.categories.deleteCategoryConfirm.title")}
        description={t("budgetSettings.categories.deleteCategoryConfirm.description")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeleteCategoryId(null)}
      />
    </Box>
  );
}
