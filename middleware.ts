import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Check if we have valid Clerk keys
const hasValidClerkKeys = 
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'pk_test_placeholder' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_');

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
])

// Create middleware based on whether we have valid Clerk keys
const middleware = hasValidClerkKeys
  ? clerkMiddleware(async (auth, request) => {
      // Allow bypass for E2E tests in local environment
      const isTestEnv = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
      const isTestHeader = request.headers.get('x-e2e-test') === 'true'
      
      if (isTestEnv && isTestHeader) {
        return NextResponse.next()
      }

      if (!isPublicRoute(request)) {
        await auth.protect()
      }
    })
  : () => {
      // Bypass auth if no valid Clerk keys (development mode)
      return NextResponse.next()
    }

export default middleware

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
