import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  CircleCheck,
  CircleX,
  CreditCard,
  Flag,
  Handshake,
  Inbox,
  Mail,
  Plus,
  Send,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { Avatar, Button, Card, CardHeader, EmptyState, ErrorNote, Skeleton } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { ago, CATEGORY_LABELS, cn, count, rupees, rupeesShort } from '@/lib/format'
import { fileUrl } from '@/lib/api'
import { PageHeader } from '../AdminLayout'
import { ColumnChart, SERIES } from '../components/Charts'
import { useAuth } from '../auth'

/* ------------------------------------------------------------- KPI cards */

function Sparkline({ values, color = 'var(--color-ink)' }) {
  if (!values?.length) return null
  const w = 96
  const h = 32
  const max = Math.max(1, ...values)
  const step = w / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => [i * step, h - 3 - (v / max) * (h - 6)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden="true">
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={color} opacity="0.1" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="3" fill={color} stroke="white" strokeWidth="2" />
    </svg>
  )
}

function Delta({ now, prev, suffix = 'vs last week' }) {
  if (!prev && !now) return <span className="text-[12px] text-ink-400">No change {suffix}</span>
  if (!prev) return <span className="text-[12px] font-semibold text-green-text">New {suffix}</span>
  const pct = Math.round(((now - prev) / prev) * 100)
  const up = pct >= 0
  return (
    <span className="inline-flex items-center gap-1 text-[12px]">
      <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-px font-semibold', up ? 'bg-green-soft text-green-text' : 'bg-red-soft text-red-text')}>
        {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
        {Math.abs(pct)}%
      </span>
      <span className="text-ink-400">{suffix}</span>
    </span>
  )
}

function Kpi({ label, value, icon: Icon, sub, delta, spark, sparkColor, to }) {
  const body = (
    <Card className={cn('group relative h-full overflow-hidden p-5 transition', to && 'hover:border-ink-300 hover:shadow-soft')}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-ink-50 ring-1 ring-ink-200/70">
          <Icon className="size-4 text-ink-600" />
        </span>
        <span className="text-[13px] font-medium text-ink-500">{label}</span>
        {to && <ArrowRight className="ml-auto size-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-500" />}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="text-[30px] leading-none font-bold tracking-tight tabular">{value}</div>
        <Sparkline values={spark} color={sparkColor} />
      </div>
      <div className="mt-3 whitespace-nowrap">{delta}</div>
      {sub && <div className="mt-1 truncate text-[12px] text-ink-500">{sub}</div>}
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

/* ------------------------------------------------------- Needs attention */

function AttentionRow({ icon: Icon, tone, title, text, n, to }) {
  const tones = { amber: 'bg-amber-soft text-amber-text', red: 'bg-red-soft text-red-text', blue: 'bg-blue-soft text-blue-text', green: 'bg-green-soft text-green-text' }
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-ink-50">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', n ? tones[tone] : 'bg-ink-100 text-ink-400')}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[12px] text-ink-500">{text}</span>
      </span>
      <span className={cn('text-[18px] font-bold tabular', n ? 'text-ink' : 'text-ink-300')}>{n}</span>
      <ArrowRight className="size-4 text-ink-300 transition group-hover:translate-x-0.5" />
    </Link>
  )
}

/* -------------------------------------------------------- Supply/demand */

function SupplyDemand({ breakdown }) {
  const keys = [...new Set([...breakdown.jobs.map((x) => x.key), ...breakdown.drivers.map((x) => x.key)])]
  const rows = keys
    .map((k) => ({ key: k, jobs: breakdown.jobs.find((x) => x.key === k)?.count ?? 0, drivers: breakdown.drivers.find((x) => x.key === k)?.count ?? 0 }))
    .sort((a, b) => b.jobs + b.drivers - (a.jobs + a.drivers))
  const max = Math.max(1, ...rows.flatMap((r) => [r.jobs, r.drivers]))
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4 text-[12px] text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: SERIES[0] }} />
          Open jobs
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: SERIES[1] }} />
          Verified drivers
        </span>
      </div>
      <ul className="space-y-3.5">
        {rows.map((r) => {
          const gap = r.jobs - r.drivers
          return (
            <li key={r.key} className="grid grid-cols-[88px_1fr_auto] items-center gap-3">
              <span className="truncate text-[12.5px] font-semibold text-ink-700">{CATEGORY_LABELS[r.key] ?? r.key}</span>
              <span className="space-y-1">
                {[
                  [r.jobs, SERIES[0], 'jobs'],
                  [r.drivers, SERIES[1], 'drivers'],
                ].map(([v, c, l]) => (
                  <span key={l} className="flex items-center gap-2" title={`${v} ${l}`}>
                    <span className="h-2 rounded-r-[3px]" style={{ width: `${Math.max(2, (v / max) * 100)}%`, background: c }} />
                    <span className="text-[11px] text-ink-500 tabular">{v}</span>
                  </span>
                ))}
              </span>
              <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', gap > 0 ? 'bg-amber-soft text-amber-text' : 'bg-ink-100 text-ink-500')} title={gap > 0 ? 'More jobs than drivers' : 'Enough drivers'}>
                {gap > 0 ? `Need ${gap}` : 'OK'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------- Activity */

const ACT = {
  signup: { icon: UserPlus, cls: 'bg-blue-soft text-blue-text' },
  kyc: { icon: BadgeCheck, cls: 'bg-amber-soft text-amber-text' },
  'kyc-approved': { icon: CircleCheck, cls: 'bg-green-soft text-green-text' },
  'kyc-rejected': { icon: CircleX, cls: 'bg-red-soft text-red-text' },
  payment: { icon: Wallet, cls: 'bg-green-soft text-green-text' },
  job: { icon: Briefcase, cls: 'bg-ink-100 text-ink-600' },
  connection: { icon: Handshake, cls: 'bg-yellow-100 text-yellow-text' },
}

function Activity({ items }) {
  const navigate = useNavigate()
  if (!items.length) return <EmptyState compact icon={Inbox} title="Nothing yet" text="Sign-ups, KYC, payments and new jobs appear here as they happen." />
  return (
    <ol className="relative">
      {items.map((a, i) => {
        const s = ACT[a.type] ?? ACT.job
        const link = a.userId ? (a.type === 'kyc' ? `/admin/kyc?user=${a.userId}` : `/admin/${a.role === 'owner' ? 'owners' : 'drivers'}?user=${a.userId}`) : a.jobId ? '/admin/jobs' : null
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < items.length - 1 && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-ink-200/80" />}
            <span className={cn('relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white', s.cls)}>
              <s.icon className="size-[15px]" />
            </span>
            <button disabled={!link} onClick={() => link && navigate(link)} className={cn('min-w-0 flex-1 pt-1 text-left', link && 'hover:underline-offset-2 [&:hover>span:first-child]:underline')}>
              <span className="block text-[13px] leading-snug text-ink-700">{a.text}</span>
              <span className="mt-0.5 block text-[11.5px] text-ink-400">{ago(a.at)}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ Page */

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-4 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-xl xl:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { admin } = useAuth()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApi('/admin/dashboard', undefined, { live: ['kyc', 'users', 'payments', 'reports', 'jobs', 'enquiries'] })

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const header = (
    <PageHeader
      title={`${greeting()}, ${admin?.name?.split(' ')[0] ?? 'there'}`}
      subtitle={`${today} · Here is what is happening on Driver Finder.`}
      actions={
        <>
          <Button variant="outline" icon={Send} onClick={() => navigate('/admin/broadcasts')}>
            Send notification
          </Button>
          <Button variant="dark" icon={BadgeCheck} onClick={() => navigate('/admin/kyc')}>
            Review KYC
          </Button>
        </>
      }
    />
  )
  if (error) return (
    <div>
      {header}
      <Card>
        <ErrorNote error={error} onRetry={reload} />
      </Card>
    </div>
  )
  if (loading && !data) return (
    <div>
      {header}
      <DashboardSkeleton />
    </div>
  )

  const s = data.stats
  const sum = (arr, k) => arr.reduce((a, x) => a + x[k], 0)
  const last7 = data.signups.slice(7)
  const prev7 = data.signups.slice(0, 7)
  const signups = data.signups.map((d) => {
    const dt = new Date(d.date)
    return { label: dt.toLocaleDateString('en-IN', { day: 'numeric' }), tip: dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), values: [d.drivers, d.owners] }
  })
  const revenue = data.revenue.map((m) => {
    const dt = new Date(`${m.month}-01`)
    return { label: dt.toLocaleDateString('en-IN', { month: 'short' }), tip: dt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), values: [m.amount] }
  })

  return (
    <div>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Drivers"
          icon={UserRound}
          value={count(s.drivers)}
          delta={<Delta now={sum(last7, 'drivers')} prev={sum(prev7, 'drivers')} />}
          sub={`${count(s.approvedDrivers)} verified · ${sum(last7, 'drivers')} new this week`}
          spark={data.signups.map((d) => d.drivers)}
          sparkColor={SERIES[0]}
          to="/admin/drivers"
        />
        <Kpi
          label="Vehicle owners"
          icon={Users}
          value={count(s.owners)}
          delta={<Delta now={sum(last7, 'owners')} prev={sum(prev7, 'owners')} />}
          sub={`${count(s.approvedOwners)} verified · ${sum(last7, 'owners')} new this week`}
          spark={data.signups.map((d) => d.owners)}
          sparkColor={SERIES[1]}
          to="/admin/owners"
        />
        <Kpi label="Active job posts" icon={Briefcase} value={count(s.activeJobs)} delta={<Delta now={s.jobs7d} prev={s.jobsPrev7} />} sub={`${s.jobs7d} posted this week · ${count(s.connections)} connections`} to="/admin/jobs" />
        <Kpi
          label="Revenue this month"
          icon={CreditCard}
          value={rupees(s.revenueMonth)}
          delta={<Delta now={s.revenueMonth} prev={s.revenueLastMonth} suffix="vs last month" />}
          sub={`${rupees(s.revenue)} all time · ${count(s.activeSubs)} active plans`}
          spark={data.revenue.map((m) => m.amount)}
          sparkColor="#16803c"
          to="/admin/payments"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="New sign-ups" subtitle="Last 14 days, drivers and vehicle owners" />
          <div className="p-5">
            <ColumnChart data={signups} series={[{ label: 'Drivers', color: SERIES[0] }, { label: 'Owners', color: SERIES[1] }]} labelEvery={2} height={230} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Needs your attention" subtitle="Work waiting on the admin team" />
          <div className="p-2">
            <AttentionRow icon={BadgeCheck} tone="amber" title="KYC waiting" text={s.kycPending ? `${s.kycPendingDrivers} drivers · ${s.kycPendingOwners} owners` : 'Nobody is waiting'} n={s.kycPending} to="/admin/kyc" />
            <AttentionRow icon={Flag} tone="red" title="Open reports" text="Users and jobs reported in the app" n={s.openReports} to="/admin/reports" />
            <AttentionRow icon={Mail} tone="blue" title="Website enquiries" text="Call-back requests from the website" n={s.newEnquiries} to="/admin/reports?tab=enquiries" />
            <AttentionRow icon={Plus} tone="green" title="Applications" text="Drivers who applied to jobs" n={s.applications} to="/admin/jobs" />
          </div>
          {data.queue.length > 0 && (
            <div className="border-t border-ink-100 px-5 py-4">
              <div className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-ink-400 uppercase">Oldest in the KYC queue</div>
              <div className="flex -space-x-2">
                {data.queue.map((u) => (
                  <Link key={u.id} to={`/admin/kyc?user=${u.id}`} title={u.name || u.phone}>
                    <Avatar src={fileUrl(u.photo)} name={u.name || u.phone} size={34} className="ring-2 ring-white" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Plan revenue" subtitle="Last 6 months, Razorpay payments" />
          <div className="p-5">
            {revenue.some((m) => m.values[0] > 0) ? (
              <ColumnChart data={revenue} series={[{ label: 'Revenue', color: SERIES[0] }]} format={rupeesShort} capLabels height={220} />
            ) : (
              <EmptyState compact icon={CreditCard} title="No plan payments yet" text="Paid subscriptions show here by month." />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Supply and demand" subtitle="Open jobs vs verified drivers, by vehicle" />
          <div className="p-5">
            <SupplyDemand breakdown={data.breakdown} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent activity" subtitle="Updates live as things happen" />
          <div className="scroll-thin max-h-[380px] overflow-y-auto p-5">
            <Activity items={data.activity} />
          </div>
        </Card>
      </div>
    </div>
  )
}
