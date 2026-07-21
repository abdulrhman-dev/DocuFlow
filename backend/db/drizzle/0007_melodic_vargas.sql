ALTER TABLE "Students" DROP CONSTRAINT "Students_nationalId_unique";--> statement-breakpoint
ALTER TABLE "Students" ALTER COLUMN "nationalId" SET DEFAULT '';