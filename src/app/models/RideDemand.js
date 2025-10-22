import mongoose from 'mongoose';
const { Schema } = mongoose;

const GeoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true } // [lng, lat]
}, { _id: false });

const RideDemandSchema = new Schema({
  passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  origin: {
    address: { type: String, required: true },
    location: GeoPointSchema
  },
  destination: {
    address: { type: String, required: true },
    location: GeoPointSchema
  },
  dateTime: { type: Date, required: true },
  seatsNeeded: { type: Number, default: 1 },
  maxPrice: { type: Number, default: 0 },
  notes: { type: String },
  status: { type: String, enum: ['open','matched','cancelled','completed'], default: 'open' },
  offers: [{
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    carpoolRideId: { type: Schema.Types.ObjectId, ref: 'CarpoolRide', required: true },
    message: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    offeredAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

RideDemandSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

RideDemandSchema.index({ dateTime: 1 });
RideDemandSchema.index({ 'origin.location': '2dsphere' });
RideDemandSchema.index({ 'destination.location': '2dsphere' });
RideDemandSchema.index({ passengerId: 1 });
RideDemandSchema.index({ status: 1 });

export default mongoose.models.RideDemand || mongoose.model('RideDemand', RideDemandSchema);
