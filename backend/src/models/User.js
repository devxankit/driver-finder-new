import mongoose from 'mongoose'

const { Schema } = mongoose

export const ROLES = ['driver', 'owner']
export const KYC_STATUSES = ['none', 'pending', 'approved', 'rejected']

/** Document keys each role must upload before KYC can be submitted. */
export const REQUIRED_DOCS = {
  driver: ['licenceFront', 'licenceBack', 'aadhaarFront', 'aadhaarBack'],
  owner: ['aadhaarFront', 'aadhaarBack', 'panCard'],
}

const driverSchema = new Schema(
  {
    categories: [{ type: String }],
    licence: [{ type: String }],
    experience: { type: Number, min: 0, max: 60, default: 0 },
    payPref: { type: String, enum: ['monthly', 'trip', 'both'], default: 'monthly' },
    expectedPay: { type: String, default: '' },
    fullTime: { type: Boolean, default: true },
    age: { type: Number, min: 18, max: 80 },
    languages: { type: String, default: '' },
    about: { type: String, default: '' },
    /** Sub-types inside a category, e.g. Big Truck -> Bulker truck, Container truck. */
    types: [{ type: String }],
    /** Where the driver wants to work: cities, or 'Anywhere in India'. */
    preferredLocations: [{ type: String }],
  },
  { _id: false }
)

const ownerSchema = new Schema(
  {
    company: { type: String, default: '' },
    type: { type: String, enum: ['individual', 'fleet'], default: 'individual' },
  },
  { _id: false }
)

const userSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    lang: { type: String, default: 'hi' },
    role: { type: String, enum: [...ROLES, null], default: null },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    suspendReason: { type: String, default: '' },

    name: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    photo: { type: String, default: null },
    profileDone: { type: Boolean, default: false },

    driver: { type: driverSchema, default: undefined },
    owner: { type: ownerSchema, default: undefined },

    /** One-time registration fee (₹1 by default, set by the admin under fees). */
    registration: {
      paid: { type: Boolean, default: false },
      paidAt: Date,
      payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    },

    kyc: {
      status: { type: String, enum: KYC_STATUSES, default: 'none', index: true },
      reason: { type: String, default: '' },
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    },

    saved: [{ type: Schema.Types.ObjectId, ref: 'Job' }],
    prefs: {
      jobs: { type: Boolean, default: true },
      chats: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
    },

    lastSeenAt: Date,
    deletedAt: Date,
    /** Sample accounts from `npm run seed -- --demo`; `npm run seed -- --remove-demo` deletes them. */
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

userSchema.index({ role: 1, 'kyc.status': 1, status: 1 })
userSchema.index({ name: 'text', city: 'text', 'owner.company': 'text' })

export default mongoose.model('User', userSchema)
