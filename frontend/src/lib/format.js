export const cn = (...parts) => parts.flat().filter(Boolean).join(' ')

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const rupees = (n) => inr.format(Number(n) || 0)

const num = new Intl.NumberFormat('en-IN')
export const count = (n) => num.format(Number(n) || 0)

/** Compact rupees for chart axes: ₹1.2L, ₹45k. */
export function rupeesShort(n) {
  const v = Number(n) || 0
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1).replace(/\.0$/, '')}L`
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1).replace(/\.0$/, '')}k`
  return `₹${v}`
}

export function date(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function dateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function ago(d) {
  if (!d) return '-'
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return date(d)
}

export const phone = (p) => (p ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : '-')

export const DOC_LABELS = {
  licenceFront: 'Driving licence (front)',
  licenceBack: 'Driving licence (back)',
  aadhaarFront: 'Aadhaar (front)',
  aadhaarBack: 'Aadhaar (back)',
  panCard: 'PAN card',
  policeVerification: 'Police verification',
  badge: 'Transport badge',
  gst: 'GST certificate',
  selfie: 'Selfie',
}

export const CATEGORY_LABELS = { truck: 'Truck', bigtruck: 'Big Truck', tempo: 'Tempo', bus: 'Bus', minibus: 'Mini bus', car: 'Car', suv: 'SUV' }
