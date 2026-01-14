-- DropIndex
DROP INDEX "Role_name_key";

--Alter table
ALTER TABLE "Role" ALTER COLUMN "description" SET DEFAULT '';

CREATE UNIQUE INDEX "Role_name_unique" ON "Role" (name) WHERE "deletedAt" IS NULL;