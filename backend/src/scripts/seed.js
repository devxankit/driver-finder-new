/**
 * npm run seed            -> admin, categories, cities, licence types, plans, CMS (safe to re-run)
 * npm run seed -- --demo  -> also a demo marketplace: 12 owners, ~40 jobs, 25 drivers (all isDemo: true)
 * npm run seed -- --remove-demo -> deletes every demo account and everything linked to it
 *
 * Existing records are left alone (matched by key / phone), so this never
 * overwrites what the admin has edited.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import User from '../models/User.js'
import Job from '../models/Job.js'
import { Admin, Application, Category, Cms, Connection, Document, HireRequest, Master, Message, Notification, Payment, Plan, Shortlist, Subscription, Vehicle } from '../models/index.js'
import { DEMO_OWNERS, demoDrivers, demoJobs, truckExtras } from './demoData.js'
import { ALL_CITIES } from './cities.js'
import { uploadRoot } from '../middleware/upload.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const appImages = path.resolve(here, '../../../mobile-app/src/assets/images')
const demo = process.argv.includes('--demo')
const removeDemoFlag = process.argv.includes('--remove-demo')

/** Copies an image from the mobile app into uploads/public/<folder>; returns the stored path. */
function copyImage(file, folder) {
  const src = path.join(appImages, file)
  if (!fs.existsSync(src)) return null
  const dir = path.join(uploadRoot, 'public', folder)
  fs.mkdirSync(dir, { recursive: true })
  fs.copyFileSync(src, path.join(dir, file))
  return `public/${folder}/${file}`
}

const CATEGORIES = [
  { key: 'truck', label: 'Truck', labels: { hi: 'ट्रक' }, color: '#C2410C', types: ['Open body', 'Container', 'Trailer', 'Tipper', 'Tanker'], img: 't-truck.jpg' },
  { key: 'bigtruck', label: 'Big Truck', labels: { hi: 'बड़ा ट्रक' }, color: '#B45309', types: ['Bag truck', 'Bulker truck', 'Container truck'], img: 't-bigtruck.jpg' },
  { key: 'tempo', label: 'Tempo', labels: { hi: 'टेम्पो' }, color: '#0A7DB8', types: ['Mini truck', 'Pickup', 'Tata Ace', 'Bolero pickup'], img: 't-tempo.jpg' },
  { key: 'bus', label: 'Bus', labels: { hi: 'बस' }, color: '#0E8A7C', types: ['School bus', 'Staff bus', 'Tourist bus', 'Sleeper'], img: 't-bus.jpg' },
  { key: 'minibus', label: 'Mini bus', labels: { hi: 'मिनी बस' }, color: '#0E8A7C', types: ['Tempo traveller', 'Staff van', 'School van'], img: 't-minibus.jpg' },
  { key: 'car', label: 'Car', labels: { hi: 'कार' }, color: '#6A4FD6', types: ['Hatchback', 'Sedan', 'Luxury'], img: 't-car.jpg' },
  { key: 'suv', label: 'SUV', labels: { hi: 'एसयूवी' }, color: '#6A4FD6', types: ['SUV 5 seat', 'SUV 7 seat', 'MUV'], img: 't-suv.jpg' },
]

const CITIES = ALL_CITIES

const LICENCES = ['LMV', 'HMV', 'Transport badge', 'Hazardous goods']

/** Placeholder prices (whole rupees) until the client confirms them; editable in the admin panel. */
const PLANS = [
  { role: 'driver', name: '1 month', months: 1, price: 99, note: 'Try it out', order: 1 },
  { role: 'driver', name: '3 months', months: 3, price: 249, note: 'Most people pick this', tag: 'Popular', order: 2 },
  { role: 'driver', name: '12 months', months: 12, price: 799, note: 'Lowest monthly cost', tag: 'Best value', order: 3 },
  { role: 'owner', name: '1 month', months: 1, price: 499, note: 'Try it out', order: 1 },
  { role: 'owner', name: '3 months', months: 3, price: 1299, note: 'Most people pick this', tag: 'Popular', order: 2 },
  { role: 'owner', name: '12 months', months: 12, price: 3999, note: 'Lowest monthly cost', tag: 'Best value', order: 3 },
].map((p) => ({
  ...p,
  benefits:
    p.role === 'driver'
      ? ['Apply to unlimited jobs', 'Accept hiring requests', 'Call, WhatsApp and chat with owners', 'Verified badge on your profile']
      : ['Connect with verified drivers', 'Send hiring requests', 'Call, WhatsApp and chat with drivers', 'Post unlimited jobs'],
}))

