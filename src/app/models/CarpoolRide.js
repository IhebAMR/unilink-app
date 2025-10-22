import mongoose from 'mongoose';
const { Schema } = mongoose;

const GeoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true } // [lng, lat]
}, { _id: false });

const LineStringSchema = new Schema({
  type: { type: String, enum: ['LineString'], default: 'LineString' },
  coordinates: { type: [[Number]], required: true } // array of [lng, lat]
}, { _id: false });

const CarpoolRideSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String }, // optional short title
  origin: {
    address: { type: String },
    location: GeoPointSchema
  },
  destination: {
    address: { type: String },
    location: GeoPointSchema
  },
  route: LineStringSchema, // optional GeoJSON LineString with route coordinates
  stops: [{
    address: String,
    location: GeoPointSchema,
    order: Number
  }],
  dateTime: { type: Date, required: true },
  seatsTotal: { type: Number, required: true },
  seatsAvailable: { type: Number, required: true },
  price: { type: Number, default: 0 },
  notes: { type: String },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }], // confirmed users
  status: { type: String, enum: ['open','full','cancelled','completed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

CarpoolRideSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// useful indexes
CarpoolRideSchema.index({ dateTime: 1 });
CarpoolRideSchema.index({ 'origin.location': '2dsphere' });
CarpoolRideSchema.index({ 'destination.location': '2dsphere' });
CarpoolRideSchema.index({ 'route': '2dsphere' });

export default mongoose.models.CarpoolRide || mongoose.model('CarpoolRide', CarpoolRideSchema);