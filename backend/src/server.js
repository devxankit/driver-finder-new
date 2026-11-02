import os from 'node:os'
import http from 'node:http'
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
initRealtime(server)

server.listen(env.port, env.host, () => {
  console.log(`Driver Finder API (${env.nodeEnv}) on port ${env.port}`)
  lanIps().forEach((ip) => console.log(`  Phone on same Wi-Fi: http://${ip}:${env.port}/api`))
  console.log(`  OTP: ${env.otp.enabled ? 'SMS India Hub' : 'auto-fill (OTP_ENABLED=false)'}`)
})

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err)
  server.close(() => process.exit(1))
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})
