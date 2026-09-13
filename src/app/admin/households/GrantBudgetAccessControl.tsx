"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import AddIcon from "@mui/icons-material/Add";
import AdminButton from "../_shared/AdminButton";
import { grantBudgetAccessAction } from "./actions";

export default function GrantBudgetAccessControl({
  budgetId,
  candidateUsers,
}: {
  budgetId: string;
  candidateUsers: { userId: string; name: string }[];
}) {
  const [userId, setUserId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations();

  if (candidateUsers.length === 0) return null;

  return (
    <Stack direction="row" sx={{ gap: 1, alignItems: "center", pt: 1 }}>
      <TextField
        select
        size="small"
        value={userId}
        aria-label={t("admin.households.householdMemberPlaceholder")}
        onChange={(e) => setUserId(e.target.value)}
        sx={{ minWidth: 200 }}
        slotProps={{ select: { displayEmpty: true } }}
      >
        <MenuItem value="" disabled>
          {t("admin.households.householdMemberPlaceholder")}
        </MenuItem>
        {candidateUsers.map((u) => (
          <MenuItem key={u.userId} value={u.userId}>
            {u.name}
          </MenuItem>
        ))}
      </TextField>
      <AdminButton
        disabled={!userId || pending}
        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
        onClick={() => {
          startTransition(async () => {
            await grantBudgetAccessAction(budgetId, userId);
            setUserId("");
            router.refresh();
          });
        }}
      >
        {t("admin.households.grantBudgetAccess")}
      </AdminButton>
    </Stack>
  );
}
