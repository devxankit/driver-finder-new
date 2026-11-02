/**
 * The smaller collections live here; User and Job have their own files.
 */
import mongoose from 'mongoose'

const { Schema } = mongoose
const ref = (model, extra = {}) => ({ type: Schema.Types.ObjectId, ref: model, ...extra })

/* ----------------------------------------------------------------- Admins */

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    /** super: everything, incl. admin users and plan prices. staff: day-to-day moderation. */
    role: { type: String, enum: ['super', 'staff'], default: 'staff' },
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
)
export const Admin = mongoose.model('Admin', adminSchema)

/* ------------------------------------------------------------------- OTPs */

const otpSchema = new Schema({
  phone: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
})
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export const Otp = mongoose.model('Otp', otpSchema)

/* ---------------------------------------------------------- KYC documents */

const documentSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    key: { type: String, required: true },
    file: { type: String, required: true },
    mime: String,
    status: { type: String, enum: ['uploaded', 'approved', 'rejected'], default: 'uploaded' },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
)
documentSchema.index({ user: 1, key: 1 }, { unique: true })
export const Document = mongoose.model('Document', documentSchema)

/* ---------------------------------------------------------------- Masters */

const categorySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    label: { type: String, required: true, trim: true },
    /** Optional per-language labels, e.g. { hi: 'ट्रक' }. */
    labels: { type: Map, of: String, default: {} },
    image: { type: String, default: null },
    color: { type: String, default: '#FEBE02' },
    types: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)
export const Category = mongoose.model('Category', categorySchema)

/** Simple lists the admin manages: cities and licence types. */
const masterSchema = new Schema(
  {
    type: { type: String, enum: ['city', 'licence'], required: true, index: true },
    value: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    /** Set when a user added it with "Other" in the app. */
    addedBy: ref('User'),
  },
  { timestamps: true }
)
masterSchema.index({ type: 1, value: 1 }, { unique: true })
export const Master = mongoose.model('Master', masterSchema)

/* --------------------------------------------------------------- Vehicles */

const vehicleSchema = new Schema(
  {
    owner: ref('User', { required: true, index: true }),
    category: { type: String, required: true },
    model: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true, uppercase: true },
    year: { type: String, default: '' },
    driverName: { type: String, default: '' },
    photo: { type: String, default: null },
    status: { type: String, enum: ['active', 'hidden'], default: 'active' },
  },
  { timestamps: true }
)
export const Vehicle = mongoose.model('Vehicle', vehicleSchema)

/* ------------------------------------------------- Applications & requests */

export const APPLICATION_STATUSES = ['Applied', 'Shortlisted', 'Connected', 'Not selected']

const applicationSchema = new Schema(
  {
    job: ref('Job', { required: true }),
    driver: ref('User', { required: true, index: true }),
    owner: ref('User', { required: true, index: true }),
    status: { type: String, enum: APPLICATION_STATUSES, default: 'Applied' },
  },
  { timestamps: true }
)
applicationSchema.index({ job: 1, driver: 1 }, { unique: true })
applicationSchema.index({ owner: 1, status: 1 })
export const Application = mongoose.model('Application', applicationSchema)

/** An owner asking a driver to work for them ("hiring request"). */
const hireRequestSchema = new Schema(
  {
    owner: ref('User', { required: true, index: true }),
    driver: ref('User', { required: true, index: true }),
    job: ref('Job'),
    message: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' },
  },
  { timestamps: true }
)
export const HireRequest = mongoose.model('HireRequest', hireRequestSchema)

/** An owner shortlisting a driver from search, before or without a request. */
const shortlistSchema = new Schema(
  {
    owner: ref('User', { required: true }),
    driver: ref('User', { required: true }),
  },
  { timestamps: true }
)
shortlistSchema.index({ owner: 1, driver: 1 }, { unique: true })
export const Shortlist = mongoose.model('Shortlist', shortlistSchema)

/* ------------------------------------------------- Connections & messages */

