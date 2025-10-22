import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var __mongoose_cache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = global.__mongoose_cache ?? { conn: null, promise: null };

/**
 * Connect to MongoDB. This function reads process.env.MONGODB_URI at runtime,
 * validates it, and then passes a string (not string|undefined) to mongoose.connect,
 * so TypeScript won't complain.
 */
export async function dbConnect(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      // Add any mongoose options you need here
    };

    cached.promise = mongoose.connect(uri, opts).then(() => {
      cached.conn = mongoose;
      return mongoose;
    });
  }

  await cached.promise;
  return cached.conn!;
}

export default mongoose;