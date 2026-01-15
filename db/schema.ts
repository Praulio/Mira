import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

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