const connectionSchema = new Schema(
  {
    owner: ref('User', { required: true, index: true }),
    driver: ref('User', { required: true, index: true }),
    job: ref('Job'),
    source: { type: String, enum: ['application', 'request'], required: true },
    status: { type: String, enum: ['active', 'hired', 'closed'], default: 'active' },
    lastMessage: { type: String, default: '' },
    lastMessageAt: Date,
    /** Unread counts per side. */
    unreadOwner: { type: Number, default: 0 },
    unreadDriver: { type: Number, default: 0 },
    /** Read receipts: each side has read every message up to this time. */
    readAtOwner: Date,
    readAtDriver: Date,
  },
  { timestamps: true }
)
connectionSchema.index({ owner: 1, driver: 1 }, { unique: true })
export const Connection = mongoose.model('Connection', connectionSchema)

const messageSchema = new Schema(
  {
    connection: ref('Connection', { required: true, index: true }),
    sender: ref('User', { required: true }),
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
)
messageSchema.index({ connection: 1, createdAt: 1 })
export const Message = mongoose.model('Message', messageSchema)

/* ------------------------------------------------ Plans, subscriptions, pay */

const planSchema = new Schema(
  {
    role: { type: String, enum: ['driver', 'owner'], required: true, index: true },
    name: { type: String, required: true, trim: true },
    months: { type: Number, required: true, min: 1, max: 36 },
    /** Whole rupees. 0 means "price not set yet": the app shows "Price at launch" and blocks checkout. */
    price: { type: Number, default: 0, min: 0 },
    note: { type: String, default: '' },
    tag: { type: String, default: '' },
    benefits: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)
export const Plan = mongoose.model('Plan', planSchema)

const paymentSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    /** plan: a subscription. registration: the one-time sign-up fee. */
    kind: { type: String, enum: ['plan', 'registration'], default: 'plan' },
    plan: ref('Plan'),
    planName: String,
    role: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    orderId: { type: String, index: true },
    paymentId: String,
    receipt: String,
    method: { type: String, enum: ['razorpay', 'admin'], default: 'razorpay' },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
    note: String,
  },
  { timestamps: true }
)
export const Payment = mongoose.model('Payment', paymentSchema)

const subscriptionSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    role: { type: String, enum: ['driver', 'owner'], required: true },
    plan: ref('Plan'),
    planName: String,
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    payment: ref('Payment'),
    source: { type: String, enum: ['razorpay', 'admin'], default: 'razorpay' },
    note: String,
  },
  { timestamps: true }
)
export const Subscription = mongoose.model('Subscription', subscriptionSchema)

/* ----------------------------------------------------------- Notifications */

const notificationSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    title: { type: String, required: true },
    text: { type: String, default: '' },
    type: { type: String, default: 'info' },
    /** Optional deep link for the app, e.g. { screen: 'MyJobs' }. */
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)
notificationSchema.index({ user: 1, createdAt: -1 })
export const Notification = mongoose.model('Notification', notificationSchema)

/** Admin broadcast history (each recipient also gets a Notification). */
const broadcastSchema = new Schema(
  {
    audience: { type: String, enum: ['all', 'driver', 'owner'], required: true },
    title: { type: String, required: true },
    text: { type: String, default: '' },
    sentBy: ref('Admin'),
    recipients: { type: Number, default: 0 },
  },
  { timestamps: true }
)
export const Broadcast = mongoose.model('Broadcast', broadcastSchema)

/* ------------------------------------------------------ Reports & enquiries */

const reportSchema = new Schema(
  {
    reporter: ref('User', { required: true }),
    targetType: { type: String, enum: ['user', 'job'], required: true },
    targetUser: ref('User'),
    targetJob: ref('Job'),
    reason: { type: String, required: true },
    details: { type: String, default: '' },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
    note: { type: String, default: '' },
    resolvedBy: ref('Admin'),
  },
  { timestamps: true }
)
export const Report = mongoose.model('Report', reportSchema)

/** Contact form on the landing page. */
const enquirySchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, default: '' },
    message: { type: String, default: '' },
    status: { type: String, enum: ['new', 'done'], default: 'new' },
  },
  { timestamps: true }
)
export const Enquiry = mongoose.model('Enquiry', enquirySchema)

/* -------------------------------------------------------------------- CMS */

/** key: faq | terms | privacy | refund | support. value shape depends on key. */
const cmsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: '' },
    updatedBy: ref('Admin'),
  },
  { timestamps: true }
)
export const Cms = mongoose.model('Cms', cmsSchema)
