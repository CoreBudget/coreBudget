import "server-only";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import type { User } from "@/generated/prisma/client";

export async function requireAdmin(): Promise<User> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.user.isAdmin) redirect("/dashboard");
  return session.user;
}

export async function requireUser(): Promise<User> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session.user;
}
