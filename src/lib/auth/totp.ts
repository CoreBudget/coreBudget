import { generateSecret, generateURI, verify } from "otplib";

const ISSUER = "CoreBudget";

export function createTotpSecret(): string {
  return generateSecret();
}

export function totpKeyUri(secret: string, accountLabel: string): string {
  return generateURI({ issuer: ISSUER, label: accountLabel, secret });
}

export async function verifyTotpToken(secret: string, token: string): Promise<boolean> {
  const result = await verify({ secret, token });
  return result.valid;
}
