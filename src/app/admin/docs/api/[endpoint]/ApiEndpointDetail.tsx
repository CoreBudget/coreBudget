"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "next/link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTokens } from "@/theme";
import { td } from "@/lib/i18n/translateDynamicKey";
import { API_ERROR_EXAMPLES, type ApiEndpointDoc } from "@/lib/apiEndpointDocs";

function CodeBlock({ children }: { children: string }) {
  const tokens = useTokens();
  return (
    <Box
      component="pre"
      sx={{
        fontSize: 12,
        p: "14px",
        borderRadius: "8px",
        overflowX: "auto",
        m: 0,
        fontFamily: "monospace",
      }}
      style={{ color: tokens.textBody, backgroundColor: tokens.menuBackground }}
    >
      {children}
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const tokens = useTokens();
  return (
    <Box sx={{ mt: "28px" }}>
      <Typography
        sx={{ fontSize: 13.5, fontWeight: 700, mb: "10px" }}
        style={{ color: tokens.textBody }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export default function ApiEndpointDetail({ doc }: { doc: ApiEndpointDoc }) {
  const t = useTranslations();
  const tokens = useTokens();

  const curlExample = `curl -H "Authorization: Bearer cb_xxxxxxxxxxxxxxxxxxxxxxxx" \\\n  https://<your-instance>${doc.path}`;

  return (
    <Box>
      <Link
        href="/admin/docs"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
      >
        <ArrowBackIcon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
          {t("admin.docs.apiEndpointDetail.backLink")}
        </Typography>
      </Link>

      <Stack direction="row" sx={{ alignItems: "center", gap: "10px", mt: "14px" }}>
        <Chip label="GET" size="small" sx={{ fontWeight: 700 }} color="success" />
        <Typography
          sx={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}
          style={{ color: tokens.textBody }}
        >
          {doc.path}
        </Typography>
      </Stack>
      <Typography
        sx={{ fontSize: 13, mt: "8px", lineHeight: 1.6 }}
        style={{ color: tokens.textMuted }}
      >
        {td(t, `admin.docs.apiEndpoints.${doc.descriptionKey}.description`)}
      </Typography>

      <Stack direction="row" sx={{ alignItems: "center", gap: "8px", mt: "14px" }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 600 }} style={{ color: tokens.textFaint }}>
          {t("admin.docs.apiEndpointDetail.requiredFeatureLabel")}
        </Typography>
        <Chip
          label={td(t, `admin.docs.apiEndpoints.${doc.featureKey}.feature`)}
          size="small"
          variant="outlined"
        />
      </Stack>

      <Section title={t("admin.docs.apiEndpointDetail.authenticationHeading")}>
        <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }} style={{ color: tokens.textMuted }}>
          {t("admin.docs.apiEndpointDetail.authenticationBody", {
            header: "Authorization: Bearer <token>",
          })}
        </Typography>
      </Section>

      <Section title={t("admin.docs.apiEndpointDetail.requestHeading")}>
        <CodeBlock>{curlExample}</CodeBlock>
      </Section>

      <Section title={t("admin.docs.apiEndpointDetail.responseHeading")}>
        <CodeBlock>{JSON.stringify(doc.exampleResponse, null, 2)}</CodeBlock>
      </Section>

      <Section title={t("admin.docs.apiEndpointDetail.errorsHeading")}>
        <Typography sx={{ fontSize: 11.5, mb: "10px" }} style={{ color: tokens.textFaint }}>
          {t("admin.docs.apiEndpointDetail.errorsSubtitle")}
        </Typography>
        <Stack sx={{ gap: "8px" }}>
          {API_ERROR_EXAMPLES.map((example, i) => (
            <Stack key={i} direction="row" sx={{ alignItems: "flex-start", gap: "10px" }}>
              <Chip
                label={example.status}
                size="small"
                color={example.status === 429 ? "warning" : "error"}
                sx={{ fontWeight: 700, minWidth: 48 }}
              />
              <Box sx={{ flex: 1 }}>
                <CodeBlock>
                  {JSON.stringify(example.body) +
                    ("header" in example ? `\n${example.header}` : "")}
                </CodeBlock>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Section>
    </Box>
  );
}
