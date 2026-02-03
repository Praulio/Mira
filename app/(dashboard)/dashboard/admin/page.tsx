import { redirect } from 'next/navigation';
import { getAreaContext } from '@/lib/area-context';
import { getAllUsers } from '@/app/actions/admin';
import { AdminPanel } from './admin-panel';

export default async function AdminPage() {
  const context = await getAreaContext();

  // Only superadmin can access
  if (!context || context.userRole !== 'superadmin') {
    redirect('/dashboard');
  }

  const users = await getAllUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Administracion</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios y asignaciones de area
        </p>
      </div>

      <AdminPanel users={users} />
    </div>
  );
}
