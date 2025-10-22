import mongoose from 'mongoose';
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['ride_request', 'request_accepted', 'request_rejected', 'ride_offer', 'offer_accepted', 'offer_declined'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedRide: { type: Schema.Types.ObjectId, ref: 'CarpoolRide' },
  relatedRequest: { type: Schema.Types.ObjectId, ref: 'RideRequest' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
