import "server-only";
import { spawn } from "node:child_process";
import { createCipheriv, randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, open, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { prisma } from "@/lib/prisma";
import { deriveKey } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import type { BackupType } from "@/generated/prisma/client";

function getBackupsDir(): string {
  return process.env.BACKUPS_PATH || path.join(process.cwd(), "backups");
}

export interface RunBackupResult {
  id: string;
  status: "completed" | "failed";
  errorMessage?: string;
}

export async function runBackup(type: BackupType): Promise<RunBackupResult> {
  const dir = getBackupsDir();
  await mkdir(dir, { recursive: true });

  const backup = await prisma.backup.create({ data: { type, status: "running" } });
  const filename = `corebudget-${backup.startedAt.toISOString().replace(/[:.]/g, "-")}.sql.enc`;
  const filePath = path.join(dir, filename);

  try {
    const rawDatabaseUrl = process.env.DATABASE_URL;
    if (!rawDatabaseUrl) throw new Error("DATABASE_URL is not set");
    const databaseUrl = rawDatabaseUrl.split("?")[0];

    const key = deriveKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const pgDump = spawn("pg_dump", [databaseUrl, "--format=plain", "--no-owner"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    pgDump.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const fileStream = createWriteStream(filePath);
    fileStream.write(iv);

    const [exitCode] = await Promise.all([
      new Promise<number>((resolve, reject) => {
        pgDump.on("error", reject);
        pgDump.on("close", resolve);
      }),
      pipeline(pgDump.stdout, cipher, fileStream, { end: false }),
    ]);

    if (exitCode !== 0) {
      throw new Error(`pg_dump exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
    }

    const authTag = cipher.getAuthTag();
    const fh = await open(filePath, "a");
    await fh.write(authTag);
    await fh.close();

    const { size } = await stat(filePath);

    await prisma.backup.update({
      where: { id: backup.id },
      data: { status: "completed", completedAt: new Date(), sizeBytes: size, filename },
    });

    return { id: backup.id, status: "completed" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, backupId: backup.id }, "Backup failed");
    await unlink(filePath).catch(() => {});
    await prisma.backup.update({
      where: { id: backup.id },
      data: { status: "failed", completedAt: new Date(), errorMessage },
    });
    return { id: backup.id, status: "failed", errorMessage };
  }
}

export function getBackupFilePath(filename: string): string {
  return path.join(getBackupsDir(), filename);
}

export async function pruneOldBackups(retentionDays: number): Promise<{ count: number }> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const stale = await prisma.backup.findMany({
    where: { status: "completed", startedAt: { lt: cutoff } },
  });
  for (const b of stale) {
    if (b.filename) {
      await unlink(getBackupFilePath(b.filename)).catch(() => {});
    }
    await prisma.backup.delete({ where: { id: b.id } });
  }
  return { count: stale.length };
}
