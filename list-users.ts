import { db } from './db';
import { users } from './db/schema';

async function listUsers() {
  const allUsers = await db.select().from(users);
  console.log(JSON.stringify(allUsers, null, 2));
  process.exit(0);
}

listUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
