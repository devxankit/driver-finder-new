import { useEffect, useState } from 'react'
import { ArrowRight, BadgeCheck, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button, ErrorNote } from '@/components/ui'
import logo from '@/assets/images/logo-mark.png'
import { api } from '@/lib/api'
import { count } from '@/lib/format'
import { useAuth } from '../auth'

/** Abstract route network: roads between cities, drawn as lines and nodes. */
function RouteMap() {
  const nodes = [
    [70, 120], [210, 70], [330, 180], [500, 110], [610, 240], [140, 300], [300, 360], [460, 330], [580, 430], [90, 470], [250, 520], [420, 560], [560, 600],
  ]
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [2, 6], [6, 7], [7, 4], [7, 8], [5, 9], [9, 10], [6, 10], [10, 11], [11, 7], [11, 12], [8, 12],
  ]
  return (
    <svg viewBox="0 0 680 680" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="white" opacity="0.07" />
        </pattern>
        <radialGradient id="glow" cx="78%" cy="45%" r="55%">
          <stop offset="0" stopColor="#ffc81e" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffc81e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="680" height="680" fill="url(#dots)" />
      <rect width="680" height="680" fill="url(#glow)" />
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="white" strokeOpacity="0.09" strokeWidth="1.5" />
      ))}
      <path d="M500 110 L610 240 L460 330 L580 430 L560 600" fill="none" stroke="#ffc81e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 8" className="login-route" />
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 3 || i === 12 ? 6 : 3.5} fill={i === 3 || i === 12 ? '#ffc81e' : '#2a2a26'} stroke={i === 3 || i === 12 ? '#0b0b0a' : 'white'} strokeOpacity={i === 3 || i === 12 ? 1 : 0.25} strokeWidth="2" />
      ))}
      <circle cx="560" cy="600" r="14" fill="none" stroke="#ffc81e" strokeOpacity="0.35" strokeWidth="1.5" className="login-pulse" />
    </svg>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[26px] leading-none font-bold tracking-tight text-white tabular">{value ?? '–'}</div>
      <div className="mt-1.5 text-[12px] text-white/50">{label}</div>
    </div>
  )
}

function TextField({ icon: Icon, label, right, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-700">{label}</span>
      <span className="group relative flex items-center">
        <Icon className="pointer-events-none absolute left-3 size-4 text-ink-400 transition group-focus-within:text-ink-700" />
        <input
          {...props}
          className="h-11 w-full rounded-lg border border-ink-200 bg-white pr-11 pl-10 text-[14px] text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition outline-none placeholder:text-ink-400 hover:border-ink-300 focus:border-ink-900 focus:ring-4 focus:ring-ink-900/8"
        />
        {right && <span className="absolute right-1.5">{right}</span>}
      </span>
    </label>
  )
}

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api('/stats', { auth: false })
      .then(setStats)
      .catch(() => {})
  }, [])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-ui grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <style>{`
        .login-route { animation: login-dash 1.6s linear infinite; }
        @keyframes login-dash { to { stroke-dashoffset: -28; } }
        .login-pulse { transform-origin: 560px 600px; animation: login-pulse 2.4s ease-out infinite; }
        @keyframes login-pulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .login-route, .login-pulse { animation: none; } }
      `}</style>

      <aside className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <RouteMap />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/5" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-14">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="size-10 rounded-xl bg-white p-0.5" />
            <div>
              <div className="text-[15px] font-bold text-white">Driver Finder</div>
              <div className="text-[12px] text-white/45">Admin console</div>
            </div>
          </div>

          <div className="max-w-md">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-medium text-white/70">
              <span className="size-1.5 rounded-full bg-yellow" />
              Owners and drivers, verified
            </div>
            <h2 className="text-[34px] leading-[1.15] font-bold tracking-tight text-white">Keep every match on the road trustworthy.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/55">Review KYC, moderate job posts, manage plans and payments, and talk to your users. All in one place.</p>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <Stat label="Verified drivers" value={stats ? count(stats.drivers) : null} />
              <Stat label="Verified owners" value={stats ? count(stats.owners) : null} />
              <Stat label="Open jobs" value={stats ? count(stats.jobs) : null} />
            </div>
          </div>

          <div className="flex items-center gap-5 text-[12px] text-white/40">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Encrypted session
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="size-3.5" /> Staff access only
            </span>
          </div>
        </div>
      </aside>

      <main className="flex flex-col px-6 py-10 sm:px-10">
        <div className="flex items-center gap-2.5 lg:invisible">
          <img src={logo} alt="" className="size-9 rounded-lg" />
          <span className="text-[15px] font-bold">Driver Finder</span>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <form onSubmit={submit} className="animate-pop-in w-full max-w-[380px]">
            <h1 className="text-[26px] font-bold tracking-tight text-ink">Welcome back</h1>
            <p className="mt-2 text-[14px] text-ink-500">Sign in to the Driver Finder admin console.</p>

            <div className="mt-8 space-y-4">
              <TextField icon={Mail} label="Work email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@driverfinder.in" autoFocus />
              <TextField
                icon={Lock}
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                right={
                  <button type="button" onClick={() => setShow((s) => !s)} className="flex size-8 items-center justify-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-700" aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />
              <ErrorNote error={error} />
              <Button type="submit" variant="dark" size="lg" className="mt-2 h-11 w-full" loading={busy} iconRight={ArrowRight}>
                Sign in
              </Button>
            </div>

            <p className="mt-8 text-center text-[12.5px] text-ink-400">Forgot your password? Ask a super admin to reset it.</p>
          </form>
        </div>

        <div className="text-center text-[12px] text-ink-400">© {new Date().getFullYear()} Driver Finder</div>
      </main>
    </div>
  )
}
