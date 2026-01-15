# Database Setup

## Prerequisites

1. Set up a Neon Postgres database at https://console.neon.tech
2. Copy the connection string to your `.env.local` as `DATABASE_URL`

## Running Migrations

### First Time Setup

```bash
# Generate migration files (already done)
npx drizzle-kit generate

# Apply migrations to database
npx drizzle-kit push
```

### After Schema Changes

```bash
# Generate new migration
npx drizzle-kit generate

# Apply to database
npx drizzle-kit push
```

## Drizzle Studio (GUI)

To inspect your database visually:

```bash
npx drizzle-kit studio
```

This will open a web interface at http://localhost:4983

## Current Schema

### Users Table
- Synced automatically from Clerk via webhook
- Fields: id (Clerk ID), email, name, imageUrl, slotIndex, timestamps
