ALTER TABLE "users" ADD COLUMN "invitation_token_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invitation_token_expires" timestamp with time zone;