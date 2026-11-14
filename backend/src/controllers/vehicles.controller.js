import { Vehicle } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { assertId } from '../utils/helpers.js'
import { vehicleOut, vehiclePhotos } from '../services/serialize.js'
import { MAX_VEHICLE_PHOTOS, MIN_VEHICLE_PHOTOS, publicUrl, removeStored, storedPath } from '../middleware/upload.js'

const TOO_FEW = `Please upload at least ${MIN_VEHICLE_PHOTOS} vehicle images.`

/** "MH 04-ab 1234" and "MH04AB1234" are the same registration. */
const plate = (n) => String(n ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/** One owner cannot list the same registration number twice. */
async function assertNewNumber(ownerId, number, exceptId = null) {
  const mine = await Vehicle.find({ owner: ownerId, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }, { number: 1 }).lean()
  if (mine.some((v) => plate(v.number) === plate(number))) {
    throw ApiError.conflict('You have already added a vehicle with this number.', 'DUPLICATE_VEHICLE')
  }
}

const mine = async (req) => {
  assertId(req.params.id, 'Vehicle')
  const v = await Vehicle.findOne({ _id: req.params.id, owner: req.user._id })
  if (!v) throw ApiError.notFound('Vehicle not found.')
  return v
}

export async function listVehicles(req, res) {
  const items = await Vehicle.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean()
  res.json({ success: true, vehicles: items.map(vehicleOut) })
}

/**
 * POST /api/vehicles: JSON, or multipart with the images in "files" (the app
 * from 1.3.0 sends at least two). JSON without images stays accepted for older
 * app versions, which upload one photo afterwards.
 */
export async function addVehicle(req, res) {
  const { driver, ...data } = req.body
  const photos = (req.files ?? []).map(storedPath)
  if (req.is('multipart/form-data') && photos.length < MIN_VEHICLE_PHOTOS) {
    throw ApiError.validation(TOO_FEW, { files: TOO_FEW })
  }
  await assertNewNumber(req.user._id, data.number)
  const v = await Vehicle.create({ ...data, driverName: driver ?? '', owner: req.user._id, photos, photo: photos[0] ?? null })
  res.status(201).json({ success: true, vehicle: vehicleOut(v) })
}

/**
 * PUT /api/vehicles/:id/photos (multipart): the full new set of images.
 * "keep" is a JSON list of the current image URLs to keep, in order; "files"
 * are new images added after them. Removed images are deleted from storage.
 */
export async function setVehiclePhotos(req, res) {
  const v = await mine(req)
  let keep
  try {
    keep = JSON.parse(req.body.keep || '[]')
    if (!Array.isArray(keep)) throw new Error()
  } catch {
    throw ApiError.validation('Invalid list of images to keep.', { keep: 'Invalid value.' })
  }
  const current = vehiclePhotos(v)
  const kept = [...new Set(keep.map((u) => current.find((p) => publicUrl(p) === u)).filter(Boolean))]
  const next = [...kept, ...(req.files ?? []).map(storedPath)]
  if (next.length < MIN_VEHICLE_PHOTOS) throw ApiError.validation(TOO_FEW, { files: TOO_FEW })
  if (next.length > MAX_VEHICLE_PHOTOS) throw ApiError.validation(`You can add up to ${MAX_VEHICLE_PHOTOS} vehicle images.`, { files: 'Too many images.' })
  current.filter((p) => !next.includes(p)).forEach(removeStored)
  v.photos = next
  v.photo = next[0]
  await v.save()
  res.json({ success: true, vehicle: vehicleOut(v) })
}

export async function updateVehicle(req, res) {
  const v = await mine(req)
  const { driver, ...data } = req.body
  if (data.number !== undefined && plate(data.number) !== plate(v.number)) await assertNewNumber(req.user._id, data.number, v._id)
  v.set({ ...data, ...(driver !== undefined ? { driverName: driver } : {}) })
  await v.save()
  res.json({ success: true, vehicle: vehicleOut(v) })
}

export async function deleteVehicle(req, res) {
  const v = await mine(req)
  vehiclePhotos(v).forEach(removeStored)
  await v.deleteOne()
  res.json({ success: true })
}

/** POST /api/vehicles/:id/photo (multipart "file"): replaces the cover image (app 1.2.0 and older). */
export async function uploadVehiclePhoto(req, res) {
  const v = await mine(req)
  const rest = vehiclePhotos(v).filter((p) => p !== v.photo)
  removeStored(v.photo)
  v.photo = storedPath(req.file)
  v.photos = [v.photo, ...rest]
  await v.save()
  res.json({ success: true, vehicle: vehicleOut(v) })
}
