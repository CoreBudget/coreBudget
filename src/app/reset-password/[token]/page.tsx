import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import ResetPasswordForm from "./ResetPasswordForm";
import InvalidTokenNotice from "../../_shared/InvalidTokenNotice";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("auth.resetPassword.metaTitle") };
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations();

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    return <InvalidTokenNotice message={t("auth.resetPassword.invalidTokenMessage")} />;
  }

  return <ResetPasswordForm token={token} />;
}
