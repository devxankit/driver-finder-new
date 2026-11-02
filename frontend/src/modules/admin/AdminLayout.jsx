import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Briefcase,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Flag,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
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
import { onAdminSync, onLiveStatus } from '@/lib/live'
import { Kbd } from '@/components/ui'
import logo from '@/assets/images/logo-mark.png'
import { useAuth } from './auth'
import CommandPalette from './components/CommandPalette'

export const NAV = [
  { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  { group: 'Verification', items: [{ to: '/admin/kyc', label: 'KYC review', icon: BadgeCheck, badge: 'kycPending' }] },
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
      { to: '/admin/payments', label: 'Payments', icon: CreditCard },
    ],
  },
  {
    group: 'Settings',
    items: [
      { to: '/admin/masters', label: 'Categories & lists', icon: SlidersHorizontal },
      { to: '/admin/broadcasts', label: 'Notifications', icon: Bell },
      { to: '/admin/content', label: 'Content & fees', icon: BookOpen },
      { to: '/admin/settings', label: 'Admin users', icon: Settings },
    ],
  },
]

const ALL = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })))

/** Sidebar badges: cheap counts, refreshed on navigation and live events. */
function useCounts() {
  const { pathname } = useLocation()
  const [counts, setCounts] = useState(null)
  useEffect(() => {
    const load = () =>
      api('/admin/counts')
        .then((d) => setCounts(d.counts))
        .catch(() => {})
    load()
    return onAdminSync(load)
  }, [pathname])
  return counts
}

