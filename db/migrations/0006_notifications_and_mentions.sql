-- ============================================================
-- Migration: Add Notifications System and Mentions Columns
-- Target: Neon PostgreSQL Database
-- Date: 2026-02-04
-- ============================================================

-- 1. Create notification_type enum
CREATE TYPE "public"."notification_type" AS ENUM('assigned', 'mentioned');

-- 2. Create notifications table
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"task_id" uuid,
	"type" "notification_type" NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 3. Add mentions columns to tasks table
ALTER TABLE "tasks" ADD COLUMN "completion_mentions" jsonb;
ALTER TABLE "tasks" ADD COLUMN "description_mentions" jsonb;

-- 4. Add foreign key constraints to notifications
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipient_id_users_id_fk"
  FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_actor_id_users_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_task_id_tasks_id_fk"
  FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id")
  ON DELETE cascade ON UPDATE no action;

-- 5. Create indexes for notifications table
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id");
CREATE INDEX "notifications_recipient_read_idx" ON "notifications" USING btree ("recipient_id", "is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");

-- ============================================================
-- Verification queries (run after migration to confirm)
-- ============================================================
-- SELECT * FROM pg_type WHERE typname = 'notification_type';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' AND column_name LIKE '%mentions%';
