-- Create enums
CREATE TYPE "public"."area" AS ENUM('desarrollo', 'agencia');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'superadmin');--> statement-breakpoint

-- Add area column to users (nullable for pending assignment)
ALTER TABLE "users" ADD COLUMN "area" "area";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint

-- Add area columns as nullable first
ALTER TABLE "activity" ADD COLUMN "area" "area";--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "area" "area";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "area" "area";--> statement-breakpoint

-- Migrate existing data to 'desarrollo'
UPDATE "users" SET "area" = 'desarrollo' WHERE "area" IS NULL;--> statement-breakpoint
UPDATE "activity" SET "area" = 'desarrollo' WHERE "area" IS NULL;--> statement-breakpoint
UPDATE "attachments" SET "area" = 'desarrollo' WHERE "area" IS NULL;--> statement-breakpoint
UPDATE "tasks" SET "area" = 'desarrollo' WHERE "area" IS NULL;--> statement-breakpoint

-- Now make area NOT NULL for data tables (not users - NULL means pending)
ALTER TABLE "activity" ALTER COLUMN "area" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "area" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "area" SET NOT NULL;--> statement-breakpoint

-- Create indexes
CREATE INDEX "activity_area_idx" ON "activity" USING btree ("area");--> statement-breakpoint
CREATE INDEX "attachments_area_idx" ON "attachments" USING btree ("area");--> statement-breakpoint
CREATE INDEX "tasks_area_idx" ON "tasks" USING btree ("area");
