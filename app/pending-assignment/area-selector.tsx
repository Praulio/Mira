'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, Megaphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserButton } from '@clerk/nextjs';
import { selfAssignArea } from '@/app/actions/area';
import { cn } from '@/lib/utils';

type Area = 'desarrollo' | 'agencia';

export function AreaSelector() {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async () => {
    if (!selectedArea) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await selfAssignArea(selectedArea);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Error al asignar área');
        setIsSubmitting(false);
      }
    } catch {
      setError('Error inesperado');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg w-full p-8 text-center space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Bienvenido a Mira</h1>
        <p className="text-muted-foreground">
          Selecciona el área en la que trabajas para continuar
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setSelectedArea('desarrollo')}
          disabled={isSubmitting}
          className={cn(
            'group relative flex flex-col items-center gap-4 rounded-xl border-2 p-6 transition-all duration-200',
            selectedArea === 'desarrollo'
              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
              : 'border-border hover:border-blue-500/50 hover:bg-blue-500/5'
          )}
        >
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-xl transition-colors',
              selectedArea === 'desarrollo'
                ? 'bg-blue-500 text-white'
                : 'bg-muted text-muted-foreground group-hover:bg-blue-500/20 group-hover:text-blue-500'
            )}
          >
            <Code2 className="h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold">Desarrollo</p>
            <p className="text-xs text-muted-foreground">Equipo técnico</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedArea('agencia')}
          disabled={isSubmitting}
          className={cn(
            'group relative flex flex-col items-center gap-4 rounded-xl border-2 p-6 transition-all duration-200',
            selectedArea === 'agencia'
              ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
              : 'border-border hover:border-purple-500/50 hover:bg-purple-500/5'
          )}
        >
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-xl transition-colors',
              selectedArea === 'agencia'
                ? 'bg-purple-500 text-white'
                : 'bg-muted text-muted-foreground group-hover:bg-purple-500/20 group-hover:text-purple-500'
            )}
          >
            <Megaphone className="h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold">Agencia</p>
            <p className="text-xs text-muted-foreground">Marketing y diseño</p>
          </div>
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        onClick={handleSelect}
        disabled={!selectedArea || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Configurando...
          </>
        ) : (
          'Continuar'
        )}
      </Button>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground mb-3">
          ¿Cuenta equivocada?
        </p>
        <div className="flex justify-center">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </div>
  );
}
