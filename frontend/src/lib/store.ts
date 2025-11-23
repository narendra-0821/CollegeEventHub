import { create } from 'zustand';

interface NotificationState {
  notifications: Array<{
    id: string;
    type: 'registration' | 'feedback' | 'status_change' | 'event_update';
    message: string;
    timestamp: string;
    read: boolean;
    data?: any;
  }>;
  unreadCount: number;
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  addNotification: (notification) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
  
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
  
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
  
  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));

interface AppState {
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
  user: { id: string; role: string } | null;
  setUser: (user: { id: string; role: string } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),
  user: null,
  setUser: (user) => set({ user }),
}));
