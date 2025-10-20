// lib/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/unilink-dev';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = (global as any).__mongoose__;

if (!cached) cached = (global as any).__mongoose__ = { conn: null, promise: null };

export default async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts = {
      // Mongoose options
    } as mongoose.ConnectOptions;
    cached.promise = mongoose.connect(MONGODB_URI, opts).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}