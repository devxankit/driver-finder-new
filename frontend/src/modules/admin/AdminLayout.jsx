import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Briefcase,
  CreditCard,
  Flag,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  SlidersHorizontal,
  Tags,
  Truck,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/format'
import { api } from '@/lib/api'
import { onAdminSync } from '@/lib/live'
import logo from '@/assets/images/logo-mark.png'
import { useAuth } from './auth'

const NAV = [
  { group: null, items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    group: 'Verification',
    items: [{ to: '/admin/kyc', label: 'KYC queue', icon: BadgeCheck, badge: 'kycPending' }],
  },
  {
    group: 'People',
    items: [
      { to: '/admin/drivers', label: 'Drivers', icon: UserRound },
      { to: '/admin/owners', label: 'Vehicle owners', icon: Users },
    ],
  },
  {
    group: 'Marketplace',
    items: [
      { to: '/admin/jobs', label: 'Job posts', icon: Briefcase },
      { to: '/admin/vehicles', label: 'Vehicles', icon: Truck },
      { to: '/admin/connections', label: 'Connections', icon: Handshake },
      { to: '/admin/reports', label: 'Reports & enquiries', icon: Flag, badge: 'openReports' },
    ],
  },
  {
    group: 'Revenue',
    items: [
      { to: '/admin/plans', label: 'Plans', icon: Tags },
      { to: '/admin/payments', label: 'Subscriptions & payments', icon: CreditCard },
    ],
  },
  {
    group: 'Setup',
    items: [
      { to: '/admin/masters', label: 'Categories & lists', icon: SlidersHorizontal },
      { to: '/admin/broadcasts', label: 'Notifications', icon: Bell },
      { to: '/admin/content', label: 'Content & support', icon: BookOpen },
      { to: '/admin/settings', label: 'Admin users', icon: Settings },
    ],
  },
]

function Sidebar({ counts, onNavigate }) {
  const { admin, logout } = useAuth()
  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <img src={logo} alt="" className="size-10 rounded-xl bg-white p-0.5" />
        <div>
          <div className="text-[15px] leading-tight font-extrabold">Driver Finder</div>
          <div className="text-xs text-white/50">Admin panel</div>
        </div>
      </div>
      <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((g, i) => (
          <div key={i} className="mt-3">
            {g.group && <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase">{g.group}</div>}
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group relative mb-0.5 flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-medium transition',
                    isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r bg-yellow" />}
                    <it.icon className={cn('size-[18px]', isActive ? 'text-yellow' : 'text-white/50 group-hover:text-white/80')} />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.badge && counts?.[it.badge] > 0 && (
                      <span className="rounded-full bg-yellow px-1.5 text-[11px] font-bold text-ink tabular">{counts[it.badge]}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-[10px] px-2 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-yellow text-sm font-bold text-ink">{admin?.name?.[0] ?? 'A'}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{admin?.name}</div>
            <div className="truncate text-[11px] text-white/45">{admin?.role === 'super' ? 'Super admin' : 'Staff'}</div>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Sidebar counts (pending KYC, open reports) refresh on every page change. */
function useCounts() {
  const { pathname } = useLocation()
  const [counts, setCounts] = useState(null)
  useEffect(() => {
    const load = () =>
      api('/admin/dashboard')
        .then((d) => setCounts(d.stats))
        .catch(() => {})
    load()
    return onAdminSync(load)
  }, [pathname])
  return counts
}

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false)
  const counts = useCounts()
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar counts={counts} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <Sidebar counts={counts} onNavigate={() => setOpen(false)} />
          </div>
          <button className="absolute top-4 left-[300px] rounded-full bg-white p-2" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-ink-100" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <img src={logo} alt="" className="size-8" />
        <span className="font-extrabold">Driver Finder</span>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
