import dotenv from 'dotenv'

dotenv.config()

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

/** First non-empty of several variable names (two spellings of the same setting). */
const pick = (...names) => names.map((n) => process.env[n]).find((v) => v !== undefined && v !== '') ?? ''

const toList = (value, fallback = []) =>
  value
    ? String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : fallback

/**
 * Centralised access to process.env. Add new variables here (with a sane
 * default where it makes sense) instead of reading process.env elsewhere.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),
  /** 0.0.0.0 so phones on the same Wi-Fi can reach this PC during development. */
  host: process.env.HOST || '0.0.0.0',

  /** Allowed browser origins (admin panel, landing page). The mobile app sends no Origin. */
  clientUrls: toList(process.env.CLIENT_URL, ['http://localhost:5173']),

  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/driver_finder',

  jwtSecret: process.env.JWT_SECRET || 'dev_only_change_me_driver_finder',
  /** App users stay signed in for a long time; drivers should not have to log in again. */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '90d',
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '12h',

  trustProxy: toInt(process.env.TRUST_PROXY, 0),

  /**
   * The built website (landing page + admin panel, frontend/dist). When set,
   * this server also serves it, so one domain carries the site, /api,
   * /uploads and /socket.io (the VPS). Empty: API only.
   */
  webDist: process.env.WEB_DIST || '',

  otp: {
    /**
     * true: a real SMS is sent through SMS India Hub.
     * false: no SMS; the code is returned in the response so the app fills it
     * in by itself (development and demos).
     */
    enabled: toBool(process.env.OTP_ENABLED, false),
    length: 6,
    ttlMinutes: toInt(process.env.OTP_TTL_MINUTES, 5),
    maxAttempts: 5,
    resendSeconds: toInt(process.env.OTP_RESEND_SECONDS, 30),
    /** Numbers that always accept TEST_OTP_CODE (internal QA); no SMS is sent to them. */
    testNumbers: [...toList(process.env.TEST_PHONE_NUMBERS), process.env.REVIEW_DRIVER_PHONE, process.env.REVIEW_OWNER_PHONE].filter(Boolean),
    testCode: process.env.TEST_OTP_CODE || '',
  },

  /**
   * SMS India Hub. Each setting also accepts the SMS_INDIA_HUB_* spelling
   * (SMS_INDIA_HUB_API_KEY, _SENDER_ID, _ENTITY_ID, _TEMPLATE_ID, _MESSAGE).
   * Changing the account only needs .env + a restart, never a new APK.
   */
  smsIndiaHub: {
    url: pick('SMSINDIAHUB_URL', 'SMS_INDIA_HUB_URL') || 'https://cloud.smsindiahub.in/api/mt/SendSMS',
    apiKey: pick('SMSINDIAHUB_API_KEY', 'SMS_INDIA_HUB_API_KEY'),
    user: pick('SMSINDIAHUB_USER', 'SMS_INDIA_HUB_USER'),
    password: pick('SMSINDIAHUB_PASSWORD', 'SMS_INDIA_HUB_PASSWORD'),
    senderId: pick('SMSINDIAHUB_SENDER_ID', 'SMS_INDIA_HUB_SENDER_ID'),
    gwid: pick('SMSINDIAHUB_GWID', 'SMS_INDIA_HUB_GWID') || '2',
    templateId: pick('SMSINDIAHUB_TEMPLATE_ID', 'SMS_INDIA_HUB_TEMPLATE_ID'),
    /** DLT principal entity id (PE ID). */
    peId: pick('SMSINDIAHUB_PE_ID', 'SMS_INDIA_HUB_ENTITY_ID', 'SMS_INDIA_HUB_PE_ID'),
    /** Must match the DLT-approved template word for word. {otp} is replaced with the code. */
    message:
      pick('SMSINDIAHUB_MESSAGE', 'SMS_INDIA_HUB_MESSAGE') ||
      'Your Driver Finder login OTP is {otp}. It is valid for 5 minutes. Do not share it with anyone.',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    currency: 'INR',
  },

  /** Phone push notifications (FCM). Path to the Firebase service-account JSON; empty = push off. */
  /**
   * Google Play review accounts. They sign in with TEST_OTP_CODE (no SMS) and
   * are put back into a ready state (profile, KYC approved, registration and a
   * plan) on every sign-in, so reviewers can always test, even after deleting
   * the account. See services/review.service.js.
   */
  review: {
    driverPhone: process.env.REVIEW_DRIVER_PHONE || '',
    ownerPhone: process.env.REVIEW_OWNER_PHONE || '',
  },

  firebase: {
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
  },

  upload: {
    root: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeBytes: toInt(process.env.MAX_UPLOAD_BYTES, 8 * 1024 * 1024),
    imageMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    docMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },

  seedAdmin: {
    name: process.env.ADMIN_NAME || 'Super Admin',
    email: process.env.ADMIN_EMAIL || 'admin@driverfinder.in',
    password: process.env.ADMIN_PASSWORD || '',
  },
}

export const isProduction = env.nodeEnv === 'production'

export const isRazorpayConfigured = Boolean(env.razorpay.keyId && env.razorpay.keySecret)

export const isSmsConfigured = Boolean(
  env.smsIndiaHub.senderId && (env.smsIndiaHub.apiKey || (env.smsIndiaHub.user && env.smsIndiaHub.password))
)

/** Warns about configuration that is fine locally but wrong in production. */
export function reportConfigWarnings() {
  const warnings = []

  if (!env.otp.enabled) {
    warnings.push('OTP_ENABLED is off: no SMS is sent and the app fills in the code itself. Turn it on before launch.')
  } else if (!isSmsConfigured) {
    warnings.push('OTP_ENABLED is on but SMS India Hub is not configured (SMSINDIAHUB_API_KEY / SENDER_ID). Logins will fail.')
  }
  if (env.otp.enabled && isSmsConfigured && !env.smsIndiaHub.templateId) {
    warnings.push('SMS is on without SMSINDIAHUB_TEMPLATE_ID: Indian operators drop SMS that are not sent with a DLT template id.')
  }
  if ((env.review.driverPhone || env.review.ownerPhone) && !env.otp.testCode) {
    warnings.push('REVIEW_DRIVER_PHONE / REVIEW_OWNER_PHONE are set but TEST_OTP_CODE is empty: the Play review login cannot work.')
  }
  if (!isRazorpayConfigured) {
    warnings.push('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set: plan purchases will fail.')
  }
  if (env.jwtSecret.startsWith('dev_only')) {
    warnings.push('JWT_SECRET is the development default. Set a long random value in production.')
  }

  const log = isProduction ? console.warn : console.log
  warnings.forEach((w) => log(`[config] ${w}`))
}
