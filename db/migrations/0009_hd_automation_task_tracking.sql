CREATE TYPE "public"."task_automation_status" AS ENUM('claimed', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "automation_status" "task_automation_status";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "automation_claimed_by" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "automation_claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "automation_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "automation_run_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "automation_target_repo" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "automation_branch" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "automation_commit_sha" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "automation_last_error" text;--> statement-breakpoint
CREATE INDEX "tasks_automation_status_idx" ON "tasks" USING btree ("automation_status");--> statement-breakpoint
CREATE INDEX "tasks_automation_run_idx" ON "tasks" USING btree ("automation_run_id");
