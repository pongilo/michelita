-- RenameColumn
ALTER TABLE "product" RENAME COLUMN "markup" TO "multiplier";

-- Convert existing percentage-based markup values (e.g. 150 meaning 150%) into
-- the equivalent price multiplier (e.g. 2.5x), so stored data keeps the same meaning.
UPDATE "product" SET "multiplier" = 1 + ("multiplier" / 100) WHERE "multiplier" IS NOT NULL;
