import 'express-async-errors'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'

import { env, isProduction } from './config/env.js'
import appRoutes from './routes/app.routes.js'
import adminRoutes from './routes/admin.routes.js'
import { webhook } from './controllers/billing.controller.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { uploadRoot } from './middleware/upload.js'
import { ApiError } from './utils/ApiError.js'

const app = express()

app.set('trust proxy', env.trustProxy)
app.disable('x-powered-by')

// Images under /uploads are shown by the admin panel on another origin.
// No CSP header: the website served below loads Google Fonts and Razorpay Checkout.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }))
app.use(
  cors({
    // Browser origins must be listed; the mobile app and server tools send no Origin.
    origin(origin, callback) {
      if (!origin || env.clientUrls.includes(origin)) return callback(null, true)
      callback(new ApiError(403, 'Origin not allowed', { code: 'CORS_REJECTED' }))
    },
  })
)
app.use(compression())

// Razorpay signs the raw body, so the webhook is registered before express.json().
app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '200kb' }), webhook)

app.use(express.json({ limit: '200kb' }))
app.use(express.urlencoded({ extended: true, limit: '200kb' }))
app.use(morgan(isProduction ? 'combined' : 'dev'))

// Public files only. KYC documents live in uploads/private and are streamed by an admin route.
app.use('/uploads', express.static(path.join(uploadRoot, 'public'), { maxAge: '7d', fallthrough: true }))

app.use('/api/admin', apiLimiter, adminRoutes)
app.use('/api', apiLimiter, appRoutes)

// The website (landing page at /, admin panel at /admin) on the same domain.
const webDist = env.webDist ? path.resolve(env.webDist) : ''
if (webDist && fs.existsSync(path.join(webDist, 'index.html'))) {
  // Vite names files in /assets by content hash, so they can be cached for good.
  app.use('/assets', express.static(path.join(webDist, 'assets'), { immutable: true, maxAge: '1y' }))
  app.use(express.static(webDist, { index: false, maxAge: '1h' }))
  // Page routes of the single-page app; /api, /uploads and /assets keep their JSON 404.
  app.get(/^\/(?!api\/|api$|uploads\/|assets\/|socket\.io\/).*/, (req, res) => {
    res.set('Cache-Control', 'no-cache')
    res.sendFile(path.join(webDist, 'index.html'))
  })
} else {
  app.get('/', (req, res) => res.json({ success: true, name: 'Driver Finder API' }))
}

app.use(notFound)
app.use(errorHandler)

export default app
