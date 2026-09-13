import "server-only";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { sendInviteEmail } from "@/lib/mailer";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createInvite(params: {
  email: string;
  name: string;
  invitedByUserId: string;
}): Promise<{ acceptUrl: string; emailSent: boolean }> {
  const token = generateToken();
  const tokenHash = hashToken(token);

  await prisma.user.upsert({
    where: { email: params.email },
    create: { email: params.email, name: params.name, status: "invited" },
    update: {}, // re-invite of an existing `invited` user, leave the row as-is
  });

  await prisma.userInvite.create({
    data: {
      email: params.email,
      name: params.name,
      tokenHash,
      invitedByUserId: params.invitedByUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const acceptUrl = new URL(`/invite/${token}`, process.env.APP_URL).toString();
  const { sent } = await sendInviteEmail(params.email, params.name, acceptUrl);
  return { acceptUrl, emailSent: sent };
}
