"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import BlockIcon from "@mui/icons-material/Block";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import SectionHeader from "../_shared/SectionHeader";
import AdminButton from "../_shared/AdminButton";
import Pill from "../_shared/Pill";
import ConfirmDialog from "../../_shared/ConfirmDialog";
import { useTokens } from "@/theme";
import CreateHouseholdDialog from "./CreateHouseholdDialog";
import GrantAccessDialog from "./GrantAccessDialog";
import GrantBudgetAccessControl from "./GrantBudgetAccessControl";
import PermissionMatrixDialog from "./PermissionMatrixDialog";
import { permissionSummary } from "./featureLabels";
import {
  removeHouseholdMemberAction,
  revokeBudgetAccessAction,
  updateMemberRoleAction,
} from "./actions";

interface HouseholdRow {
  id: string;
  name: string;
  memberCount: number;
  budgetCount: number;
  updatedAt: string;
}

interface SelectedHousehold {
  id: string;
  members: { userId: string; name: string; role: string }[];
  budgets: {
    id: string;
    name: string;
    access: { userId: string; name: string; permissions: Record<string, string> }[];
  }[];
}

export default function HouseholdsPanel({
  households,
  selectedId,
  selected,
  users,
  features,
  initialRowsPerPage,
}: {
  households: HouseholdRow[];
  selectedId: string | null;
  selected: SelectedHousehold | null;
  users: { id: string; name: string }[];
  features: string[];
  initialRowsPerPage: number;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  const pageHouseholds = households.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function handleRemoveMember() {
    if (!selected || !removeMemberId) return;
    startTransition(async () => {
      await removeHouseholdMemberAction(selected.id, removeMemberId);
      setRemoveMemberId(null);
      router.refresh();
    });
  }

  function handleRoleToggle(userId: string, currentRole: string) {
    if (!selected) return;
    startTransition(async () => {
      await updateMemberRoleAction(
        selected.id,
        userId,
        currentRole === "owner" ? "member" : "owner",
      );
      router.refresh();
    });
  }

  function handleRevokeBudgetAccess(budgetId: string, userId: string) {
    startTransition(async () => {
      await revokeBudgetAccessAction(budgetId, userId);
      router.refresh();
    });
  }

  const memberIds = new Set(selected?.members.map((m) => m.userId));
  const removeMemberName = selected?.members.find((m) => m.userId === removeMemberId)?.name ?? "";

  return (
    <Box>
      <SectionHeader
        title={t("admin.households.title")}
        subtitle={t("admin.households.subtitle")}
        action={<CreateHouseholdDialog users={users} />}
      />

      <Box
        sx={{
          border: `1px solid ${tokens.border}`,
          borderRadius: "10px",
          overflow: "hidden",
          mb: "24px",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.households.columns.household")}</TableCell>
              <TableCell>{t("admin.households.columns.members")}</TableCell>
              <TableCell>{t("admin.households.columns.budgets")}</TableCell>
              <TableCell>{t("admin.households.columns.lastUpdated")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageHouseholds.map((h) => (
              <TableRow
                key={h.id}
                hover
                style={{
                  backgroundColor: h.id === selectedId ? `${tokens.blue}14` : "transparent",
                }}
              >
                <TableCell sx={{ p: 0 }}>
                  <Link
                    href={`/admin/households?h=${h.id}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      padding: "12px 16px",
                      fontSize: 13,
                      fontWeight: h.id === selectedId ? 600 : 500,
                      color: h.id === selectedId ? tokens.blue : tokens.textBody,
                    }}
                  >
                    {h.name}
                  </Link>
                </TableCell>
                <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textMuted }}>
                  {h.memberCount}
                </TableCell>
                <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textMuted }}>
                  {h.budgetCount}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textSecondary }}>
                  {new Date(h.updatedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={households.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Box>

      {selected && (
        <>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center", mb: "12px" }}
          >
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary" }}>
              {t("admin.households.membersHeading", {
                name: households.find((h) => h.id === selected.id)?.name ?? "",
              })}
            </Typography>
            <GrantAccessDialog
              householdId={selected.id}
              candidateUsers={users.filter((u) => !memberIds.has(u.id))}
            />
          </Stack>
          <Box
            sx={{
              border: `1px solid ${tokens.border}`,
              borderRadius: "10px",
              overflow: "hidden",
              mb: "24px",
            }}
          >
            {selected.members.length === 0 ? (
              <Typography sx={{ p: 2, fontSize: 12.5, color: "text.disabled" }}>
                {t("admin.households.noMembers")}
              </Typography>
            ) : (
              selected.members.map((m) => (
                <Stack
                  key={m.userId}
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: "16px",
                    py: "12px",
                    borderBottom: `1px solid ${tokens.divider}`,
                  }}
                >
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
                    <Typography
                      sx={{ fontSize: 13, fontWeight: 500 }}
                      style={{ color: tokens.textBody }}
                    >
                      {m.name}
                    </Typography>
                    <Pill
                      label={
                        m.role === "owner"
                          ? t("admin.households.roles.owner")
                          : t("admin.households.roles.member")
                      }
                      color={m.role === "owner" ? tokens.blue : tokens.textMuted}
                    />
                  </Stack>
                  <Stack direction="row" sx={{ gap: "6px" }}>
                    <AdminButton
                      disabled={pending}
                      startIcon={
                        m.role === "owner" ? (
                          <PersonIcon sx={{ fontSize: 14 }} />
                        ) : (
                          <StarIcon sx={{ fontSize: 14 }} />
                        )
                      }
                      onClick={() => handleRoleToggle(m.userId, m.role)}
                    >
                      {m.role === "owner"
                        ? t("admin.households.makeMember")
                        : t("admin.households.makeOwner")}
                    </AdminButton>
                    <AdminButton
                      danger
                      disabled={pending}
                      startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                      onClick={() => setRemoveMemberId(m.userId)}
                    >
                      {t("admin.households.remove")}
                    </AdminButton>
                  </Stack>
                </Stack>
              ))
            )}
          </Box>

          <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary", mb: "12px" }}>
            {t("admin.households.budgetsHeading")}
          </Typography>
          {selected.budgets.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>
              {t("admin.households.noBudgets")}
            </Typography>
          ) : (
            selected.budgets.map((b) => {
              const accessUserIds = new Set(b.access.map((a) => a.userId));
              const candidates = selected.members.filter((m) => !accessUserIds.has(m.userId));
              return (
                <Box
                  key={b.id}
                  sx={{
                    border: `1px solid ${tokens.border}`,
                    borderRadius: "10px",
                    p: "18px",
                    mb: "12px",
                  }}
                >
                  <Typography
                    sx={{ fontSize: 13.5, fontWeight: 600, mb: "10px" }}
                    style={{ color: tokens.textBody }}
                  >
                    {b.name}
                  </Typography>
                  {b.access.length === 0 ? (
                    <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>
                      {t("admin.households.noBudgetAccess")}
                    </Typography>
                  ) : (
                    b.access.map((a) => (
                      <Stack
                        key={a.userId}
                        direction="row"
                        sx={{
                          justifyContent: "space-between",
                          alignItems: "center",
                          py: "8px",
                          borderTop: `1px solid ${tokens.divider}`,
                        }}
                      >
                        <Stack direction="row" sx={{ alignItems: "baseline", gap: 1 }}>
                          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                            {a.name}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                            {permissionSummary(t, a.permissions)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" sx={{ gap: "6px" }}>
                          <PermissionMatrixDialog
                            budgetId={b.id}
                            budgetName={b.name}
                            userId={a.userId}
                            userName={a.name}
                            features={features}
                            initialPermissions={a.permissions}
                          />
                          <AdminButton
                            danger
                            disabled={pending}
                            startIcon={<BlockIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleRevokeBudgetAccess(b.id, a.userId)}
                          >
                            {t("admin.households.revoke")}
                          </AdminButton>
                        </Stack>
                      </Stack>
                    ))
                  )}
                  <GrantBudgetAccessControl budgetId={b.id} candidateUsers={candidates} />
                </Box>
              );
            })
          )}
        </>
      )}

      <ConfirmDialog
        open={removeMemberId !== null}
        title={t("admin.households.removeConfirm.title")}
        description={t("admin.households.removeConfirm.description", { name: removeMemberName })}
        confirmLabel={t("admin.households.remove")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveMemberId(null)}
      />
    </Box>
  );
}
