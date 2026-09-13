import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ErrorLogSource } from "@/generated/prisma/client";

export { ErrorLogSource };

export async function recordError(
  error: unknown,
  source: ErrorLogSource,
  path?: string,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;
  logger.error({ err: error, source, path }, "Unexpected error");
  await persist({ source, message, stack, path: path ?? null });
}

export async function recordClientError(
  message: string,
  stack: string | null,
  path: string | null,
): Promise<void> {
  logger.error(
    { message, stack, path, source: ErrorLogSource.react_error_boundary },
    "Unexpected error",
  );
  await persist({ source: ErrorLogSource.react_error_boundary, message, stack, path });
}

export function registerProcessErrorHandlers(): void {
  process.on("uncaughtException", (err) => {
    void recordError(err, ErrorLogSource.uncaught_exception);
  });
  process.on("unhandledRejection", (reason) => {
    void recordError(reason, ErrorLogSource.unhandled_rejection);
  });
}

async function persist(data: {
  source: ErrorLogSource;
  message: string;
  stack: string | null;
  path: string | null;
}): Promise<void> {
  try {
    await prisma.errorLog.create({ data });
  } catch (dbError) {
    logger.error({ err: dbError }, "Failed to persist ErrorLog row");
  }
}
