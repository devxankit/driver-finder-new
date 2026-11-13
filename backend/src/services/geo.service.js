/**
 * Distances between owners and drivers. The app reports each user's device
 * location (PUT /api/me/location); an owner's per-trip job can also carry a
 * pickup point. Driver locations older than FRESH_MS are treated as unknown
 * so owners never see a distance for a driver who has not opened the app in
 * days.
 */

export const FRESH_MS = 48 * 3600 * 1000

/** Valid { lat, lng } from query strings or bodies, else null. */
export function point(lat, lng) {
  const a = Number(lat)
  const b = Number(lng)
  if (lat === '' || lng === '' || lat == null || lng == null) return null
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) return null
  return { lat: a, lng: b }
}

/** GeoJSON point for MongoDB ([lng, lat] order). */
export const geoJson = (p) => ({ type: 'Point', coordinates: [p.lng, p.lat] })

/** The user's last reported location if it is recent enough, else null. */
export function freshPoint(u, maxAge = FRESH_MS) {
  const c = u?.geo?.coordinates
  if (!c || c.length !== 2 || !u.geoAt) return null
  if (Date.now() - new Date(u.geoAt).getTime() > maxAge) return null
  return { lat: c[1], lng: c[0] }
}

/** Great-circle distance in km, rounded to one decimal. */
export function distanceKm(a, b) {
  if (!a || !b) return null
  const R = 6371
  const rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10
}

/** Mongo filter for drivers whose location is recent. */
export const freshFilter = () => ({ geoAt: { $gte: new Date(Date.now() - FRESH_MS) } })
