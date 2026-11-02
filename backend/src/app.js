import 'express-async-errors'
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
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
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

app.get('/', (req, res) => res.json({ success: true, name: 'Driver Finder API' }))
app.use('/api/admin', apiLimiter, adminRoutes)
app.use('/api', apiLimiter, appRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
