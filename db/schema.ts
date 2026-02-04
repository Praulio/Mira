import { pgTable, text, timestamp, integer, uuid, pgEnum, jsonb, index, boolean, type AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * Enum for work areas (multi-tenancy)
 */
export const areaEnum = pgEnum('area', ['desarrollo', 'agencia']);

/**
 * Enum for user roles
 */
export const userRoleEnum = pgEnum('user_role', ['user', 'superadmin']);

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
  'deleted',
  'completed',
  'mentioned'
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
  area: areaEnum('area'), // NULL = pending assignment
  role: userRoleEnum('role').default('user').notNull(),
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
  isCritical: boolean('is_critical').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  completionNotes: text('completion_notes'),
  completionLinks: jsonb('completion_links').$type<string[]>(),
  mentions: jsonb('mentions').$type<string[]>(),
  startedAt: timestamp('started_at'),
  parentTaskId: uuid('parent_task_id').references((): AnyPgColumn => tasks.id, { onDelete: 'set null' }),
  dueDate: timestamp('due_date'),
  progress: integer('progress').default(0),
  blockerReason: text('blocker_reason'), // NULL = no bloqueada, string = razón del bloqueo
  area: areaEnum('area').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  assigneeIdx: index('tasks_assignee_idx').on(table.assigneeId),
  statusIdx: index('tasks_status_idx').on(table.status),
  creatorIdx: index('tasks_creator_idx').on(table.creatorId),
  parentTaskIdx: index('tasks_parent_task_idx').on(table.parentTaskId),
  areaIdx: index('tasks_area_idx').on(table.area),
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
  area: areaEnum('area').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  taskIdx: index('activity_task_idx').on(table.taskId),
  createdAtIdx: index('activity_created_at_idx').on(table.createdAt),
  userIdx: index('activity_user_idx').on(table.userId),
  areaIdx: index('activity_area_idx').on(table.area),
}));

/**
 * Attachments table - stores file references for tasks
 * Files are stored in Google Drive, this table holds metadata
 */
export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  driveFileId: text('drive_file_id').notNull(),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  area: areaEnum('area').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
}, (table) => ({
  taskIdx: index('attachments_task_idx').on(table.taskId),
  uploadedByIdx: index('attachments_uploaded_by_idx').on(table.uploadedBy),
  areaIdx: index('attachments_area_idx').on(table.area),
}));
