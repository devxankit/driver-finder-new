/**
 * Shapes sent to the apps. Field names follow the mobile app's types
 * (src/store/AppStore.tsx and src/data/catalog.ts) so screens need few changes.
 */
import { publicUrl } from '../middleware/upload.js'

const id = (x) => (x ? String(x._id ?? x) : null)

export function planOut(p) {
  return {
    id: id(p),
    role: p.role,
    name: p.name,
    months: p.months,
    price: p.price,
    note: p.note,
    tag: p.tag,
    benefits: p.benefits ?? [],
  }
}

export function subscriptionOut(s) {
  if (!s) return null
  return {
    id: id(s),
    role: s.role,
    planId: id(s.plan),
    name: s.planName,
    startedAt: new Date(s.startsAt).getTime(),
    expiresAt: new Date(s.expiresAt).getTime(),
    source: s.source,
  }
}

/** The signed-in user's own profile (GET /me). */
export function meOut(user, { subscription = null, docs = [] } = {}) {
  return {
    id: id(user),
    phone: user.phone,
    lang: user.lang,
    role: user.role,
    status: user.status,
    name: user.name,
    city: user.city,
    photo: publicUrl(user.photo),
    profileDone: user.profileDone,
    driver: user.driver ?? null,
    owner: user.owner ? { ...user.owner, name: user.name, city: user.city } : null,
    kyc: {
      status: user.kyc?.status ?? 'none',
      reason: user.kyc?.reason || undefined,
      docs: Object.fromEntries(docs.map((d) => [d.key, d.status !== 'rejected'])),
      rejectedDocs: docs.filter((d) => d.status === 'rejected').map((d) => ({ key: d.key, reason: d.reason })),
    },
    plan: subscriptionOut(subscription),
    registration: { paid: Boolean(user.registration?.paid), paidAt: user.registration?.paidAt ?? null },
    saved: (user.saved ?? []).map(String),
    prefs: user.prefs,
    createdAt: user.createdAt,
  }
}

/** Public owner card (shown on job posts and to connected drivers). */
export function ownerOut(u, { vehicles = 0, phone = false } = {}) {
  if (!u) return null
  return {
    id: id(u),
    name: u.name,
    company: u.owner?.company || u.name,
    type: u.owner?.type ?? 'individual',
    city: u.city,
    photo: publicUrl(u.photo),
    vehicles,
    since: String(new Date(u.createdAt).getFullYear()),
    verified: u.kyc?.status === 'approved',
    phone: phone ? u.phone : null,
  }
}

const payText = (d) => {
  if (!d?.expectedPay) return ''
  return d.payPref === 'trip' ? `${d.expectedPay} /trip` : `${d.expectedPay} /month`
}

/** Driver card for owners. The phone number is only included once connected. */
export function driverOut(u, { phone = false, docs = [], link = null } = {}) {
  const d = u.driver ?? {}
  const has = (k) => docs.some((x) => x.key === k && x.status === 'approved')
  return {
    id: id(u),
    name: u.name,
    photo: publicUrl(u.photo),
    city: u.city,
    age: d.age ?? null,
    experience: d.experience ?? 0,
    licence: d.licence ?? [],
    categories: d.categories ?? [],
    drives: d.about || '',
    payPref: payText(d),
    payType: d.payPref ?? 'monthly',
    work: [d.fullTime === false ? 'Part-time' : 'Full-time', d.payPref === 'trip' ? 'per trip' : d.payPref === 'both' ? 'monthly or per trip' : 'monthly'].join(', '),
    languages: d.languages || '',
    types: d.types ?? [],
    preferredLocations: d.preferredLocations ?? [],
    verified: u.kyc?.status === 'approved',
    phone: phone ? u.phone : null,
    docs: { licence: has('licenceFront'), aadhaar: has('aadhaarFront'), police: has('policeVerification') },
    link,
  }
}

/** Job post. `owner` is a populated User (or null). */
export function jobOut(j, { owner = null, ownerVehicles = 0, application = null, saved = false } = {}) {
  return {
    id: id(j),
    ownerId: id(j.owner),
    owner: owner ? ownerOut(owner, { vehicles: ownerVehicles }) : null,
    category: j.category,
    vehicle: j.vehicle,
    vehicleNo: j.vehicleNo,
    year: j.year,
    title: j.title,
    payType: j.payType,
    pay: j.pay,
    allowance: j.allowance || undefined,
    area: j.area,
    route: j.route,
    duty: j.duty,
    licence: j.licence,
    experience: j.experience,
    stay: j.stay,
    start: j.start,
    idleAllowance: j.idleAllowance?.amount != null ? { amount: j.idleAllowance.amount, afterHours: j.idleAllowance.afterHours ?? 0 } : null,
    mileage: j.mileage ?? null,
    bonus: j.bonus?.amount != null || j.bonus?.details ? { amount: j.bonus?.amount ?? 0, details: j.bonus?.details ?? '' } : null,
    status: j.status,
    applicants: j.applicants ?? 0,
    postedAt: new Date(j.createdAt).getTime(),
    application: application ? { id: id(application), status: application.status, at: new Date(application.updatedAt).getTime() } : null,
    saved,
  }
}

export function vehicleOut(v) {
  return {
    id: id(v),
    category: v.category,
    model: v.model,
    number: v.number,
    year: v.year,
    driver: v.driverName || undefined,
    photo: publicUrl(v.photo),
    status: v.status,
  }
}

export function notificationOut(n) {
  return { id: id(n), title: n.title, text: n.text, data: n.data ?? null, read: n.read, at: new Date(n.createdAt).getTime() }
}
