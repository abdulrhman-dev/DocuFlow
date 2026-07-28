CREATE TABLE "OutsideSupervisors" (
	"email" text PRIMARY KEY NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"isIndustrial" boolean DEFAULT false NOT NULL,
	"academicDegreeAndInstitution" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OutsideRequestAssignments" (
	"requestId" integer NOT NULL,
	"outsideEmail" text NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"rejectionReason" text,
	"respondedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "OutsideRequestAssignments_requestId_outsideEmail_pk" PRIMARY KEY("requestId","outsideEmail")
);
--> statement-breakpoint
CREATE TABLE "OutsideSupervisedStudents" (
	"studentCode" text NOT NULL,
	"outsideEmail" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "OutsideSupervisedStudents_studentCode_outsideEmail_pk" PRIMARY KEY("studentCode","outsideEmail")
);
--> statement-breakpoint
CREATE TABLE "InstanceOutsideSupervisors" (
	"instanceId" integer NOT NULL,
	"outsideEmail" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "InstanceOutsideSupervisors_instanceId_outsideEmail_pk" PRIMARY KEY("instanceId","outsideEmail")
);
--> statement-breakpoint
ALTER TABLE "OutsideRequestAssignments" ADD CONSTRAINT "OutsideRequestAssignments_requestId_Requests_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."Requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OutsideRequestAssignments" ADD CONSTRAINT "OutsideRequestAssignments_outsideEmail_OutsideSupervisors_email_fk" FOREIGN KEY ("outsideEmail") REFERENCES "public"."OutsideSupervisors"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OutsideSupervisedStudents" ADD CONSTRAINT "OutsideSupervisedStudents_studentCode_Students_code_fk" FOREIGN KEY ("studentCode") REFERENCES "public"."Students"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OutsideSupervisedStudents" ADD CONSTRAINT "OutsideSupervisedStudents_outsideEmail_OutsideSupervisors_email_fk" FOREIGN KEY ("outsideEmail") REFERENCES "public"."OutsideSupervisors"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InstanceOutsideSupervisors" ADD CONSTRAINT "InstanceOutsideSupervisors_instanceId_WorkflowInstances_id_fk" FOREIGN KEY ("instanceId") REFERENCES "public"."WorkflowInstances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InstanceOutsideSupervisors" ADD CONSTRAINT "InstanceOutsideSupervisors_outsideEmail_OutsideSupervisors_email_fk" FOREIGN KEY ("outsideEmail") REFERENCES "public"."OutsideSupervisors"("email") ON DELETE cascade ON UPDATE no action;