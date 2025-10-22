import mongoose from 'mongoose';
const { Schema } = mongoose;

const RideRequestSchema = new Schema({
  rideId: { type: Schema.Types.ObjectId, ref: 'CarpoolRide', required: true },
  passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  seatsRequested: { type: Number, default: 1 },
  message: { type: String },
  status: { type: String, enum: ['pending','accepted','rejected','cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

RideRequestSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

RideRequestSchema.index({ rideId: 1 });
RideRequestSchema.index({ passengerId: 1 });

export default mongoose.models.RideRequest || mongoose.model('RideRequest', RideRequestSchema);