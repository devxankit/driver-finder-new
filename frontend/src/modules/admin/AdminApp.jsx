import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PageLoader } from '@/components/ui'
import { AuthProvider, useAuth } from './auth'
import AdminLayout from './AdminLayout'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Kyc = lazy(() => import('./pages/Kyc'))
const Users = lazy(() => import('./pages/Users'))
const Jobs = lazy(() => import('./pages/Jobs'))
const Vehicles = lazy(() => import('./pages/Vehicles'))
const Connections = lazy(() => import('./pages/Connections'))
const Plans = lazy(() => import('./pages/Plans'))
const Payments = lazy(() => import('./pages/Payments'))
const Masters = lazy(() => import('./pages/Masters'))
const Reports = lazy(() => import('./pages/Reports'))
const Broadcasts = lazy(() => import('./pages/Broadcasts'))
const Cms = lazy(() => import('./pages/Cms'))
const Settings = lazy(() => import('./pages/Settings'))

function Gate() {
  const { admin, checking } = useAuth()
  if (checking) return <PageLoader />
  if (!admin) return <Login />
  return (
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="kyc" element={<Kyc />} />
          <Route path="drivers" element={<Users role="driver" />} />
          <Route path="owners" element={<Users role="owner" />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="connections" element={<Connections />} />
          <Route path="plans" element={<Plans />} />
          <Route path="payments" element={<Payments />} />
          <Route path="masters" element={<Masters />} />
          <Route path="reports" element={<Reports />} />
          <Route path="broadcasts" element={<Broadcasts />} />
          <Route path="content" element={<Cms />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  )
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
