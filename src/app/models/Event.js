import mongoose from 'mongoose';
const { Schema } = mongoose;

const ResponseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['going', 'not going', 'not interested'], required: true },
  respondedAt: { type: Date, default: Date.now }
}, { _id: false });

const EventSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  dateTime: { type: Date, required: true },
  location: { type: String, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'canceled'], default: 'active' },
  responses: [ResponseSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

EventSchema.index({ dateTime: 1 });

export default mongoose.models.Event || mongoose.model('Event', EventSchema);
