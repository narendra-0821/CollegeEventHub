import { v4 as uuidv4 } from 'uuid';

// Mock data for events - simplified to 2 examples
export let mockEvents = [
  {
    id: uuidv4(),
    event_id: 'EVT-001',
    college_id: 'college-1',
    title: 'AI Workshop - Machine Learning',
    description: 'Hands-on workshop covering machine learning fundamentals and practical applications.',
    category: 'workshop',
    location: 'Computer Lab A-101',
    start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // In 2 days
    end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // 2 days + 4 hours
    created_at: new Date('2025-08-25').toISOString(),
    registrations_open: true,
    image_url: 'https://picsum.photos/seed/ai-workshop/640/360',
    total_seats: 800,
  },
  {
    id: uuidv4(),
    event_id: 'EVT-002',
    college_id: 'college-1',
    title: 'Cybersecurity Conference',
    description: 'Annual cybersecurity conference with industry experts and networking opportunities.',
    category: 'conference',
    location: 'Main Auditorium',
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // In 1 week
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(), // 1 week + 6 hours
    created_at: new Date('2025-08-20').toISOString(),
    registrations_open: false,
    image_url: 'https://picsum.photos/seed/cyber-conf/640/360',
    total_seats: 500,
  },
];

// Mock registrations - one registered for open event
export let mockRegistrations = [
  {
    id: '1',
    event_id: mockEvents[0].id, // AI Workshop (open)
    user_id: 'student_1',
    status: 'approved',
    timestamp: new Date().toISOString(),
    user_name: 'student_1',
    user_email: 'student_1@infosys.edu',
    user_college: 'Infosys University',
    event_title: 'AI Workshop - Machine Learning',
    event_location: 'Computer Lab A-101',
    event_start_date: mockEvents[0].start_date,
    event_end_date: mockEvents[0].end_date,
  },
];

// Mock help queries data - for help requests and queries during events
export let mockHelpQueries: Array<{
  id: string;
  event_id: string;
  user_id?: string;
  user_name: string;
  user_email: string;
  query: string;
  timestamp: string;
  is_read: boolean;
}> = [];

// Mock feedbacks data - for after-event feedback with ratings
export let mockFeedbacks: Array<{
  id: string;
  event_id: string;
  user_id?: string;
  user_name: string;
  user_email: string;
  rating?: number;
  feedback: string;
  timestamp: string;
  is_read: boolean;
}> = [];
