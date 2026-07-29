CREATE TABLE "OtpRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"otp" text NOT NULL,
	"photoHash" text NOT NULL,
	"filePath" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"consumedAt" timestamp with time zone,
	"consumedByInstanceId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "OtpRecords_otp_unique" UNIQUE("otp")
);
