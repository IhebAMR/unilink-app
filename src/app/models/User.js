import mongoose from "mongoose";
const { Schema } = mongoose;

const CarpoolPrefsSchema = new Schema({
  hasCar: { type: Boolean, default: false },
  seats: { type: Number, default: 0 },
  homeLocation: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: undefined },
  },
  preferredRoutes: [{ type: String }],
}, { _id: false });

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    lowercase: true, 
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} n'est pas une adresse email valide!`
    }
  },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  avatarUrl: { type: String },
  bio: { type: String },
  classSection: { type: String },       // Example: "3A", "2B"
  courses: [{ type: String }],
  skills: [{ type: String }],
  points: { type: Number, default: 0 },
  notificationTokens: [{ type: String }],
  carpool: CarpoolPrefsSchema,
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  lastLogin: { type: Date },
  loginHistory: [{
    timestamp: { type: Date },
    ip: { type: String },
    userAgent: { type: String }
  }],
  // Face recognition data
  faceDescriptors: [{ type: [Number] }], // Array of face descriptor arrays (128 dimensions each)
  hasFaceRecognition: { type: Boolean, default: false },
  // Reviews left by other users about this user (as a rider/driver)
  reviews: [{
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    relatedRide: { type: Schema.Types.ObjectId, ref: 'CarpoolRide' },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

UserSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

// Remove all indexes at startup
UserSchema.pre('save', async function(next) {
  try {
    await mongoose.connection.collections.users?.dropIndexes();
  } catch (err) {
    console.log('No indexes to drop');
  }
  next();
});

// Define required indexes after ensuring old ones are dropped
UserSchema.on('index', function(err) {
  if (err) {
    console.error('User Schema Index Error:', err);
  }
});

// Text search indexes
UserSchema.index({ name: "text", skills: "text", courses: "text" });

// Geospatial index
UserSchema.index({ "carpool.homeLocation": "2dsphere" });

// Unique email index (created separately to handle errors)
UserSchema.index({ email: 1 }, { 
  unique: true,
  background: true,
  sparse: true
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
