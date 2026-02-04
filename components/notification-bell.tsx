'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { formatRelativeTime } from '@/lib/format-relative-time';
import { markNotificationRead } from '@/app/actions/notifications';
import type { NotificationWithActor } from '@/app/actions/notifications';

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Poll unread count every 30s, pause when tab hidden
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count);
        }
      } catch {
        // silent
      }
    };

    fetchCount();

    let intervalId: ReturnType<typeof setInterval> | null = setInterval(fetchCount, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        fetchCount();
        intervalId = setInterval(fetchCount, 30_000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Fetch full list when popover opens
  const handleOpenChange = useCallback(async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setLoading(true);
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.items);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const handleClickNotification = async (notification: NotificationWithActor) => {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setOpen(false);
    if (notification.taskId) {
      router.push(`/dashboard/kanban?task=${notification.taskId}`);
    }
  };

  const getNotificationText = (n: NotificationWithActor) => {
    const action = n.type === 'assigned' ? 'te asignó' : 'te mencionó en';
    return (
      <>
        <span className="font-medium text-foreground">{n.actorName}</span>{' '}
        {action}: {n.taskTitle ?? 'tarea eliminada'}
      </>
    );
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="w-80 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl z-50"
        >
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <BellOff className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No tienes notificaciones</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickNotification(n)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <img
                    src={n.actorImage || '/placeholder-avatar.png'}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10 mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground leading-snug">
                      {getNotificationText(n)}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
