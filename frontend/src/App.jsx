import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PageLoader, ToastProvider } from '@/components/ui'

// The landing page and the admin panel are separate bundles: visitors never download admin code.
const Landing = lazy(() => import('@/modules/landing/Landing'))
const LegalPage = lazy(() => import('@/modules/landing/LegalPage'))
const AdminApp = lazy(() => import('@/modules/admin/AdminApp'))

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/terms" element={<LegalPage page="terms" />} />
            <Route path="/privacy" element={<LegalPage page="privacy" />} />
            <Route path="/refund" element={<LegalPage page="refund" />} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  )
}
