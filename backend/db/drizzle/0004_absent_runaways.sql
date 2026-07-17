ALTER TYPE "public"."role" ADD VALUE 'dean';--> statement-breakpoint
ALTER TYPE "public"."instance_status" ADD VALUE 'executed';--> statement-breakpoint
ALTER TABLE "WorkflowInstances" ADD COLUMN "deanReviewedById" integer;--> statement-breakpoint
ALTER TABLE "WorkflowInstances" ADD COLUMN "deanReviewedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "WorkflowInstances" ADD COLUMN "deanRejectionReason" text;--> statement-breakpoint
ALTER TABLE "WorkflowInstances" ADD CONSTRAINT "WorkflowInstances_deanReviewedById_Users_id_fk" FOREIGN KEY ("deanReviewedById") REFERENCES "public"."Users"("id") ON DELETE set null ON UPDATE no action;