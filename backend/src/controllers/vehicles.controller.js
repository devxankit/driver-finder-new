import { Vehicle } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { assertId } from '../utils/helpers.js'
import { vehicleOut } from '../services/serialize.js'
import { removeStored, storedPath } from '../middleware/upload.js'

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

export async function addVehicle(req, res) {
  const { driver, ...data } = req.body
  const v = await Vehicle.create({ ...data, driverName: driver ?? '', owner: req.user._id })
  res.status(201).json({ success: true, vehicle: vehicleOut(v) })
}

export async function updateVehicle(req, res) {
  const v = await mine(req)
  const { driver, ...data } = req.body
  v.set({ ...data, ...(driver !== undefined ? { driverName: driver } : {}) })
  await v.save()
  res.json({ success: true, vehicle: vehicleOut(v) })
}

export async function deleteVehicle(req, res) {
  const v = await mine(req)
  removeStored(v.photo)
  await v.deleteOne()
  res.json({ success: true })
}

/** POST /api/vehicles/:id/photo (multipart "file") */
export async function uploadVehiclePhoto(req, res) {
  const v = await mine(req)
  removeStored(v.photo)
  v.photo = storedPath(req.file)
  await v.save()
  res.json({ success: true, vehicle: vehicleOut(v) })
}
