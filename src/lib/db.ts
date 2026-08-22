import mongoose from 'mongoose';

// Global cache to reuse the connection across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: Promise<typeof mongoose> | null;
}

let cached = global._mongooseConn ?? null;

export async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI est absent des variables d\'environnement');
  }

  if (cached) return cached;

  cached = mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    dbName: 'binlinpad',
  });

  global._mongooseConn = cached;

  try {
    await cached;
    return cached;
  } catch (err) {
    global._mongooseConn = null;
    cached = null;
    throw err;
  }
}
