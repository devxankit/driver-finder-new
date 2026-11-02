/**
 * Admin panel endpoints, mounted at /api/admin.
 */
import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { protectAdmin, requireSuper } from '../middleware/auth.js'
import { loginLimiter } from '../middleware/rateLimiter.js'
import { requireFile, uploadCategoryImage } from '../middleware/upload.js'
import * as s from '../validation/schemas.js'
import * as u from '../controllers/admin/users.controller.js'
import * as c from '../controllers/admin/content.controller.js'

const r = Router()

r.post('/auth/login', loginLimiter, validate(s.adminLoginSchema), u.login)

r.use(protectAdmin)

r.get('/auth/me', u.me)
r.post('/auth/password', validate(s.passwordSchema), u.changePassword)
r.get('/dashboard', u.dashboard)
r.get('/counts', u.counts)

r.get('/users', u.listUsers)
r.get('/users/:id', u.userDetail)
r.patch('/users/:id/status', validate(s.userStatusSchema), u.setUserStatus)

r.post('/kyc/:id/approve', u.approveKyc)
r.post('/kyc/:id/reject', validate(s.rejectKycSchema), u.rejectKyc)
r.get('/documents/:id/file', u.documentFile)

r.get('/jobs', c.listJobs)
r.patch('/jobs/:id', validate(s.adminJobSchema), c.moderateJob)
r.get('/vehicles', c.listVehicles)
r.get('/connections', c.listConnections)

r.get('/plans', c.listPlans)
r.post('/plans', requireSuper, validate(s.planSchema), c.createPlan)
r.put('/plans/:id', requireSuper, validate(s.planSchema), c.updatePlan)
r.delete('/plans/:id', requireSuper, c.deletePlan)

r.get('/subscriptions', c.listSubscriptions)
r.post('/subscriptions/grant', validate(s.grantSchema), c.grantSubscription)
r.get('/payments', c.listPayments)

r.get('/categories', c.listCategories)
r.post('/categories', validate(s.categorySchema), c.createCategory)
r.put('/categories/:id', validate(s.categorySchema), c.updateCategory)
r.post('/categories/:id/image', uploadCategoryImage, requireFile, c.uploadCategoryImage)

r.get('/masters', c.listMasters)
r.post('/masters', validate(s.masterSchema), c.createMaster)
r.put('/masters/:id', validate(s.masterSchema), c.updateMaster)
r.delete('/masters/:id', c.deleteMaster)

r.get('/reports', c.listReports)
r.patch('/reports/:id', validate(s.reportUpdateSchema), c.updateReport)
r.get('/enquiries', c.listEnquiries)
r.patch('/enquiries/:id', c.updateEnquiry)

r.get('/broadcasts', c.listBroadcasts)
r.post('/broadcasts', validate(s.broadcastSchema), c.sendBroadcast)

r.get('/cms', c.getAllCms)
r.put('/cms/:key', validate(s.cmsSchema), c.putCms)

r.get('/admins', requireSuper, u.listAdmins)
r.post('/admins', requireSuper, validate(s.adminUserSchema), u.createAdmin)
r.put('/admins/:id', requireSuper, validate(s.adminUserSchema), u.updateAdmin)

export default r
