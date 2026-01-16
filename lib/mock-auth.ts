import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

/**
 * Custom auth wrapper to allow E2E testing bypass
 */
export async function getAuth() {
  // If we are in a testing environment (Vitest), return a mock user
  if (process.env.NODE_ENV === 'test') {
    return {
      userId: 'user_e2e_test_123',
    };
  }

  try {
    const headerList = await headers();
    const isTest = headerList.get('x-e2e-test') === 'true';

    if (isTest) {
      return {
        userId: 'user_e2e_test_123',
      };
    }
  } catch (e) {
    // Fallback if headers() is called outside of request scope
    // This happens during build or some test environments
  }

  return auth();
}
