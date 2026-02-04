import { getHistorialData, type HistorialViewMode } from '@/app/actions/tasks';
import { HistorialView } from '@/components/historial-view';
import { getAuth } from '@/lib/mock-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ date?: string; user?: string; view?: string }>;
};

/**
 * Historial Page - View completed tasks by day or week
 *
 * Shows tasks completed in a period with:
 * - Day/Week toggle
 * - Period navigation with arrows
 * - User filter
 * - Expandable task cards
 */
export default async function HistorialPage({ searchParams }: PageProps) {
  const { userId } = await getAuth();

  if (!userId) {
    redirect('/sign-in');
  }

  const params = await searchParams;

  // Parse date from URL or use today
  const date = params.date ? new Date(params.date) : new Date();

  // Validate date
  if (isNaN(date.getTime())) {
    redirect('/dashboard/kanban/historial');
  }

  // Parse view mode (default to week for faster browsing)
  const viewMode: HistorialViewMode =
    params.view === 'day' ? 'day' : 'week';

  const historialData = await getHistorialData({
    date,
    userId: params.user,
    mode: viewMode,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Historial de Tareas
          </h2>
          <p className="text-muted-foreground">
            Tareas completadas por {viewMode === 'week' ? 'semana' : 'día'}
          </p>
        </div>
      </div>

      <HistorialView
        initialData={historialData}
        initialDate={date}
        initialUserId={params.user}
        initialViewMode={viewMode}
      />
    </div>
  );
}
