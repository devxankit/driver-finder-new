/**
 * Mobile app + public endpoints, mounted at /api.
 */
import { Router } from 'express'
import { validate, validatePatch } from '../middleware/validate.js'
import { protect, requireRole } from '../middleware/auth.js'
import { enquiryLimiter, otpIpLimiter, otpPhoneLimiter, translateLimiter, verifyLimiter } from '../middleware/rateLimiter.js'
import { discardOnError, requireFile, uploadKycDoc as kycUpload, uploadPhoto, uploadVehiclePhoto as vehicleUpload, uploadVehiclePhotos as vehiclePhotosUpload } from '../middleware/upload.js'
import * as s from '../validation/schemas.js'
import * as auth from '../controllers/auth.controller.js'
import * as me from '../controllers/me.controller.js'
import * as jobs from '../controllers/jobs.controller.js'
import * as drivers from '../controllers/drivers.controller.js'
import * as vehicles from '../controllers/vehicles.controller.js'
import * as chat from '../controllers/chat.controller.js'
import * as billing from '../controllers/billing.controller.js'

const r = Router()
const driver = requireRole('driver')
const owner = requireRole('owner')

r.get('/health', (req, res) => res.json({ success: true, time: Date.now() }))

/* Public */
r.get('/meta', me.getMeta)
r.get('/cms/:key', me.getCms)
r.get('/stats', me.publicStats)
r.post('/enquiries', enquiryLimiter, validate(s.enquirySchema), me.createEnquiry)

/* Auth */
r.post('/auth/otp', otpIpLimiter, validate(s.phoneSchema), otpPhoneLimiter, auth.sendOtp)
r.post('/auth/verify', validate(s.verifySchema), verifyLimiter, auth.verify)

/* Everything below needs a signed-in user */
r.use(protect)

r.get('/me', me.getMe)
r.patch('/me', validate(s.meSchema), me.updateMe)
r.delete('/me', me.deleteMe)
r.post('/me/role', validate(s.roleSchema), me.setRole)
r.put('/me/location', validate(s.locationSchema), me.saveLocation)
r.post('/translate', translateLimiter, validate(s.translateSchema), me.translateTexts)
r.put('/me/driver', driver, validate(s.driverProfileSchema), me.saveDriverProfile)
r.put('/me/owner', owner, validate(s.ownerProfileSchema), me.saveOwnerProfile)
r.post('/me/photo', uploadPhoto, requireFile, me.uploadMyPhoto)
r.put('/me/push-token', validate(s.pushTokenSchema), me.savePushToken)
r.delete('/me/push-token', validate(s.pushTokenSchema), me.removePushToken)

r.post('/kyc/docs/:key', kycUpload, requireFile, me.uploadKycDoc)
r.get('/kyc/docs/:key/file', me.myKycDocFile)
r.post('/kyc/submit', me.submitKyc)

r.post('/cities', validate(s.citySchema), me.addCity)
r.get('/notifications', me.listNotifications)
r.post('/notifications/read', me.readNotifications)
r.post('/reports', validate(s.reportSchema), me.createReport)

/* Jobs (order matters: fixed paths before /:id) */
r.get('/jobs', jobs.feed)
r.get('/jobs/saved', driver, jobs.savedJobs)
r.get('/jobs/mine', owner, jobs.myJobs)
r.post('/jobs', owner, validate(s.jobSchema), jobs.createJob)
r.get('/jobs/:id', jobs.detail)
r.patch('/jobs/:id', owner, validatePatch(s.jobUpdateSchema), jobs.updateJob)
r.post('/jobs/:id/save', driver, jobs.toggleSave)
r.post('/jobs/:id/apply', driver, jobs.apply)
r.get('/jobs/:id/applicants', owner, jobs.applicants)

r.get('/applications/mine', driver, jobs.myApplications)
r.patch('/applications/:id', owner, validate(s.applicationUpdateSchema), jobs.updateApplication)

/* Owner: find drivers */
r.get('/drivers', owner, drivers.searchDrivers)
r.get('/drivers/:id', owner, drivers.driverDetail)
r.post('/drivers/:id/shortlist', owner, drivers.toggleShortlist)
r.get('/owner/links', owner, drivers.myLinks)

/* Hiring requests */
r.get('/requests', drivers.listRequests)
r.post('/requests', owner, validate(s.hireRequestSchema), drivers.sendRequest)
r.patch('/requests/:id', driver, validate(s.answerRequestSchema), drivers.answerRequest)

/* Vehicles */
r.get('/vehicles', owner, vehicles.listVehicles)
r.post('/vehicles', owner, discardOnError, vehiclePhotosUpload, validate(s.vehicleSchema), vehicles.addVehicle)
r.patch('/vehicles/:id', owner, validatePatch(s.vehicleSchema.partial()), vehicles.updateVehicle)
r.delete('/vehicles/:id', owner, vehicles.deleteVehicle)
r.post('/vehicles/:id/photo', owner, vehicleUpload, requireFile, vehicles.uploadVehiclePhoto)
r.put('/vehicles/:id/photos', owner, discardOnError, vehiclePhotosUpload, vehicles.setVehiclePhotos)

/* Chat */
r.get('/connections', chat.listConnections)
r.patch('/connections/:id', owner, chat.updateConnection)
r.get('/connections/:id/messages', chat.listMessages)
r.post('/connections/:id/read', chat.readConnection)
r.post('/connections/:id/messages', validate(s.messageSchema), chat.sendMessage)

/* Plans & payments */
r.get('/plans', billing.listPlans)
r.get('/subscription', billing.mySubscription)
r.post('/payments/order', validate(s.orderSchema), billing.createOrder)
r.post('/payments/registration', billing.createRegistrationOrder)
r.post('/payments/verify', validate(s.verifyPaymentSchema), billing.verifyPayment)
r.post('/payments/failed', billing.paymentFailed)

export default r