const CMS = {
  fees: { registration: 1 },
  support: { phone: '', whatsapp: '', email: 'support@driverfinder.in', hours: '9 AM - 7 PM, Mon-Sat' },
  faq: [
    { q: 'Is Driver Finder free?', a: 'Browsing jobs and drivers is free. To apply, connect, chat or see phone numbers you need an active plan.' },
    { q: 'Why do I need KYC?', a: 'Every driver and owner is verified by our team so that both sides can trust each other.' },
    { q: 'How long does verification take?', a: 'Usually within 24 hours on working days.' },
    { q: 'Do you take a commission?', a: 'No. Salary or trip pay is agreed directly between the owner and the driver.' },
  ],
  terms: 'Terms of use will be published here. (Placeholder: the client will supply the final text.)',
  privacy: 'Privacy policy will be published here. (Placeholder: the client will supply the final text.)',
  refund: 'Refund policy will be published here. (Placeholder: the client will supply the final text.)',
}

/* ------------------------------------------------------------------ Demo */

const DAY = 86400000
const peopleDir = path.resolve(here, '../../seed-assets/people')

/** "app:file.jpg" comes from the mobile app's images, "file.jpg" from seed-assets/people. */
function demoPhoto(ref) {
  if (!ref) return null
  if (ref.startsWith('app:')) return copyImage(ref.slice(4), 'photos')
  const src = path.join(peopleDir, ref)
  if (!fs.existsSync(src)) return null
  const dir = path.join(uploadRoot, 'public', 'photos')
  fs.mkdirSync(dir, { recursive: true })
  fs.copyFileSync(src, path.join(dir, `demo-${ref}`))
  return `public/photos/demo-${ref}`
}

const approved = (daysAgo = 30) => ({ status: 'approved', submittedAt: new Date(Date.now() - daysAgo * DAY), reviewedAt: new Date(Date.now() - (daysAgo - 1) * DAY) })

async function upsertDemoUser(phone, data, docKeys) {
  data = { ...data, registration: { paid: true, paidAt: data.createdAt } }
  let u = await User.findOne({ phone })
  if (!u) {
    u = await User.create({ phone, ...data })
    await Document.insertMany(docKeys.map((key) => ({ user: u._id, key, file: 'private/demo-sample.txt', status: 'approved' })))
  } else if (u.isDemo || /^9000/.test(phone)) {
    // Earlier demo runs: refresh the profile but keep the account (and its chats).
    u.set({ ...data, kyc: u.kyc?.status === 'approved' ? u.kyc : data.kyc, createdAt: u.createdAt })
    await u.save()
    const have = await Document.find({ user: u._id }).distinct('key')
    const missing = docKeys.filter((k) => !have.includes(k))
    if (missing.length) await Document.insertMany(missing.map((key) => ({ user: u._id, key, file: 'private/demo-sample.txt', status: 'approved' })))
  }
  return u
}

async function seedDemo() {
  fs.mkdirSync(path.join(uploadRoot, 'private'), { recursive: true })
  fs.writeFileSync(path.join(uploadRoot, 'private', 'demo-sample.txt'), 'Demo account: no real document.')

  const owners = []
  for (const [i, o] of DEMO_OWNERS.entries()) {
    const u = await upsertDemoUser(
      o.phone,
      {
        role: 'owner',
        name: o.name,
        city: o.city,
        photo: demoPhoto(o.photo),
        owner: { company: o.company, type: o.type },
        profileDone: true,
        kyc: approved(60 - i * 3),
        lang: 'hi',
        isDemo: true,
        createdAt: new Date(Date.now() - (60 - i * 3) * DAY),
      },
      ['aadhaarFront', 'aadhaarBack', 'panCard']
    )
    owners.push(u)
  }

  let created = 0
  for (const j of demoJobs()) {
    const { o, h, ...data } = j
    const owner = owners[o]
    let v = await Vehicle.findOne({ owner: owner._id, number: data.vehicleNo })
    if (!v) v = await Vehicle.create({ owner: owner._id, category: data.category, model: data.vehicle, number: data.vehicleNo, year: data.year })
    if (await Job.exists({ owner: owner._id, title: data.title })) continue
    const at = new Date(Date.now() - h * 3600000)
    await Job.create({ ...data, vehicleRef: v._id, owner: owner._id, createdAt: at, updatedAt: at })
    created += 1
  }
  // Truck jobs from earlier demo runs get idle allowance, mileage and bonus too.
  const demoOwnerIds = owners.map((o) => o._id)
  let n = 0
  for (const j of await Job.find({ owner: { $in: demoOwnerIds }, category: { $in: ['truck', 'bigtruck'] }, 'idleAllowance.amount': { $exists: false } })) {
    await Job.updateOne({ _id: j._id }, truckExtras(j.category, n++))
  }
  // A few vehicles that already have a driver (fleet owners rarely have every vehicle vacant).
  for (const [o, model, category, driverName] of [
    [0, 'Container 32 ft', 'truck', 'Salim Khan'],
    [3, 'Tata Ace', 'tempo', 'Deepak Verma'],
    [4, 'Open body 19 ft', 'truck', 'Naveen Raju'],
  ]) {
    const number = plateFor(owners[o].city, 900 + o)
    if (!(await Vehicle.exists({ owner: owners[o]._id, number }))) await Vehicle.create({ owner: owners[o]._id, category, model, number, year: '2022', driverName })
  }

  const drivers = demoDrivers()
  for (const d of drivers) {
    const { police, joinedDaysAgo, photo, ...data } = d
    const keys = ['licenceFront', 'licenceBack', 'aadhaarFront', 'aadhaarBack', ...(police ? ['policeVerification'] : [])]
    await upsertDemoUser(
      d.phone,
      {
        ...data,
        role: 'driver',
        photo: demoPhoto(photo),
        profileDone: true,
        kyc: approved(joinedDaysAgo),
        lang: 'hi',
        isDemo: true,
        createdAt: new Date(Date.now() - joinedDaysAgo * DAY),
      },
      keys
    )
  }
  console.log(`Demo data: ${owners.length} owners, ${created} new jobs (${demoJobs().length} total), ${drivers.length} drivers`)
}

