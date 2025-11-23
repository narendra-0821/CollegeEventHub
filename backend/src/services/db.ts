import mongoose from 'mongoose';

let isConnecting = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2 || isConnecting) {
    return;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[DB] MONGODB_URI not set. Backend will use in-memory mock data.');
    return;
  }
  try {
    isConnecting = true;
    await mongoose.connect(uri, {
      // Add options if needed
    });
    console.log('[DB] MongoDB connected');
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err);
  } finally {
    isConnecting = false;
  }
}

export function isDBReady() {
  return mongoose.connection.readyState === 1;
}