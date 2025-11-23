import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  event_id: string; // human-friendly code
  college_id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  start_date: Date;
  end_date: Date;
  created_at: Date;
  registrations_open: boolean;
  image_url?: string | null;
  total_seats?: number | null;
  // Optional array of slots (admin-defined)
  slots?: { id: string; start: Date; end: Date; seats?: number | null }[];
}

const EventSchema = new Schema<IEvent>({
  event_id: { type: String, required: true, index: true },
  college_id: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500 },
  category: { 
    type: String, 
    required: true, 
    enum: ['sports','hackathon','cultural','workshop','seminar','conference','competition','social']
  },
  location: { type: String, required: true, trim: true, maxlength: 120 },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  created_at: { type: Date, default: () => new Date(), required: true },
  registrations_open: { type: Boolean, default: true },
  image_url: { type: String, default: null },
  total_seats: { type: Number, default: null, min: 1 },
  slots: {
    type: [
      new Schema(
        {
          id: { type: String, required: true },
          start: { type: Date, required: true },
          end: { type: Date, required: true },
          seats: { type: Number, default: null, min: 1 },
        },
        { _id: false }
      ),
    ],
    default: [],
  },
}, {
  timestamps: false
});

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);