import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getBackupFilePath } from "@/lib/backup";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTranslations();

  const backup = await prisma.backup.findUnique({ where: { id } });
  if (!backup || backup.status !== "completed" || !backup.filename) {
    return NextResponse.json({ error: t("admin.backups.errors.notFound") }, { status: 404 });
  }

  const filePath = getBackupFilePath(backup.filename);
  const { size } = await stat(filePath).catch(() => ({ size: 0 }));
  if (size === 0) {
    return NextResponse.json({ error: t("admin.backups.errors.fileMissing") }, { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${backup.filename}"`,
      "Content-Length": String(size),
    },
  });
}
