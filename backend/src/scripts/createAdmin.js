/**
 * npm run create-admin -- email@example.com "Strong password" "Full name"
 * Creates a super admin, or resets the password of an existing one.
 */
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { Admin } from '../models/index.js'

const [email, password, name = 'Admin'] = process.argv.slice(2)
if (!email || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- email@example.com "password (8+ chars)" "Full name"')
  process.exit(1)
}

await mongoose.connect(env.mongodbUri)
const passwordHash = await bcrypt.hash(password, 12)
const existing = await Admin.findOne({ email: email.toLowerCase() })
if (existing) {
  existing.passwordHash = passwordHash
  existing.active = true
  await existing.save()
  console.log(`Password reset for ${email}`)
} else {
  await Admin.create({ email, name, passwordHash, role: 'super' })
  console.log(`Super admin created: ${email}`)
}
await mongoose.disconnect()
