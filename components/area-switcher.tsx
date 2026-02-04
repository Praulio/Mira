'use client';

import { useTransition } from 'react';
import { Code2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { switchArea } from '@/app/actions/area';
import type { Area } from '@/lib/area-context';
import { cn } from '@/lib/utils';

const areaConfig = {
  desarrollo: {
    label: 'Desarrollo',
    icon: Code2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  agencia: {
    label: 'Agencia',
    icon: Building2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
};

type Props = {
  currentArea: Area;
};

export function AreaSwitcher({ currentArea }: Props) {
  const [isPending, startTransition] = useTransition();
  const otherArea: Area = currentArea === 'desarrollo' ? 'agencia' : 'desarrollo';
  const config = areaConfig[currentArea];
  const Icon = config.icon;

  const handleSwitch = () => {
    startTransition(async () => {
      await switchArea(otherArea);
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSwitch}
      disabled={isPending}
      className={cn(
        'gap-2 transition-all',
        config.bgColor,
        config.borderColor,
        isPending && 'opacity-50'
      )}
    >
      <Icon className={cn('h-4 w-4', config.color)} />
      <span className="font-medium">{config.label}</span>
    </Button>
  );
}
