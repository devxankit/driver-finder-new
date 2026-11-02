import { z } from 'zod'

const str = (max = 200) => z.string().trim().max(max)
const req = (msg, max = 200) => z.string().trim().min(1, msg).max(max)

export const phoneSchema = z.object({ phone: z.string().trim().min(10, 'Enter your 10-digit mobile number.').max(15) })

export const verifySchema = z.object({
  phone: z.string().trim().min(10).max(15),
  code: z.string().trim().regex(/^\d{4,8}$/, 'Enter the OTP you received.'),
  lang: str(5).optional(),
})

export const meSchema = z.object({
  lang: str(5).optional(),
  name: str(80).optional(),
  city: str(80).optional(),
  prefs: z.object({ jobs: z.boolean().optional(), chats: z.boolean().optional(), whatsapp: z.boolean().optional() }).optional(),
})

export const roleSchema = z.object({ role: z.enum(['driver', 'owner']) })

export const driverProfileSchema = z.object({
  name: req('Please enter your name.', 80),
  city: req('Please choose your city.', 80),
  categories: z.array(str(30)).min(1, 'Choose at least one vehicle.').max(20),
  licence: z.array(str(40)).max(10).default([]),
  experience: z.coerce.number().int().min(0).max(60),
  payPref: z.enum(['monthly', 'trip', 'both']),
  expectedPay: str(40).default(''),
  fullTime: z.boolean().default(true),
  age: z.coerce.number().int().min(18).max(80).optional(),
  languages: str(120).optional(),
  about: str(300).optional(),
  types: z.array(str(40)).max(20).default([]),
  preferredLocations: z.array(str(80)).max(15).default([]),
})

export const ownerProfileSchema = z.object({
  name: req('Please enter your name.', 80),
  company: str(120).default(''),
  type: z.enum(['individual', 'fleet']),
  city: req('Please choose your city.', 80),
})

export const vehicleSchema = z.object({
  category: req('Choose a vehicle type.', 30),
  model: req('Enter the model.', 80),
  number: req('Enter the registration number.', 20),
  year: str(4).default(''),
  driver: str(80).optional(),
})

export const jobSchema = z.object({
  vehicleId: str(40).optional(),
  category: req('Choose a vehicle type.', 30),
  vehicle: req('Enter the vehicle.', 80),
  vehicleNo: str(20).default(''),
  year: str(4).default(''),
  title: req('Enter a job title.', 120),
  payType: z.enum(['monthly', 'trip']),
  pay: z.coerce.number().int().min(1, 'Enter the pay.').max(10000000),
  allowance: str(120).default(''),
  area: req('Enter the area or city.', 80),
  route: str(120).default(''),
  duty: str(120).default(''),
  licence: str(60).default(''),
  experience: str(40).default(''),
  stay: str(80).default(''),
  start: str(40).default(''),
  // Truck jobs: idle allowance (bhatta), diesel mileage and bonus.
  idleAllowance: z.object({ amount: z.coerce.number().min(0).max(100000), afterHours: z.coerce.number().min(0).max(720) }).optional(),
  mileage: z.coerce.number().min(0).max(50).optional(),
  bonus: z.object({ amount: z.coerce.number().min(0).max(1000000), details: str(200).default('') }).optional(),
})

export const jobUpdateSchema = jobSchema.partial().extend({ status: z.enum(['active', 'paused', 'closed']).optional() })

export const applicationUpdateSchema = z.object({ status: z.enum(['Shortlisted', 'Connected', 'Not selected']) })

export const hireRequestSchema = z.object({
  driverId: req('Choose a driver.', 40),
  jobId: str(40).optional(),
  message: str(300).optional(),
})

export const answerRequestSchema = z.object({ accept: z.boolean() })

export const messageSchema = z.object({ text: req('Type a message.', 2000) })

export const orderSchema = z.object({ planId: req('Choose a plan.', 40) })

export const citySchema = z.object({ name: z.string().trim().min(2, 'Enter the city name.').max(60).regex(/^[\p{L}\p{M} .'-]+$/u, 'Use letters only.') })

export const feesSchema = z.object({ registration: z.coerce.number().int().min(0).max(10000) })

export const verifyPaymentSchema = z.object({
  orderId: req('Missing order.', 80),
  paymentId: req('Missing payment.', 80),
  signature: req('Missing signature.', 200),
})

export const reportSchema = z.object({
  targetType: z.enum(['user', 'job']),
  targetId: req('Missing target.', 40),
  reason: req('Choose a reason.', 120),
  details: str(1000).optional(),
})

export const enquirySchema = z.object({
  name: req('Please enter your name.', 80),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, 'Enter a valid phone number.'),
  role: str(30).optional(),
  message: str(1000).optional(),
  website: str(200).optional(), // honeypot: real people never fill this
})

/* ------------------------------------------------------------------ Admin */

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
})

export const rejectKycSchema = z.object({
  reason: req('Write the reason the user will see.', 300),
  docs: z.array(str(40)).default([]),
})

export const userStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  reason: str(300).optional(),
})

export const adminJobSchema = z.object({ status: z.enum(['active', 'paused', 'closed', 'hidden']), reason: str(300).optional() })

export const planSchema = z.object({
  role: z.enum(['driver', 'owner']),
  name: req('Enter a plan name.', 60),
  months: z.coerce.number().int().min(1).max(36),
  price: z.coerce.number().int().min(0).max(1000000),
  note: str(120).default(''),
  tag: str(30).default(''),
  benefits: z.array(str(120)).max(12).default([]),
  order: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
})

export const grantSchema = z.object({
  userId: req('Choose a user.', 40),
  planId: str(40).optional(),
  days: z.coerce.number().int().min(1).max(1100),
  note: str(200).optional(),
})

export const categorySchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,30}$/, 'Use 2-30 lowercase letters, digits or dashes.'),
  label: req('Enter a label.', 40),
  labels: z.record(z.string(), str(40)).default({}),
  color: str(20).default('#FEBE02'),
  types: z.array(str(40)).max(30).default([]),
  order: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
})

export const masterSchema = z.object({
  type: z.enum(['city', 'licence']),
  value: req('Enter a value.', 80),
  order: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
})

export const reportUpdateSchema = z.object({ status: z.enum(['open', 'resolved', 'dismissed']), note: str(500).optional() })

export const broadcastSchema = z.object({
  audience: z.enum(['all', 'driver', 'owner']),
  title: req('Enter a title.', 80),
  text: req('Enter the message.', 500),
})

export const cmsSchema = z.object({ value: z.any() })

export const adminUserSchema = z.object({
  name: req('Enter a name.', 80),
  email: z.string().trim().toLowerCase().email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(100).optional(),
  role: z.enum(['super', 'staff']).default('staff'),
  active: z.boolean().default(true),
})

export const passwordSchema = z.object({
  current: z.string().min(1, 'Enter your current password.'),
  next: z.string().min(8, 'Use at least 8 characters.').max(100),
})
