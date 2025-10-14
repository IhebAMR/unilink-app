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
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
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
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

UserSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

UserSchema.index({ name: "text", skills: "text", courses: "text" });
UserSchema.index({ "carpool.homeLocation": "2dsphere" });

export default mongoose.models.User || mongoose.model("User", UserSchema);
