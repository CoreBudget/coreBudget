import "server-only";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";

const RESET_TTL_MS = 60 * 60 * 1000;

export async function createPasswordReset(userId: string): Promise<{
  resetUrl: string;
  emailSent: boolean;
}> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const resetUrl = new URL(`/reset-password/${token}`, process.env.APP_URL).toString();
  const { sent } = await sendPasswordResetEmail(user.email, user.name, resetUrl);
  return { resetUrl, emailSent: sent };
}
