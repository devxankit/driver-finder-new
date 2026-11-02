import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button, ErrorNote, Field, Input } from '@/components/ui'
import logo from '@/assets/images/logo-mark.png'
import truck from '@/assets/images/v-truck.jpg'
import { useAuth } from '../auth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-yellow/25 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="size-11 rounded-xl bg-white p-0.5" />
            <span className="text-lg font-extrabold">Driver Finder</span>
          </div>
          <div>
            <img src={truck} alt="" className="mb-10 w-[min(520px,90%)] rounded-3xl bg-white p-6" />
            <h2 className="max-w-md text-3xl leading-tight font-extrabold">Verify drivers and owners. Keep the marketplace honest.</h2>
            <p className="mt-3 max-w-md text-white/60">KYC review, job moderation, plans and payments in one place.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-white px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <img src={logo} alt="" className="mb-6 size-14 lg:hidden" />
          <h1 className="text-2xl font-extrabold tracking-tight">Admin sign in</h1>
          <p className="mt-1.5 text-sm text-ink-500">Use the email and password given to you by the Driver Finder team.</p>
          <div className="mt-8 space-y-4">
            <Field label="Email">
              <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@driverfinder.in" autoFocus />
            </Field>
            <Field label="Password">
              <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <ErrorNote error={error} />
            <Button type="submit" size="lg" className="w-full" loading={busy} icon={Lock}>
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
