ALTER TABLE "Students" ALTER COLUMN "nationalId" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "RequestAssignments" ADD COLUMN "isExtended" boolean;--> statement-breakpoint
ALTER TABLE "Students" ADD CONSTRAINT "Students_nationalId_unique" UNIQUE("nationalId");