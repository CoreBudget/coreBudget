#!/bin/sh
# /api/health does a real Prisma round-trip (SELECT 1), so a single successful curl here proves
# both the Next.js app and Postgres are up and talking to each other. No separate pg_isready
# check is needed on top of this.
exec curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null
