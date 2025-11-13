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

  // During static builds or CI we may not want to open a network connection to
  // MongoDB (for example if IP allowlist blocks the build agent). Set
  // SKIP_DB_ON_BUILD=true in your environment to skip attempting to connect
  // during build/prerender steps. This will return the mongoose module as a
  // no-op so code that imports it won't fail at module-evaluation time.
  if (process.env.SKIP_DB_ON_BUILD === 'true') {
    // Avoid trying to connect during build; callers should handle lack of
    // a real connection gracefully when this flag is set.
    // eslint-disable-next-line no-console
    console.warn('dbConnect: SKIP_DB_ON_BUILD is set — skipping mongoose.connect()');
    return mongoose;
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