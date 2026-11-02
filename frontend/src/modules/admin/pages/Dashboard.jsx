import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Briefcase, CreditCard, Flag, Handshake, Inbox, UserRound, Users } from 'lucide-react'
import { Avatar, Button, Card, CardHeader, EmptyState, ErrorNote, PageLoader, StatusBadge } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { ago, count, rupees, rupeesShort } from '@/lib/format'
import { fileUrl } from '@/lib/api'
import { PageHeader } from '../AdminLayout'
import { ColumnChart, SERIES } from '../components/Charts'

function Stat({ label, value, sub, icon: Icon, to, highlight }) {
  const body = (
    <Card className={`h-full p-5 transition ${to ? 'hover:border-ink-300' : ''} ${highlight ? 'border-yellow bg-yellow-50' : ''}`}>
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-ink-500">{label}</span>
        <Icon className="size-[18px] text-ink-400" />
      </div>
      <div className="mt-3 text-[28px] leading-none font-extrabold tracking-tight tabular">{value}</div>
      {sub && <div className="mt-2 text-xs text-ink-500">{sub}</div>}
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

export default function Dashboard() {
  const { data, error, loading, reload } = useApi('/admin/dashboard', undefined, { live: ['kyc', 'users', 'payments', 'reports', 'jobs', 'enquiries'] })
  const navigate = useNavigate()
  if (loading && !data) return <PageLoader />
  if (error) return <ErrorNote error={error} onRetry={reload} />
  const s = data.stats

  const signups = data.signups.map((d) => {
    const dt = new Date(d.date)
    return {
      label: dt.toLocaleDateString('en-IN', { day: 'numeric' }),
      tip: dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      values: [d.drivers, d.owners],
    }
  })
  const revenue = data.revenue.map((m) => {
    const dt = new Date(`${m.month}-01`)
    return { label: dt.toLocaleDateString('en-IN', { month: 'short' }), tip: dt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), values: [m.amount] }
  })

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="What needs your attention today, and how the marketplace is growing." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="KYC waiting" value={count(s.kycPending)} sub={`${s.kycPendingDrivers} ${s.kycPendingDrivers === 1 ? 'driver' : 'drivers'} · ${s.kycPendingOwners} ${s.kycPendingOwners === 1 ? 'owner' : 'owners'}`} icon={BadgeCheck} to="/admin/kyc" highlight={s.kycPending > 0} />
        <Stat label="Drivers" value={count(s.drivers)} sub={`${count(s.approvedDrivers)} verified`} icon={UserRound} to="/admin/drivers" />
        <Stat label="Vehicle owners" value={count(s.owners)} sub={`${count(s.approvedOwners)} verified`} icon={Users} to="/admin/owners" />
        <Stat label="Active subscribers" value={count(s.activeSubs)} sub="Drivers and owners with a live plan" icon={CreditCard} to="/admin/payments" />
        <Stat label="Revenue this month" value={rupees(s.revenueMonth)} sub={`${rupees(s.revenue)} all time`} icon={CreditCard} to="/admin/payments" />
        <Stat label="Active job posts" value={count(s.activeJobs)} sub={`${s.jobs7d} posted in the last 7 days`} icon={Briefcase} to="/admin/jobs" />
        <Stat label="Connections" value={count(s.connections)} sub={`${count(s.applications)} applications in total`} icon={Handshake} to="/admin/connections" />
        <Stat label="Open reports" value={count(s.openReports)} sub={`${s.newEnquiries} new website enquiries`} icon={Flag} to="/admin/reports" highlight={s.openReports > 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="New sign-ups" subtitle="Last 14 days, by role" />
          <div className="p-5">
            <ColumnChart
              data={signups}
              series={[
                { label: 'Drivers', color: SERIES[0] },
                { label: 'Owners', color: SERIES[1] },
              ]}
              labelEvery={2}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Plan revenue" subtitle="Last 6 months, Razorpay payments" />
          <div className="p-5">
            {revenue.some((m) => m.values[0] > 0) ? (
              <ColumnChart data={revenue} series={[{ label: 'Revenue', color: SERIES[0] }]} format={rupeesShort} capLabels />
            ) : (
              <EmptyState icon={CreditCard} title="No plan payments yet" text="Paid Razorpay subscriptions will show here by month." />
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Oldest KYC requests"
          subtitle="Reviewed first in, first out"
          action={
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/kyc')}>
              Open queue <ArrowRight className="size-3.5" />
            </Button>
          }
        />
        {data.queue.length ? (
          <ul className="divide-y divide-ink-100">
            {data.queue.map((u) => (
              <li key={u.id}>
                <Link to={`/admin/kyc?user=${u.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-yellow-50/60">
                  <Avatar src={fileUrl(u.photo)} name={u.name || u.phone} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{u.name || 'No name yet'}</div>
                    <div className="text-xs text-ink-500">
                      {u.role === 'owner' ? 'Vehicle owner' : 'Driver'} · {u.city || 'No city'}
                    </div>
                  </div>
                  <span className="hidden text-xs text-ink-500 sm:block">Sent {ago(u.kycSubmittedAt)}</span>
                  <StatusBadge status="pending" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Inbox} title="No one is waiting" text="New KYC submissions from the app appear here." />
        )}
      </Card>
    </div>
  )
}
