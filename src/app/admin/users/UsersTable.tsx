"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { useTranslations } from "next-intl";
import BlockIcon from "@mui/icons-material/Block";
import CheckIcon from "@mui/icons-material/Check";
import LockResetIcon from "@mui/icons-material/LockReset";
import SecurityIcon from "@mui/icons-material/Security";
import SectionHeader from "../_shared/SectionHeader";
import AdminButton from "../_shared/AdminButton";
import Pill from "../_shared/Pill";
import { useTokens } from "@/theme";
import { resetPasswordAction, resetTwoFactorAction, toggleUserStatusAction } from "./actions";
import CreateUserDialog from "./CreateUserDialog";
import { td } from "@/lib/i18n/translateDynamicKey";

type FlashKind = "resetSent" | "twoFactorCleared";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  isAdmin: boolean;
  twoFactorEnabled: boolean;
  lastLogin: string | null;
}

export default function UsersTable({
  users,
  currentAdminId,
  initialRowsPerPage,
}: {
  users: UserRow[];
  currentAdminId: string;
  initialRowsPerPage: number;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<{ userId: string; kind: FlashKind }[]>([]);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const flagged = (userId: string) => flash.find((f) => f.userId === userId)?.kind;
  const pageUsers = users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function formatLastLogin(iso: string | null): string {
    if (!iso) return t("admin.users.neverLoggedIn");
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function handleResetPassword(userId: string) {
    startTransition(async () => {
      const { emailSent, resetUrl } = await resetPasswordAction(userId);
      setFlash((prev) => [...prev, { userId, kind: "resetSent" }]);
      if (!emailSent) {
        setSnackbar(t("admin.users.smtpNotConfiguredShareLink", { resetUrl }));
      }
      router.refresh();
    });
  }

  function handleResetTwoFactor(userId: string) {
    startTransition(async () => {
      await resetTwoFactorAction(userId);
      setFlash((prev) => [...prev, { userId, kind: "twoFactorCleared" }]);
      router.refresh();
    });
  }

  function handleToggleStatus(userId: string) {
    startTransition(async () => {
      await toggleUserStatusAction(userId);
      router.refresh();
    });
  }

  return (
    <Box>
      <SectionHeader
        title={t("admin.users.title")}
        subtitle={t("admin.users.subtitle")}
        action={<CreateUserDialog />}
      />

      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.users.columns.name")}</TableCell>
              <TableCell>{t("admin.users.columns.email")}</TableCell>
              <TableCell>{t("admin.users.columns.status")}</TableCell>
              <TableCell>{t("admin.users.columns.twoFactor")}</TableCell>
              <TableCell>{t("admin.users.columns.lastLogin")}</TableCell>
              <TableCell>{t("admin.users.columns.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: tokens.textBody,
                        textDecoration: "underline",
                      }}
                    >
                      {u.name}
                    </Link>
                    {u.isAdmin && <Pill label={t("admin.users.adminPill")} color={tokens.amber} />}
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textMuted }}>
                  {u.email}
                </TableCell>
                <TableCell>
                  <Pill
                    label={td(t, `admin.users.status.${u.status}`)}
                    color={
                      u.status === "active"
                        ? tokens.green
                        : u.status === "invited"
                          ? tokens.amber
                          : tokens.red
                    }
                  />
                </TableCell>
                <TableCell
                  sx={{ fontSize: 12.5 }}
                  style={{ color: u.twoFactorEnabled ? tokens.green : tokens.textDisabled }}
                >
                  {u.twoFactorEnabled
                    ? t("admin.users.twoFactorEnabled")
                    : t("admin.users.twoFactorOff")}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                  {formatLastLogin(u.lastLogin)}
                </TableCell>
                <TableCell>
                  <Stack direction="row" sx={{ gap: "6px", flexWrap: "wrap" }}>
                    {u.status === "active" &&
                      (flagged(u.id) === "resetSent" ? (
                        <Pill label={t("admin.users.resetLinkSent")} color={tokens.green} />
                      ) : (
                        <AdminButton
                          disabled={pending}
                          startIcon={<LockResetIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleResetPassword(u.id)}
                        >
                          {t("admin.users.resetPassword")}
                        </AdminButton>
                      ))}
                    {u.status === "active" &&
                      (flagged(u.id) === "twoFactorCleared" ? (
                        <Pill label={t("admin.users.twoFactorCleared")} color={tokens.green} />
                      ) : (
                        <AdminButton
                          disabled={pending}
                          startIcon={<SecurityIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleResetTwoFactor(u.id)}
                        >
                          {t("admin.users.resetTwoFactor")}
                        </AdminButton>
                      ))}
                    {u.status !== "invited" && u.id !== currentAdminId && (
                      <AdminButton
                        disabled={pending}
                        danger={u.status === "active"}
                        startIcon={
                          u.status === "active" ? (
                            <BlockIcon sx={{ fontSize: 14 }} />
                          ) : (
                            <CheckIcon sx={{ fontSize: 14 }} />
                          )
                        }
                        onClick={() => handleToggleStatus(u.id)}
                      >
                        {u.status === "active"
                          ? t("admin.users.deactivate")
                          : t("admin.users.reactivate")}
                      </AdminButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={users.length}
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

      <Snackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        autoHideDuration={12000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" onClose={() => setSnackbar(null)} sx={{ maxWidth: 480 }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
}
