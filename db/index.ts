import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a connection pool for Neon serverless
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize Drizzle ORM with the Neon pool
export const db = drizzle(pool);
