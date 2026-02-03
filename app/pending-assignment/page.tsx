import { getAreaContext } from '@/lib/area-context';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Clock } from 'lucide-react';

export default async function PendingAssignmentPage() {
  const context = await getAreaContext();

  // If user has area assigned or is superadmin, redirect to dashboard
  if (context?.isAssigned) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Esperando Asignacion</h1>
          <p className="text-muted-foreground">
            Tu cuenta ha sido creada correctamente. Un administrador te
            asignara a un area de trabajo pronto.
          </p>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            Mientras tanto, puedes cerrar sesion si lo deseas.
          </p>
          <div className="flex justify-center">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </div>
    </div>
  );
}
