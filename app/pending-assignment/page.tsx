import { getAreaContext } from '@/lib/area-context';
import { redirect } from 'next/navigation';
import { AreaSelector } from './area-selector';

export default async function PendingAssignmentPage() {
  const context = await getAreaContext();

  // If user has area assigned or is superadmin, redirect to dashboard
  if (context?.isAssigned) {
    redirect('/dashboard');
  }

  // If not authenticated, redirect to sign-in
  if (!context) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AreaSelector />
    </div>
  );
}
