ALTER TYPE "public"."activity_action" ADD VALUE 'completed';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'mentioned';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_critical" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completion_notes" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completion_links" jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completion_mentions" jsonb;