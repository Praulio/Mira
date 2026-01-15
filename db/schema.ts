import { pgTable, text, timestamp, integer, uuid, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Enum for task status
 */
export const taskStatusEnum = pgEnum('task_status', [
  'backlog',
  'todo',
  'in_progress',
  'done'
]);

/**
 * Enum for activity actions
 */
export const activityActionEnum = pgEnum('activity_action', [
  'created',
  'status_changed',
  'assigned',
  'updated',
  'deleted'
]);

/**
 * Users table - synced from Clerk via webhook
 */
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull(),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  slotIndex: integer('slot_index'), // 0-7 for team view positioning
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Tasks table
 */
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('backlog'),
  assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  creatorId: text('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  assigneeIdx: index('tasks_assignee_idx').on(table.assigneeId),
  statusIdx: index('tasks_status_idx').on(table.status),
  creatorIdx: index('tasks_creator_idx').on(table.creatorId),
}));

/**
 * Activity table - tracks all task-related events
 */
export const activity = pgTable('activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: activityActionEnum('action').notNull(),
  metadata: jsonb('metadata'), // Store old/new values, previous status, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  taskIdx: index('activity_task_idx').on(table.taskId),
  createdAtIdx: index('activity_created_at_idx').on(table.createdAt),
  userIdx: index('activity_user_idx').on(table.userId),
}));
