import mongoose from 'mongoose';
const { Schema } = mongoose;

const ReactionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true }, // e.g., '🔥', '🍔', '💯'
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const ReplySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  reactions: [ReactionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const EventCommentSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  reactions: [ReactionSchema],
  replies: [ReplySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

EventCommentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes
EventCommentSchema.index({ eventId: 1, createdAt: -1 });
EventCommentSchema.index({ userId: 1 });

const EventComment = mongoose.models.EventComment || mongoose.model('EventComment', EventCommentSchema);
export default EventComment;

