import "server-only";
import { prisma } from "@/lib/prisma";

export async function recalculateAccountBalances(accountId: string): Promise<void> {
  const transactions = await prisma.transaction.findMany({
    where: { accountId, pendingApproval: false },
    orderBy: [{ postDate: "asc" }, { createdAt: "asc" }],
  });

  let cleared = 0;
  let uncleared = 0;
  let running = 0;

  const updates: { id: string; runningBalance: number }[] = [];
  for (const t of transactions) {
    const amount = Number(t.credit ?? 0) - Number(t.debit ?? 0);
    running += amount;
    if (t.cleared) cleared += amount;
    else uncleared += amount;
    if (Number(t.runningBalance) !== running) {
      updates.push({ id: t.id, runningBalance: running });
    }
  }

  await prisma.$transaction([
    ...updates.map((u) =>
      prisma.transaction.update({
        where: { id: u.id },
        data: { runningBalance: u.runningBalance },
      }),
    ),
    prisma.account.update({
      where: { id: accountId },
      data: { clearedBalance: cleared, unclearedBalance: uncleared, balance: cleared + uncleared },
    }),
  ]);
}

export interface PayeeRenamingRuleLite {
  payeeId: string;
  matchType: string;
  pattern: string;
}

export async function getPayeeRenamingRules(): Promise<PayeeRenamingRuleLite[]> {
  return prisma.payeeRenamingRule.findMany({
    select: { payeeId: true, matchType: true, pattern: true },
    orderBy: { createdAt: "asc" },
  });
}

function matchRenamingRule(name: string, rules: PayeeRenamingRuleLite[]): string | null {
  const lower = name.toLowerCase();
  for (const rule of rules) {
    const pattern = rule.pattern.toLowerCase();
    const matches =
      rule.matchType === "equals"
        ? lower === pattern
        : rule.matchType === "starts_with"
          ? lower.startsWith(pattern)
          : rule.matchType === "ends_with"
            ? lower.endsWith(pattern)
            : lower.includes(pattern);
    if (matches) return rule.payeeId;
  }
  return null;
}

export async function findOrCreatePayee(
  name: string,
  rules?: PayeeRenamingRuleLite[],
): Promise<string> {
  const trimmed = name.trim();
  const activeRules = rules ?? (await getPayeeRenamingRules());
  const ruleMatch = matchRenamingRule(trimmed, activeRules);
  if (ruleMatch) return ruleMatch;

  const existing = await prisma.payee.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing.id;

  const created = await prisma.payee.create({ data: { name: trimmed } });
  return created.id;
}

export async function getPayeeAutoCategoryMap(
  budgetId: string,
  payeeIds: string[],
): Promise<Map<string, string>> {
  if (payeeIds.length === 0) return new Map();
  const mappings = await prisma.payeeAutoCategory.findMany({
    where: { budgetId, payeeId: { in: payeeIds }, payee: { enableAutoCategory: true } },
    select: { payeeId: true, categoryId: true },
  });
  return new Map(mappings.map((m) => [m.payeeId, m.categoryId]));
}
