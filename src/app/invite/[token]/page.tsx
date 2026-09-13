import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { createTotpSecret, totpKeyUri } from "@/lib/auth/totp";
import InviteAcceptanceForm from "./InviteAcceptanceForm";
import InvalidTokenNotice from "../../_shared/InvalidTokenNotice";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("auth.invite.metaTitle") };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations();

  const invite = await prisma.userInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    return <InvalidTokenNotice message={t("auth.invite.invalidTokenMessage")} />;
  }

  let user = await prisma.user.findUnique({ where: { email: invite.email } });
  if (!user || user.status !== "invited") {
    return <InvalidTokenNotice message={t("auth.invite.invalidTokenMessage")} />;
  }

  if (!user.twoFactorSecret) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: createTotpSecret() },
    });
  }

  const keyUri = totpKeyUri(user.twoFactorSecret!, user.email);
  const qrDataUrl = await QRCode.toDataURL(keyUri);

  return (
    <InviteAcceptanceForm
      token={token}
      name={user.name}
      qrDataUrl={qrDataUrl}
      secret={user.twoFactorSecret!}
    />
  );
}
