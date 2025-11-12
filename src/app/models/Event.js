import mongoose from 'mongoose';
const { Schema } = mongoose;

const EventSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // Store as string like "14:00"
  duration: { type: String, required: true }, // e.g., "2 hours", "3.5 hours"
  location: { type: String, required: true },
  image: { type: String }, // URL to event image
  attending: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Users who marked as going
  notGoing: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Users who marked as not going
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  cancellationReason: { 
    type: String, 
    trim: true,
    // Validation: required when status is 'cancelled'
    validate: {
      validator: function(value) {
        // If status is cancelled, cancellationReason must be provided
        if (this.status === 'cancelled') {
          return value && value.trim().length > 0;
        }
        return true; // Not required for other statuses
      },
      message: 'Cancellation reason is required when event is cancelled'
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

EventSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes
EventSchema.index({ date: 1 });
EventSchema.index({ ownerId: 1 });
EventSchema.index({ status: 1 });

const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
export default Event;