function Sidebar({ counts, collapsed, onToggle, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-ink-950 text-white">
      <div className={cn('flex h-16 items-center gap-3 border-b border-white/[0.06]', collapsed ? 'justify-center px-2' : 'px-5')}>
        <img src={logo} alt="" className="size-9 shrink-0 rounded-xl bg-white p-0.5" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[15px] leading-tight font-bold tracking-tight">Driver Finder</div>
            <div className="text-[11.5px] text-white/45">Admin console</div>
          </div>
        )}
      </div>
      <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((g) => (
          <div key={g.group} className="mb-4">
            {!collapsed ? (
              <div className="px-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-white/35 uppercase">{g.group}</div>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-white/10" />
            )}
            {g.items.map((it) => {
              const n = it.badge ? counts?.[it.badge] : 0
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={onNavigate}
                  title={collapsed ? it.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative mb-px flex h-9 items-center gap-3 rounded-lg text-[13.5px] font-medium transition-colors',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      isActive ? 'bg-white/[0.08] text-white' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-yellow" />}
                      <it.icon className={cn('size-[18px] shrink-0', isActive ? 'text-yellow' : 'text-white/45 group-hover:text-white/75')} strokeWidth={isActive ? 2.2 : 1.9} />
                      {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                      {n > 0 &&
                        (collapsed ? (
                          <span className="absolute top-1.5 right-2 size-2 rounded-full bg-yellow ring-2 ring-ink-950" />
                        ) : (
                          <span className="rounded-md bg-yellow px-1.5 py-px text-[11px] font-bold text-ink tabular">{n}</span>
                        ))}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      {onToggle && (
        <button onClick={onToggle} className={cn('flex h-11 items-center gap-2 border-t border-white/[0.06] text-[12.5px] font-medium text-white/45 hover:text-white', collapsed ? 'justify-center' : 'px-5')}>
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {!collapsed && 'Collapse'}
        </button>
      )}
    </div>
  )
}

function LiveDot() {
  const [up, setUp] = useState(false)
  useEffect(() => onLiveStatus(setUp), [])
  return (
    <span className={cn('hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold md:inline-flex', up ? 'bg-green-soft text-green-text' : 'bg-ink-100 text-ink-500')} title={up ? 'Updates arrive live' : 'Reconnecting… pages still work'}>
      <span className="relative flex size-2">
        {up && <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60" />}
        <span className={cn('relative inline-flex size-2 rounded-full', up ? 'bg-green' : 'bg-ink-400')} />
      </span>
      {up ? 'Live' : 'Offline'}
    </span>
  )
}

function ProfileMenu() {
  const { admin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 hover:bg-ink-100" aria-haspopup="menu" aria-expanded={open}>
        <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-yellow">{admin?.name?.[0] ?? 'A'}</span>
        <span className="hidden text-left lg:block">
          <span className="block text-[13px] leading-tight font-semibold">{admin?.name}</span>
          <span className="block text-[11.5px] text-ink-500">{admin?.role === 'super' ? 'Super admin' : 'Staff'}</span>
        </span>
        <ChevronDown className="hidden size-4 text-ink-400 lg:block" />
      </button>
      {open && (
        <div role="menu" className="animate-pop-in absolute top-12 right-0 z-40 w-60 overflow-hidden rounded-xl bg-white shadow-pop ring-1 ring-ink-200/70">
          <div className="border-b border-ink-100 px-4 py-3">
            <div className="text-[13px] font-semibold">{admin?.name}</div>
            <div className="truncate text-[12px] text-ink-500">{admin?.email}</div>
          </div>
          <Link to="/admin/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink-700 hover:bg-ink-50">
            <KeyRound className="size-4 text-ink-400" /> Change password
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-red-text hover:bg-red-soft">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function Topbar({ onMenu, onSearch, counts }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const current = useMemo(() => [...ALL].sort((a, b) => b.to.length - a.to.length).find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to))), [pathname])
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 hover:bg-ink-100 lg:hidden" aria-label="Open menu">
        <Menu className="size-5" />
      </button>
      <nav className="flex min-w-0 items-center gap-2 text-[13px]" aria-label="Breadcrumb">
        <span className="hidden text-ink-400 sm:inline">{current?.group ?? 'Admin'}</span>
        <span className="hidden text-ink-300 sm:inline">/</span>
        <span className="truncate font-semibold text-ink">{current?.label ?? 'Dashboard'}</span>
      </nav>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button onClick={onSearch} className="flex h-9 w-9 items-center gap-2 rounded-lg border border-ink-200 bg-white text-[13px] text-ink-400 shadow-card transition hover:border-ink-300 sm:w-72 sm:px-3" aria-label="Search">
          <Search className="mx-auto size-4 sm:mx-0" />
          <span className="hidden flex-1 truncate text-left whitespace-nowrap sm:inline">Search people, jobs…</span>
          <span className="hidden items-center gap-0.5 sm:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <LiveDot />
        <button onClick={() => navigate('/admin/kyc')} className="relative flex size-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink" title="KYC waiting for review" aria-label="KYC waiting for review">
          <BadgeCheck className="size-[19px]" />
          {counts?.kycPending > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-yellow px-1 text-[10.5px] font-bold text-ink ring-2 ring-white">{counts.kycPending}</span>}
        </button>
        <span className="hidden h-6 w-px bg-ink-200 sm:block" />
        <ProfileMenu />
      </div>
    </header>
  )
}

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false)
  const [palette, setPalette] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('df.admin.collapsed') === '1')
  const counts = useCounts()
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => localStorage.setItem('df.admin.collapsed', collapsed ? '1' : '0'), [collapsed])
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((v) => !v)
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  return (
    <div className={cn('admin-ui min-h-screen bg-canvas text-ink transition-[padding] duration-200', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block', collapsed ? 'w-[72px]' : 'w-64')}>
        <Sidebar counts={counts} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
          <div className="animate-slide-in absolute inset-y-0 left-0 w-72">
            <Sidebar counts={counts} onNavigate={() => setOpen(false)} />
          </div>
          <button className="absolute top-4 left-[300px] rounded-full bg-white p-2" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
      )}

      <Topbar onMenu={() => setOpen(true)} onSearch={() => setPalette(true)} counts={counts} />
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      <CommandPalette open={palette} onClose={() => setPalette(false)} pages={ALL} />
    </div>
  )
}

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
