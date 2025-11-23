import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  event_id: string;
  user_id?: string;
  user_name: string;
  user_email: string;
  rating?: number;
  feedback: string;
  type: 'general' | 'event' | 'technical' | 'suggestion';
  status: 'pending' | 'reviewed' | 'resolved';
  timestamp: Date;
  is_read: boolean;
  admin_response?: string;
  responded_at?: Date;
}

const FeedbackSchema = new Schema<IFeedback>({
  event_id: { type: String, required: true, index: true },
  user_id: { type: String, index: true },
  user_name: { type: String, required: true, trim: true },
  user_email: { type: String, required: true, trim: true, lowercase: true },
  rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String, required: true, trim: true, maxlength: 2000 },
  type: { 
    type: String, 
    enum: ['general', 'event', 'technical', 'suggestion'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  },
  timestamp: { type: Date, default: () => new Date(), required: true },
  is_read: { type: Boolean, default: false },
  admin_response: { type: String, trim: true, maxlength: 1000 },
  responded_at: { type: Date }
}, {
  timestamps: false
});

// Index for efficient queries
FeedbackSchema.index({ event_id: 1, timestamp: -1 });
FeedbackSchema.index({ is_read: 1 });
FeedbackSchema.index({ status: 1 });

export default mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
