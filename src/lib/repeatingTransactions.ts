import "server-only";
import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";
import { getPlatformFeatureToggles } from "@/lib/platformFeatures";
import { nextOccurrence } from "@/lib/recurrence";

const MAX_OCCURRENCES_PER_ROW = 500;

export async function processDueRepeatingTransactions(): Promise<number> {
  const toggles = await getPlatformFeatureToggles();
  if (!toggles[Feature.repeating_transactions]) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const due = await prisma.repeatingTransaction.findMany({
    where: { isActive: true, nextOccurrenceDate: { lte: today } },
    include: { splits: true },
  });

  let posted = 0;
  for (const rt of due) {
    let occurrenceDate = rt.nextOccurrenceDate;
    let lastCreated = rt.lastCreatedDate;
    let iterations = 0;

    while (occurrenceDate <= today && iterations < MAX_OCCURRENCES_PER_ROW) {
      const hasSplits = rt.splits.length > 0;
      await prisma.transaction.create({
        data: {
          accountId: rt.accountId,
          postDate: occurrenceDate,
          payeeId: rt.payeeId,
          categoryId: hasSplits ? null : rt.categoryId,
          memo: rt.memo,
          debit: rt.debit,
          credit: rt.credit,
          cleared: false,
          isScheduled: false,
          pendingApproval: true,
          isSplit: hasSplits,
          repeatingTransactionId: rt.id,
          ...(hasSplits && {
            splits: {
              create: rt.splits.map((s) => ({
                categoryId: s.categoryId,
                memo: s.memo,
                debit: s.debit,
                credit: s.credit,
              })),
            },
          }),
        },
      });
      posted += 1;
      lastCreated = occurrenceDate;
      occurrenceDate = nextOccurrence(occurrenceDate, rt.repeatType, rt.intervalWeeks);
      iterations += 1;
    }

    await prisma.repeatingTransaction.update({
      where: { id: rt.id },
      data: { nextOccurrenceDate: occurrenceDate, lastCreatedDate: lastCreated },
    });
  }

  return posted;
}
