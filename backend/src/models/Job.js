import mongoose from 'mongoose'

const { Schema } = mongoose

export const JOB_STATUSES = ['active', 'paused', 'closed', 'hidden']

const jobSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleRef: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    category: { type: String, required: true, index: true },
    vehicle: { type: String, required: true, trim: true },
    vehicleNo: { type: String, default: '', trim: true },
    year: { type: String, default: '' },
    title: { type: String, required: true, trim: true },
    payType: { type: String, enum: ['monthly', 'trip'], required: true },
    pay: { type: Number, required: true, min: 0 },
    allowance: { type: String, default: '' },
    area: { type: String, required: true, trim: true, index: true },
    route: { type: String, default: '' },
    duty: { type: String, default: '' },
    licence: { type: String, default: '' },
    experience: { type: String, default: '' },
    stay: { type: String, default: '' },
    start: { type: String, default: '' },

    /** Truck jobs only: what the driver gets while the truck waits, fuel average expected, and any bonus. */
    idleAllowance: {
      amount: { type: Number, min: 0 },
      afterHours: { type: Number, min: 0 },
    },
    mileage: { type: Number, min: 0 },
    bonus: {
      amount: { type: Number, min: 0 },
      details: { type: String, default: '' },
    },

    /** active: visible. paused/closed: by the owner. hidden: by an admin (moderation). */
    status: { type: String, enum: JOB_STATUSES, default: 'active', index: true },
    hiddenReason: { type: String, default: '' },
    applicants: { type: Number, default: 0 },
    reports: { type: Number, default: 0 },
  },
  { timestamps: true }
)

jobSchema.index({ status: 1, createdAt: -1 })
jobSchema.index({ title: 'text', area: 'text', vehicle: 'text', route: 'text' })

export default mongoose.model('Job', jobSchema)
