"use client";

import Box from "@mui/material/Box";
import { useRouter } from "next/navigation";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTranslations } from "next-intl";
import SectionHeader from "../_shared/SectionHeader";
import { useTokens } from "@/theme";
import { td } from "@/lib/i18n/translateDynamicKey";
import { API_ENDPOINT_DOCS } from "@/lib/apiEndpointDocs";

const GUIDE_KEYS = [
  "gettingStarted",
  "managingUsersHouseholds",
  "payeeRenamingRules",
  "backupsRestore",
] as const;

export default function DocsPanel() {
  const tokens = useTokens();
  const t = useTranslations();
  const router = useRouter();

  return (
    <Box>
      <SectionHeader title={t("admin.docs.title")} subtitle={t("admin.docs.subtitle")} />

      <Typography
        sx={{ fontSize: 15, fontWeight: 700, mb: "12px" }}
        style={{ color: tokens.textBody }}
      >
        {t("admin.docs.guidesHeading")}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", mb: "28px" }}>
        {GUIDE_KEYS.map((key) => (
          <Box
            key={key}
            sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "18px" }}
            style={{ backgroundColor: tokens.cardBackground }}
          >
            <Typography
              sx={{ fontSize: 13.5, fontWeight: 600, mb: "4px" }}
              style={{ color: tokens.blue }}
            >
              {t(`admin.docs.guides.${key}.title`)}
            </Typography>
            <Typography
              sx={{ fontSize: 12.5, lineHeight: 1.5 }}
              style={{ color: tokens.textMuted }}
            >
              {t(`admin.docs.guides.${key}.description`)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography
        sx={{ fontSize: 15, fontWeight: 700, mb: "12px" }}
        style={{ color: tokens.textBody }}
      >
        {t("admin.docs.apiTokensHeading")}
      </Typography>
      <Box
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "18px" }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Typography
          sx={{ fontSize: 12.5, lineHeight: 1.6, mb: "16px" }}
          style={{ color: tokens.textMuted }}
        >
          {t.rich("admin.docs.apiTokensDescription", {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </Typography>

        <Box
          sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("admin.docs.apiEndpoints.columns.method")}</TableCell>
                <TableCell>{t("admin.docs.apiEndpoints.columns.path")}</TableCell>
                <TableCell>{t("admin.docs.apiEndpoints.columns.feature")}</TableCell>
                <TableCell>{t("admin.docs.apiEndpoints.columns.description")}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {API_ENDPOINT_DOCS.map((doc) => (
                <TableRow
                  key={doc.path}
                  onClick={() => router.push(`/admin/docs/api/${doc.slug}`)}
                  sx={{
                    cursor: "pointer",
                    "&:hover": { backgroundColor: tokens.menuBackground },
                  }}
                >
                  <TableCell sx={{ fontSize: 12, fontWeight: 700 }} style={{ color: tokens.green }}>
                    GET
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textBody }}>
                    <code>{doc.path}</code>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                    {td(t, `admin.docs.apiEndpoints.${doc.featureKey}.feature`)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                    {td(t, `admin.docs.apiEndpoints.${doc.descriptionKey}.description`)}
                  </TableCell>
                  <TableCell sx={{ width: 24 }}>
                    <ChevronRightIcon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}
