import React, { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useUser } from '../contexts/UserContext';
import { useToast } from '@/components/ui/use-toast';

interface Notification {
  id: string;
  user_id: string;
  event_id?: string | null;
  type: 'postponed' | 'preponed' | 'cancelled' | 'venue_changed' | 'general';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export function NotificationsBell() {
  const { user } = useUser();
  const token = 'mock-token';
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const resp = await fetch(`/api/notifications?user_id=${encodeURIComponent(user.id)}&only_unread=false&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!resp.ok) throw new Error('Failed to fetch notifications');
      const data = await resp.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }, [user, token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const resp = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!resp.ok) throw new Error('Failed to mark as read');
      setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
      toast({
        title: 'Error',
        description: 'Could not mark notification as read.',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString();
  };

  const typeColor: Record<Notification['type'], string> = {
    postponed: 'text-amber-600',
    preponed: 'text-blue-600',
    cancelled: 'text-red-600',
    venue_changed: 'text-purple-600',
    general: 'text-gray-600',
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative">
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none rounded-full px-1.5 py-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No notifications</div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="cursor-default flex items-start gap-3"
              onSelect={(e) => e.preventDefault()}
            >
              <div className={`mt-1 h-2 w-2 rounded-full ${n.read ? 'bg-gray-300' : 'bg-red-500'}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className={`text-xs ${typeColor[n.type]}`}>
                    {n.type.replace('_', ' ')}
                  </div>
                  <div className="text-[10px] text-gray-400">{formatTime(n.created_at)}</div>
                </div>
                <div className="text-sm font-medium text-gray-900">{n.title}</div>
                <div className="text-sm text-gray-600">{n.message}</div>
                <div className="mt-2 flex gap-2">
                  {!n.read && (
                    <Button size="sm" variant="outline" onClick={() => markAsRead(n.id)}>
                      Mark as read
                    </Button>
                  )}
                  {n.event_id && (
                    <a
                      href={`/events/${n.event_id}`}
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                        setOpen(false);
                      }}
                    >
                      View event
                    </a>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
