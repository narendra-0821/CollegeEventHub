import mongoose, { Schema, Document } from 'mongoose';

export interface IRegistration extends Document {
  user_id: string; // ID from auth system (string)
  event_id: string; // Event Mongo _id as string when DB is used; fallback UUID in mock mode
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Date;
  // Denormalized fields for quick dashboard rendering
  user_name?: string;
  user_email?: string;
  user_college?: string;
  event_title?: string;
  event_location?: string;
  event_start_date?: Date;
  event_end_date?: Date;
  // Optional slot association
  slot_id?: string | null;
}

const RegistrationSchema = new Schema<IRegistration>({
  user_id: { type: String, required: true, index: true },
  event_id: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  timestamp: { type: Date, default: () => new Date(), required: true },
  user_name: { type: String },
  user_email: { type: String },
  user_college: { type: String },
  event_title: { type: String },
  event_location: { type: String },
  event_start_date: { type: Date },
  event_end_date: { type: Date },
  slot_id: { type: String, default: null },
}, {
  timestamps: false
});

RegistrationSchema.index({ user_id: 1, event_id: 1 }, { unique: true });

export default mongoose.models.Registration || mongoose.model<IRegistration>('Registration', RegistrationSchema);