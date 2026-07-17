ALTER TABLE "RequestAssignments" ADD COLUMN "year" integer;--> statement-breakpoint
ALTER TABLE "RequestAssignments" ADD COLUMN "month" integer;--> statement-breakpoint
ALTER TABLE "RequestAssignments" ADD CONSTRAINT "request_assignments_month_range" CHECK ("RequestAssignments"."month" IS NULL OR ("RequestAssignments"."month" BETWEEN 1 AND 12));--> statement-breakpoint
ALTER TABLE "RequestAssignments" ADD CONSTRAINT "request_assignments_year_range" CHECK ("RequestAssignments"."year" IS NULL OR ("RequestAssignments"."year" BETWEEN 1900 AND 3000));