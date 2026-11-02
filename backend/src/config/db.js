import mongoose from 'mongoose'
import { env, isProduction } from './env.js'

export async function connectDB() {
  try {
    const conn = await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 8000 })
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`)
    console.error(
      '\nTroubleshooting:\n' +
        "  1. Atlas: Network Access -> add this machine's IP (or 0.0.0.0/0 while developing).\n" +
        '  2. Check the user name, password and database name in MONGODB_URI (backend/.env).\n' +
        '  3. Some networks block outgoing port 27017; try another network.\n'
    )
    if (isProduction) process.exit(1)
  }
}
