import { getTranslations } from "next-intl/server";
import Typography from "@mui/material/Typography";
import AuthShell from "./AuthShell";
import AuthHeading from "./AuthHeading";

export default async function InvalidTokenNotice({ message }: { message: string }) {
  const t = await getTranslations();
  return (
    <AuthShell maxWidth={400}>
      <AuthHeading title={t("auth.shared.invalidToken.title")} />
      <Typography sx={{ fontSize: 13, color: "text.secondary", lineHeight: 1.5 }}>
        {message}
      </Typography>
    </AuthShell>
  );
}
