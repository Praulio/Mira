import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

/**
 * Custom auth wrapper to allow E2E testing bypass
 */
export async function getAuth() {
  const headerList = await headers();
  const isTest = headerList.get('x-e2e-test') === 'true';

  if (isTest) {
    return {
      userId: 'user_e2e_test_123',
    };
  }

  return auth();
}
