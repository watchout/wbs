-- Step 1: Add slug column as nullable
ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;

-- Step 2: Populate slug for existing organizations
-- demo-org-001 → "demo"
UPDATE "Organization" SET "slug" = 'demo' WHERE "id" = 'demo-org-001';
-- mielplus-system → "mielplus-system"
UPDATE "Organization" SET "slug" = 'mielplus-system' WHERE "id" = 'mielplus-system';
-- Other orgs: generate slug from short UUID
UPDATE "Organization"
SET "slug" = 'org-' || LEFT(REPLACE("id"::TEXT, '-', ''), 8)
WHERE "slug" IS NULL;

-- Step 3: Make slug NOT NULL
ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;

-- Step 4: Add unique constraint
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