const plateFor = (city, i) => `${{ Bhiwandi: 'MH 04', Ahmedabad: 'GJ 01', Bengaluru: 'KA 01' }[city] ?? 'MH 01'} ZX ${String(1000 + i).slice(-4)}`

/** Deletes every demo account and everything linked to it. Real users are never touched. */
async function removeDemo() {
  const ids = await User.find({ isDemo: true }).distinct('_id')
  if (!ids.length) return console.log('No demo accounts found.')
  const jobs = await Job.find({ owner: { $in: ids } }).distinct('_id')
  const conns = await Connection.find({ $or: [{ owner: { $in: ids } }, { driver: { $in: ids } }] }).distinct('_id')
  const docs = await Document.find({ user: { $in: ids } }).lean()
  const result = {
    messages: (await Message.deleteMany({ connection: { $in: conns } })).deletedCount,
    connections: (await Connection.deleteMany({ _id: { $in: conns } })).deletedCount,
    applications: (await Application.deleteMany({ $or: [{ job: { $in: jobs } }, { driver: { $in: ids } }] })).deletedCount,
    requests: (await HireRequest.deleteMany({ $or: [{ owner: { $in: ids } }, { driver: { $in: ids } }] })).deletedCount,
    shortlists: (await Shortlist.deleteMany({ $or: [{ owner: { $in: ids } }, { driver: { $in: ids } }] })).deletedCount,
    jobs: (await Job.deleteMany({ _id: { $in: jobs } })).deletedCount,
    vehicles: (await Vehicle.deleteMany({ owner: { $in: ids } })).deletedCount,
    subscriptions: (await Subscription.deleteMany({ user: { $in: ids } })).deletedCount,
    payments: (await Payment.deleteMany({ user: { $in: ids } })).deletedCount,
    notifications: (await Notification.deleteMany({ user: { $in: ids } })).deletedCount,
    documents: (await Document.deleteMany({ user: { $in: ids } })).deletedCount,
    users: (await User.deleteMany({ _id: { $in: ids } })).deletedCount,
  }
  for (const d of docs) if (d.file !== 'private/demo-sample.txt') fs.promises.unlink(path.join(uploadRoot, d.file)).catch(() => {})
  await User.updateMany({}, { $pull: { saved: { $in: jobs } } })
  console.log('Removed demo data:', result)
}

/* ------------------------------------------------------------------- Run */

await mongoose.connect(env.mongodbUri)

if (env.seedAdmin.password) {
  if (!(await Admin.exists({ email: env.seedAdmin.email }))) {
    await Admin.create({ name: env.seedAdmin.name, email: env.seedAdmin.email, role: 'super', passwordHash: await bcrypt.hash(env.seedAdmin.password, 12) })
    console.log(`Admin created: ${env.seedAdmin.email}`)
  }
} else {
  console.log('ADMIN_PASSWORD not set: skipped creating the admin.')
}

let addedCategory = false
for (const [i, c] of CATEGORIES.entries()) {
  const { img, ...data } = c
  const image = copyImage(img, 'categories') // refreshes the file, e.g. a replaced mini-bus image
  if (!(await Category.exists({ key: c.key }))) {
    await Category.create({ ...data, order: i + 1, image })
    addedCategory = true
  } else await Category.updateOne({ key: c.key, image: null }, { image })
}
// A newly added category (e.g. Big Truck) slots into the built-in order; after that the admin's order is kept.
if (addedCategory) for (const [i, c] of CATEGORIES.entries()) await Category.updateOne({ key: c.key }, { order: i + 1 })
for (const [i, value] of CITIES.entries()) await Master.updateOne({ type: 'city', value }, { $setOnInsert: { order: i } }, { upsert: true })
for (const [i, value] of LICENCES.entries()) await Master.updateOne({ type: 'licence', value }, { $setOnInsert: { order: i } }, { upsert: true })
if (!(await Plan.exists({}))) await Plan.insertMany(PLANS)
for (const [key, value] of Object.entries(CMS)) await Cms.updateOne({ key }, { $setOnInsert: { value } }, { upsert: true })
console.log('Masters, plans and CMS ready.')

if (removeDemoFlag) await removeDemo()
else if (demo) await seedDemo()

await mongoose.disconnect()
