import { CreditCard } from 'lucide-react'
import { Badge, Card, EmptyState, ErrorNote, Pagination, StatusBadge, Table, Tabs } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { useUrlState } from '@/hooks/useUrlState'
import { date, dateTime, phone, rupees } from '@/lib/format'
import { PageHeader } from '../AdminLayout'

const Person = ({ p }) =>
  p ? (
    <div>
      <div className="font-medium text-ink">{p.company || p.name}</div>
      <div className="text-xs text-ink-500">
        {p.role === 'owner' ? 'Owner' : 'Driver'} · {phone(p.phone)}
      </div>
    </div>
  ) : (
    '-'
  )

function SubscriptionsTable({ f, set }) {
  const { data, error, loading, reload } = useApi('/admin/subscriptions', { state: f.state, role: f.role, page: f.page }, { live: ['payments'] })
  return (
    <>
      <div className="flex flex-wrap gap-3 border-b border-ink-200 p-4">
        <Tabs value={f.state ?? ''} onChange={(v) => set({ state: v })} tabs={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }]} />
        <Tabs value={f.role ?? ''} onChange={(v) => set({ role: v })} tabs={[{ value: '', label: 'Everyone' }, { value: 'driver', label: 'Drivers' }, { value: 'owner', label: 'Owners' }]} />
      </div>
      <ErrorNote error={error} onRetry={reload} />
      <Table
        loading={loading}
        rows={data?.items}
        empty={<EmptyState icon={CreditCard} title="No subscriptions yet" />}
        columns={[
          { key: 'user', title: 'User', render: (s) => <Person p={s.user} /> },
          { key: 'plan', title: 'Plan', render: (s) => s.planName },
          { key: 'source', title: 'Source', render: (s) => <Badge tone={s.source === 'admin' ? 'blue' : 'neutral'}>{s.source === 'admin' ? 'Given by admin' : 'Paid'}</Badge> },
          { key: 'startsAt', title: 'Starts', render: (s) => date(s.startsAt) },
          { key: 'expiresAt', title: 'Ends', render: (s) => date(s.expiresAt) },
          { key: 'state', title: 'Status', render: (s) => <StatusBadge status={s.active ? 'active' : 'expired'} /> },
        ]}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: p })} />
    </>
  )
}

function PaymentsTable({ f, set }) {
  const { data, error, loading, reload } = useApi('/admin/payments', { status: f.status, page: f.page }, { live: ['payments'] })
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 p-4">
        <Tabs value={f.status ?? ''} onChange={(v) => set({ status: v })} tabs={[{ value: '', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'failed', label: 'Failed' }, { value: 'created', label: 'Not finished' }]} />
        {data && (
          <span className="text-sm text-ink-500">
            Collected through Razorpay: <b className="text-ink tabular">{rupees(data.totalPaid)}</b>
          </span>
        )}
      </div>
      <ErrorNote error={error} onRetry={reload} />
      <Table
        loading={loading}
        rows={data?.items}
        empty={<EmptyState icon={CreditCard} title="No payments yet" />}
        columns={[
          { key: 'receipt', title: 'Receipt', render: (p) => <span className="font-mono text-xs">{p.receipt}</span> },
          { key: 'user', title: 'User', render: (p) => <Person p={p.user} /> },
          { key: 'plan', title: 'Plan', render: (p) => p.planName },
          { key: 'amount', title: 'Amount', align: 'right', render: (p) => <span className="font-semibold tabular">{rupees(p.amount)}</span> },
          { key: 'method', title: 'Method', render: (p) => (p.method === 'admin' ? 'Admin' : 'Razorpay') },
          { key: 'paymentId', title: 'Razorpay ID', render: (p) => <span className="font-mono text-xs text-ink-500">{p.paymentId || p.orderId || '-'}</span> },
          { key: 'createdAt', title: 'When', render: (p) => dateTime(p.createdAt) },
          { key: 'status', title: 'Status', render: (p) => <StatusBadge status={p.status} /> },
        ]}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: p })} />
    </>
  )
}

export default function Payments() {
  const [f, set] = useUrlState({ tab: 'subscriptions' })
  return (
    <div>
      <PageHeader title="Subscriptions & payments" subtitle="Who has a live plan, and every Razorpay payment. To give or extend a plan, open the user's profile." />
      <Tabs
        className="mb-4 w-fit"
        value={f.tab}
        onChange={(v) => set({ tab: v, state: '', role: '', status: '' })}
        tabs={[
          { value: 'subscriptions', label: 'Subscriptions' },
          { value: 'payments', label: 'Payments' },
        ]}
      />
      <Card>{f.tab === 'payments' ? <PaymentsTable f={f} set={set} /> : <SubscriptionsTable f={f} set={set} />}</Card>
    </div>
  )
}
