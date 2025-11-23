import io from 'socket.io-client';

class SocketService {
  private socket: any = null;
  private userId: string | null = null;
  private role: string | null = null;

  connect(userId: string, role: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.userId = userId;
    this.role = role;
    
    this.socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket?.emit('join', { userId, role });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Event listeners for real-time notifications
  onNewRegistration(callback: (data: any) => void) {
    this.socket?.on('new_registration', callback);
  }

  onNewFeedback(callback: (data: any) => void) {
    this.socket?.on('new_feedback', callback);
  }

  onRegistrationCountUpdated(callback: (data: { event_id: string; count: number; total_seats?: number | null }) => void) {
    this.socket?.on('registration_count_updated', callback);
  }

  onRegistrationStatusChange(callback: (data: any) => void) {
    this.socket?.on('registration_status_changed', callback);
  }

  onEventUpdate(callback: (data: any) => void) {
    this.socket?.on('event_updated', callback);
  }

  offRegistrationCountUpdated() {
    this.socket?.off('registration_count_updated');
  }

  // Remove event listeners
  offNewRegistration() {
    this.socket?.off('new_registration');
  }

  offNewFeedback() {
    this.socket?.off('new_feedback');
  }

  offRegistrationStatusChange() {
    this.socket?.off('registration_status_changed');
  }

  offEventUpdate() {
    this.socket?.off('event_updated');
  }
}

export const socketService = new SocketService();
