/**
 * Decrypts a CoreBudget backup (`Admin → Backups`, `src/lib/backup.ts`) back into a plain
 * `.sql` file so it can be loaded into another instance's Postgres, e.g. moving data from a
 * test/dev deployment to a production one on a different device.
 *
 * File format written by runBackup(): [12-byte IV][AES-256-GCM ciphertext][16-byte auth tag].
 * The decryption key is derived from APP_ENCRYPTION_KEY the same way src/lib/crypto.ts does.
 * This MUST be the same APP_ENCRYPTION_KEY value the source instance used to create the
 * backup, not whatever key the target instance happens to have in its own .env.
 *
 * Usage:
 *   npm run backup:decrypt -- <input.sql.enc> <output.sql>
 *
 * Then load the result into a FRESH, EMPTY target database (the dump has no --clean/--if-exists,
 * so it will fail with "already exists" errors against a database that's already been through
 * First-Time Setup):
 *   psql "$DATABASE_URL" -f <output.sql>
 */
import "dotenv/config";
import { createDecipheriv } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { deriveKey } from "../src/lib/crypto";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    console.error("Usage: npm run backup:decrypt -- <input.sql.enc> <output.sql>");
    process.exit(1);
  }

  const encrypted = await readFile(inputPath);
  if (encrypted.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("File is too small to be a valid CoreBudget backup.");
  }

  const iv = encrypted.subarray(0, IV_LENGTH);
  const authTag = encrypted.subarray(encrypted.length - AUTH_TAG_LENGTH);
  const ciphertext = encrypted.subarray(IV_LENGTH, encrypted.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  await writeFile(outputPath, plaintext);

  console.log(`Decrypted ${inputPath} -> ${outputPath} (${plaintext.length} bytes).`);
}

main().catch((err) => {
  console.error(
    err instanceof Error && err.message.includes("Unsupported state or unable to authenticate data")
      ? "Decryption failed. This almost always means APP_ENCRYPTION_KEY doesn't match the key the backup was created with."
      : err,
  );
  process.exit(1);
});
