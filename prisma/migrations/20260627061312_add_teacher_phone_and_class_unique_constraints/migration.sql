/*
  Warnings:

  - A unique constraint covering the columns `[grade,name,teacherId]` on the table `Class` will be added.
  - A unique constraint covering the columns `[phone]` on the table `Teacher` will be added.

  Pre-migration cleanup below deduplicates existing rows so deploy succeeds on non-empty databases.
*/

-- AlterTable
ALTER TABLE "Teacher" ALTER COLUMN "email" DROP NOT NULL;

-- Normalize empty phones to NULL (empty strings violate UNIQUE)
UPDATE "Teacher" SET "phone" = NULL WHERE "phone" = '';

-- Deduplicate phones: keep earliest teacher per phone, null out the rest
WITH ranked_phones AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "phone" ORDER BY "createdAt" ASC) AS rn
  FROM "Teacher"
  WHERE "phone" IS NOT NULL
)
UPDATE "Teacher" t
SET "phone" = NULL
FROM ranked_phones r
WHERE t.id = r.id AND r.rn > 1;

-- Merge duplicate classes per teacher (same grade + name + teacherId)
WITH keepers AS (
  SELECT DISTINCT ON (grade, name, "teacherId")
    id AS keeper_id,
    grade,
    name,
    "teacherId"
  FROM "Class"
  ORDER BY grade, name, "teacherId", "createdAt" ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.keeper_id
  FROM "Class" c
  INNER JOIN keepers k
    ON c.grade = k.grade
    AND c.name = k.name
    AND c."teacherId" = k."teacherId"
  WHERE c.id <> k.keeper_id
)
UPDATE "Student" s
SET "classId" = d.keeper_id
FROM dupes d
WHERE s."classId" = d.dupe_id;

WITH keepers AS (
  SELECT DISTINCT ON (grade, name, "teacherId")
    id AS keeper_id,
    grade,
    name,
    "teacherId"
  FROM "Class"
  ORDER BY grade, name, "teacherId", "createdAt" ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.keeper_id
  FROM "Class" c
  INNER JOIN keepers k
    ON c.grade = k.grade
    AND c.name = k.name
    AND c."teacherId" = k."teacherId"
  WHERE c.id <> k.keeper_id
)
UPDATE "Assignment" a
SET "classId" = d.keeper_id
FROM dupes d
WHERE a."classId" = d.dupe_id;

WITH keepers AS (
  SELECT DISTINCT ON (grade, name, "teacherId")
    id AS keeper_id,
    grade,
    name,
    "teacherId"
  FROM "Class"
  ORDER BY grade, name, "teacherId", "createdAt" ASC
),
dupes AS (
  SELECT c.id AS dupe_id
  FROM "Class" c
  INNER JOIN keepers k
    ON c.grade = k.grade
    AND c.name = k.name
    AND c."teacherId" = k."teacherId"
  WHERE c.id <> k.keeper_id
)
DELETE FROM "Class" c
USING dupes d
WHERE c.id = d.dupe_id;

-- CreateIndex
CREATE UNIQUE INDEX "Class_grade_name_teacherId_key" ON "Class"("grade", "name", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_phone_key" ON "Teacher"("phone");