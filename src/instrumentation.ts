export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const cron = await import("node-cron");
  const { prisma } = await import("@/lib/prisma");
  const { runBackup, pruneOldBackups } = await import("@/lib/backup");
  const { recordJobRun } = await import("@/lib/jobRuns");
  const { logger } = await import("@/lib/logger");
  const { processDueRepeatingTransactions } = await import("@/lib/repeatingTransactions");
  const { captureCategoryPlanSnapshots } = await import("@/lib/categoryPlanSnapshot");
  const { getAccessibleHouseholds } = await import("@/lib/workspace");
  const { syncNotificationsForUser } = await import("@/lib/notifications");
  const { sendPushNotification } = await import("@/lib/pushService");
  const { recordError, ErrorLogSource } = await import("@/lib/errorLog");

  process.on("uncaughtException", (err) => {
    void recordError(err, ErrorLogSource.uncaught_exception);
  });
  process.on("unhandledRejection", (reason) => {
    void recordError(reason, ErrorLogSource.unhandled_rejection);
  });

  cron.schedule("0 3 * * *", () =>
    recordJobRun("automatic_backup", async () => {
      const settings = await prisma.platformSettings.findFirst();
      if (!settings?.backupEnabled) return "Skipped: automatic backups disabled.";
      const result = await runBackup("automatic");
      if (result.status === "failed") {
        throw new Error(result.errorMessage || "Backup failed");
      }
      const { count } = await pruneOldBackups(settings.backupRetentionDays);
      return `Backup completed; pruned ${count} expired backup(s).`;
    }),
  );

  cron.schedule("0 * * * *", () =>
    recordJobRun("session_cleanup", async () => {
      const settings = await prisma.platformSettings.findFirst();
      const timeoutMinutes = settings?.sessionTimeoutMinutes ?? 1440;
      const cutoff = new Date(Date.now() - timeoutMinutes * 60_000 * 7);
      const { count } = await prisma.userSession.deleteMany({
        where: { lastActiveAt: { lt: cutoff } },
      });
      return `Removed ${count} expired session(s).`;
    }),
  );

  cron.schedule("0 4 * * *", () =>
    recordJobRun("audit_log_retention", async () => {
      const cutoff = new Date(Date.now() - 2 * 365 * 86_400_000);
      const { count } = await prisma.auditLogEntry.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      return `Removed ${count} audit log entr${count === 1 ? "y" : "ies"} older than 2 years.`;
    }),
  );

  cron.schedule("30 4 * * *", () =>
    recordJobRun("error_log_retention", async () => {
      const cutoff = new Date(Date.now() - 30 * 86_400_000);
      const { count } = await prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      return `Removed ${count} error log entr${count === 1 ? "y" : "ies"} older than 30 days.`;
    }),
  );

  cron.schedule("0 6 * * *", () =>
    recordJobRun("process_due_repeating_transactions", async () => {
      const count = await processDueRepeatingTransactions();
      return `Posted ${count} occurrence(s).`;
    }),
  );

  cron.schedule("0 0 1 * *", () =>
    recordJobRun("category_plan_snapshot", async () => {
      const { count, month } = await captureCategoryPlanSnapshots();
      return `Captured ${count} category plan snapshot(s) for ${month}.`;
    }),
  );

  await recordJobRun("category_plan_snapshot_startup_check", async () => {
    const { count, month } = await captureCategoryPlanSnapshots();
    return count > 0
      ? `Backfilled ${count} missing category plan snapshot(s) for ${month}.`
      : `No missing category plan snapshots for ${month}.`;
  });

  cron.schedule("*/15 * * * *", () =>
    recordJobRun("send_push_notifications", async () => {
      const subscriptionCount = await prisma.pushSubscription.count();
      if (subscriptionCount === 0) return "No push subscriptions, skipped.";

      const subscribedUsers = await prisma.pushSubscription.findMany({
        select: { userId: true },
        distinct: ["userId"],
      });

      let sentCount = 0;
      for (const { userId } of subscribedUsers) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) continue;

        const households = await getAccessibleHouseholds(userId);
        const budgetIds = households.flatMap((h) => h.budgets.map((b) => b.id));
        for (const budgetId of budgetIds) {
          await syncNotificationsForUser(userId, budgetId, user.locale);
        }

        const pushEnabledPreferences = await prisma.notificationPreference.findMany({
          where: { userId, pushEnabled: true },
          select: { notificationType: true },
        });
        if (pushEnabledPreferences.length === 0) continue;

        const unpushed = await prisma.notification.findMany({
          where: {
            userId,
            pushedAt: null,
            archivedAt: null,
            type: { in: pushEnabledPreferences.map((p) => p.notificationType) },
          },
        });
        if (unpushed.length === 0) continue;

        const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
        for (const notification of unpushed) {
          for (const subscription of subscriptions) {
            await sendPushNotification(subscription, {
              title: notification.title,
              body: notification.body ?? "",
              url: "/notifications",
            });
          }
          await prisma.notification.update({
            where: { id: notification.id },
            data: { pushedAt: new Date() },
          });
          sentCount += 1;
        }
      }

      return `Sent ${sentCount} push notification(s).`;
    }),
  );

  logger.info(
    "Scheduled jobs registered (backups, session cleanup, audit log retention, error log retention, repeating transactions, category plan snapshots, push notifications)",
  );
}
