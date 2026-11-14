import os from 'node:os'
import http from 'node:http'
import mongoose from 'mongoose'
import app from './app.js'
import { env, reportConfigWarnings } from './config/env.js'
import { connectDB } from './config/db.js'
import { initRealtime } from './services/realtime.js'

reportConfigWarnings()
await connectDB()

/** LAN addresses, so you know which URL to put in the mobile app while developing. */
const lanIps = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address)

const server = http.createServer(app)
const io = initRealtime(server)

server.listen(env.port, env.host, () => {
  console.log(`Driver Finder API (${env.nodeEnv}) on port ${env.port}`)
  lanIps().forEach((ip) => console.log(`  Phone on same Wi-Fi: http://${ip}:${env.port}/api`))
  console.log(`  OTP: ${env.otp.enabled ? 'SMS India Hub' : 'auto-fill (OTP_ENABLED=false)'}`)
})

/**
 * pm2 restart (deploy.sh) sends SIGINT: stop taking new connections, let
 * requests in flight (uploads, payment checks) finish, then exit. pm2 waits
 * kill_timeout (set to 8 s in deploy.sh) before forcing it.
 */
let closing = false
function shutdown(signal) {
  if (closing) return
  closing = true
  console.log(`${signal}: shutting down`)
  setTimeout(() => process.exit(0), 7000).unref()
  // Apps reconnect by themselves once the new process is up.
  io.disconnectSockets(true)
  server.close(async () => {
    await mongoose.disconnect().catch(() => {})
    process.exit(0)
  })
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err)
  server.close(() => process.exit(1))
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})
