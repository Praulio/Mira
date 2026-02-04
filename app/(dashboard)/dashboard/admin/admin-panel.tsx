'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { assignUserArea, setUserRole, removeUserArea } from '@/app/actions/admin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Code2, Building2, Shield, User, X } from 'lucide-react';

type UserData = {
  id: string;
  email: string;
  name: string;
  imageUrl: string | null;
  area: 'desarrollo' | 'agencia' | null;
  role: 'user' | 'superadmin';
  createdAt: Date;
};

export function AdminPanel({ users }: { users: UserData[] }) {
  const [isPending, startTransition] = useTransition();

  const handleAreaChange = (userId: string, area: 'desarrollo' | 'agencia' | 'none') => {
    startTransition(async () => {
      try {
        if (area === 'none') {
          await removeUserArea(userId);
          toast.success('Area removida');
        } else {
          await assignUserArea(userId, area);
          toast.success('Area asignada');
        }
      } catch {
        toast.error('Error al cambiar area');
      }
    });
  };

  const handleRoleChange = (userId: string, role: 'user' | 'superadmin') => {
    startTransition(async () => {
      try {
        await setUserRole(userId, role);
        toast.success('Rol actualizado');
      } catch {
        toast.error('Error al cambiar rol');
      }
    });
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Usuario</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Area</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rol</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt={user.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <span className="text-sm font-medium">{user.name[0]}</span>
                      </div>
                    )}
                    <span className="font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAreaChange(user.id, 'desarrollo')}
                      disabled={isPending}
                      className={cn(
                        'gap-1',
                        user.area === 'desarrollo' && 'bg-blue-500/10 border-blue-500/50 text-blue-600'
                      )}
                    >
                      <Code2 className="h-3 w-3" />
                      Dev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAreaChange(user.id, 'agencia')}
                      disabled={isPending}
                      className={cn(
                        'gap-1',
                        user.area === 'agencia' && 'bg-purple-500/10 border-purple-500/50 text-purple-600'
                      )}
                    >
                      <Building2 className="h-3 w-3" />
                      Agencia
                    </Button>
                    {user.area && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAreaChange(user.id, 'none')}
                        disabled={isPending}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRoleChange(user.id, 'user')}
                      disabled={isPending}
                      className={cn(
                        'gap-1',
                        user.role === 'user' && 'bg-green-500/10 border-green-500/50 text-green-600'
                      )}
                    >
                      <User className="h-3 w-3" />
                      Usuario
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRoleChange(user.id, 'superadmin')}
                      disabled={isPending}
                      className={cn(
                        'gap-1',
                        user.role === 'superadmin' && 'bg-amber-500/10 border-amber-500/50 text-amber-600'
                      )}
                    >
                      <Shield className="h-3 w-3" />
                      Admin
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.area ? (
                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
                      Pendiente
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
