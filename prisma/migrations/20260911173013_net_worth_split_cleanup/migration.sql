-- Data migration: repoint every existing "net_worth" FeaturePermission grant to
-- "net_worth_assets", then give it a matching "net_worth_liabilities" sibling row with the same
-- level — preserves existing access instead of silently dropping it once "net_worth" is removed
-- from the Feature enum below. "net_worth_assets" cannot have had any rows before this UPDATE
-- (the value was only just added in the previous migration), so every row it now matches is
-- exactly the set that used to be "net_worth".
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "FeaturePermission" SET feature = 'net_worth_assets' WHERE feature = 'net_worth';

INSERT INTO "FeaturePermission" (id, "userId", "budgetId", feature, level, "createdAt", "updatedAt")
SELECT gen_random_uuid(), "userId", "budgetId", 'net_worth_liabilities', level, "createdAt", "updatedAt"
FROM "FeaturePermission"
WHERE feature = 'net_worth_assets';

-- AlterEnum: remove "net_worth" now that no row references it. Postgres has no direct DROP
-- VALUE for enums, so this recreates the type without it and repoints every column that uses it.
BEGIN;
CREATE TYPE "Feature_new" AS ENUM ('transactions', 'budget_envelope', 'plan', 'reports', 'repeating_transactions', 'subscriptions', 'budget_settings', 'audit_log', 'net_worth_assets', 'net_worth_liabilities', 'income_calculator');
ALTER TABLE "FeaturePermission" ALTER COLUMN "feature" TYPE "Feature_new" USING ("feature"::text::"Feature_new");
ALTER TABLE "PlatformFeatureToggle" ALTER COLUMN "feature" TYPE "Feature_new" USING ("feature"::text::"Feature_new");
ALTER TYPE "Feature" RENAME TO "Feature_old";
ALTER TYPE "Feature_new" RENAME TO "Feature";
DROP TYPE "Feature_old";
COMMIT;
