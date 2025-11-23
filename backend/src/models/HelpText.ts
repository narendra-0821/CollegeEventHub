import mongoose, { Schema, Document } from 'mongoose';

export interface IHelpText extends Document {
  event_id: string;
  user_id?: string;
  user_name: string;
  user_email: string;
  query: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'resolved';
  timestamp: Date;
  is_read: boolean;
  admin_response?: string;
  responded_at?: Date;
  helpful_count: number;
  tags?: string[];
}

const HelpTextSchema = new Schema<IHelpText>({
  event_id: { type: String, required: true, index: true },
  user_id: { type: String, index: true },
  user_name: { type: String, required: true, trim: true },
  user_email: { type: String, required: true, trim: true, lowercase: true },
  query: { type: String, required: true, trim: true, maxlength: 2000 },
  category: { 
    type: String, 
    required: true,
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  timestamp: { type: Date, default: () => new Date(), required: true },
  is_read: { type: Boolean, default: false },
  admin_response: { type: String, trim: true, maxlength: 1000 },
  responded_at: { type: Date },
  helpful_count: { type: Number, default: 0, min: 0 },
  tags: [{ type: String, trim: true }]
}, {
  timestamps: false
});

// Indexes for efficient queries
HelpTextSchema.index({ event_id: 1, timestamp: -1 });
HelpTextSchema.index({ is_read: 1 });
HelpTextSchema.index({ status: 1 });
HelpTextSchema.index({ category: 1 });

export default mongoose.models.HelpText || mongoose.model<IHelpText>('HelpText', HelpTextSchema);
