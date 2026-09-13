import "server-only";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getActionSignals } from "@/lib/dashboard";
import { currentYearMonth } from "@/lib/month";
import { NotificationType } from "@/generated/prisma/client";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/locale";

interface NotificationCandidate {
  type: NotificationType;
  notificationKey: string;
  title: string;
  body: string | null;
}

function resolveLocale(candidate: string | null | undefined): SupportedLocale {
  return candidate && (SUPPORTED_LOCALES as readonly string[]).includes(candidate)
    ? (candidate as SupportedLocale)
    : "en";
}

async function getNotificationCandidates(
  budgetId: string,
  userId: string,
  locale: string | null,
): Promise<NotificationCandidate[]> {
  const [signals, preferences] = await Promise.all([
    getActionSignals(budgetId, userId, currentYearMonth()),
    prisma.notificationPreference.findMany({ where: { userId } }),
  ]);
  const t = await getTranslations({ locale: resolveLocale(locale), namespace: "notifications" });

  const inAppEnabled = new Map(preferences.map((p) => [p.notificationType, p.inAppEnabled]));
  const isEnabled = (type: NotificationType) => inAppEnabled.get(type) ?? true;

  const candidates: NotificationCandidate[] = [];

  if (signals.uncategorizedCount > 0 && isEnabled(NotificationType.uncategorized_transactions)) {
    candidates.push({
      type: NotificationType.uncategorized_transactions,
      notificationKey: `${budgetId}:uncategorized_transactions:${signals.uncategorizedCount}`,
      title: t("messages.uncategorizedTransactions", { count: signals.uncategorizedCount }),
      body: signals.uncategorizedSample.join("\n") || null,
    });
  }

  if (signals.pendingCount > 0 && isEnabled(NotificationType.needs_review)) {
    candidates.push({
      type: NotificationType.needs_review,
      notificationKey: `${budgetId}:needs_review:${signals.pendingCount}`,
      title: t("messages.needsReview", { count: signals.pendingCount }),
      body: signals.pendingSample.join("\n") || null,
    });
  }

  if (signals.overspent.length > 0 && isEnabled(NotificationType.over_budget)) {
    candidates.push({
      type: NotificationType.over_budget,
      notificationKey: `${budgetId}:over_budget:${signals.overspent.length}`,
      title: t("messages.overBudget", { count: signals.overspent.length }),
      body: signals.overspent.map((o) => o.categoryName).join(", ") || null,
    });
  }

  if (isEnabled(NotificationType.reconciliation_due)) {
    for (const account of signals.staleAccounts) {
      candidates.push({
        type: NotificationType.reconciliation_due,
        notificationKey: `${budgetId}:reconciliation_due:${account.id}`,
        title: t("messages.reconciliationDue", { name: account.name }),
        body: null,
      });
    }
  }

  if (isEnabled(NotificationType.card_expiring)) {
    for (const account of signals.expiringWithSubscriptions) {
      candidates.push({
        type: NotificationType.card_expiring,
        notificationKey: `${budgetId}:card_expiring:${account.id}`,
        title: t("messages.cardExpiring", { name: account.name }),
        body: account.subscriptionNames.join(", ") || null,
      });
    }
  }

  return candidates;
}

export async function syncNotificationsForUser(
  userId: string,
  budgetId: string,
  locale: string | null,
): Promise<void> {
  const candidates = await getNotificationCandidates(budgetId, userId, locale);
  if (candidates.length === 0) return;

  const existing = await prisma.notification.findMany({
    where: { userId, notificationKey: { in: candidates.map((c) => c.notificationKey) } },
    select: { notificationKey: true, archivedAt: true },
  });
  const existingByKey = new Map(existing.map((e) => [e.notificationKey, e]));

  await Promise.all(
    candidates.map((candidate) => {
      const existingRow = existingByKey.get(candidate.notificationKey);
      if (!existingRow) {
        return prisma.notification.create({
          data: {
            userId,
            budgetId,
            type: candidate.type,
            notificationKey: candidate.notificationKey,
            title: candidate.title,
            body: candidate.body,
          },
        });
      }
      if (existingRow.archivedAt) {
        return prisma.notification.update({
          where: { userId_notificationKey: { userId, notificationKey: candidate.notificationKey } },
          data: {
            archivedAt: null,
            readAt: null,
            pushedAt: null,
            createdAt: new Date(),
            title: candidate.title,
            body: candidate.body,
          },
        });
      }
      return undefined;
    }),
  );
}
