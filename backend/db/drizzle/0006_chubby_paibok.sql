ALTER TABLE "Students" ADD COLUMN "nationalId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "Students" ADD COLUMN "gpa" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "Students" ADD COLUMN "creditHours" integer;--> statement-breakpoint
ALTER TABLE "Students" ADD CONSTRAINT "Students_nationalId_unique" UNIQUE("nationalId");