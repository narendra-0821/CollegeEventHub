import React, { createContext, useContext, useEffect } from 'react';
import { socketService } from '../lib/socket';
import { useNotificationStore } from '../lib/store';
import { useUser } from '../contexts/UserContext';

const NotificationContext = createContext<null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    if (!user) return;

    // Connect to socket
    const socket = socketService.connect(user.id, user.role);

    // Set up event listeners based on user role
    if (user.role === 'college_admin' || user.role === 'super_admin') {
      // Admin notifications
      socketService.onNewRegistration((data) => {
        addNotification({
          type: 'registration',
          message: `New registration for ${data.event_title} by ${data.user_name}`,
          data,
        });
      });

      socketService.onNewFeedback((data) => {
        addNotification({
          type: 'feedback',
          message: `New feedback received for ${data.event_title}`,
          data,
        });
      });
    } else if (user.role === 'student') {
      // Student notifications
      socketService.onRegistrationStatusChange((data) => {
        const statusText = data.status === 'approved' ? 'approved' : 'rejected';
        addNotification({
          type: 'status_change',
          message: `Your registration for ${data.event_title} has been ${statusText}`,
          data,
        });
      });
    }

    // Common notifications for all users
    socketService.onEventUpdate((data) => {
      addNotification({
        type: 'event_update',
        message: `Event "${data.title}" has been updated`,
        data,
      });
    });

    // Live registration count updates
    socketService.onRegistrationCountUpdated(({ event_id, count }) => {
      addNotification({
        type: 'event_update',
        message: `Registrations updated for event ${event_id}: ${count}`,
        data: { event_id, count },
      });
    });

    return () => {
      // Clean up listeners
      socketService.offNewRegistration();
      socketService.offNewFeedback();
      socketService.offRegistrationStatusChange();
      socketService.offEventUpdate();
      socketService.offRegistrationCountUpdated();
      socketService.disconnect();
    };
  }, [user, addNotification]);

  return (
    <NotificationContext.Provider value={null}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  return context;
};
