import { CreditCard } from 'lucide-react'
import { Badge, Card, EmptyState, ErrorNote, Identity, Pagination, Segmented, StatusBadge, Table, Tabs, Toolbar } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { useUrlState } from '@/hooks/useUrlState'
import { date, dateTime, phone, rupees } from '@/lib/format'
import { PageHeader } from '../AdminLayout'

const Person = ({ p }) =>
  p ? <Identity size={28} name={p.company || p.name || '—'} sub={`${p.role === 'owner' ? 'Owner' : 'Driver'} · ${phone(p.phone)}`} /> : <span className="text-ink-400">—</span>

function SubscriptionsTable({ f, set }) {
  const { data, error, loading, reload } = useApi('/admin/subscriptions', { state: f.state, role: f.role, page: f.page }, { live: ['payments'] })
  return (
    <>
      <Toolbar right={<span className="tabular">{data ? `${data.total} subscriptions` : ''}</span>}>
        <Segmented value={f.state ?? ''} onChange={(v) => set({ state: v })} options={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }]} />
        <Segmented value={f.role ?? ''} onChange={(v) => set({ role: v })} options={[{ value: '', label: 'Everyone' }, { value: 'driver', label: 'Drivers' }, { value: 'owner', label: 'Owners' }]} />
      </Toolbar>
      <ErrorNote error={error} onRetry={reload} />
      <Table
        loading={loading}
        rows={data?.items}
        empty={<EmptyState icon={CreditCard} title="No subscriptions yet" />}
        columns={[
          { key: 'user', title: 'User', render: (s) => <Person p={s.user} /> },
          { key: 'plan', title: 'Plan', render: (s) => <span className="font-medium text-ink">{s.planName}</span> },
          { key: 'source', title: 'Source', render: (s) => <Badge tone={s.source === 'admin' ? 'blue' : 'neutral'}>{s.source === 'admin' ? 'Given by admin' : 'Paid'}</Badge> },
          { key: 'startsAt', title: 'Starts', render: (s) => <span className="tabular">{date(s.startsAt)}</span> },
          { key: 'expiresAt', title: 'Ends', render: (s) => <span className="tabular">{date(s.expiresAt)}</span> },
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
      <Toolbar
        right={
          data && (
            <span>
              Collected through Razorpay <b className="ml-1 text-[13.5px] font-semibold text-ink tabular">{rupees(data.totalPaid)}</b>
            </span>
          )
        }
      >
        <Segmented value={f.status ?? ''} onChange={(v) => set({ status: v })} options={[{ value: '', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'failed', label: 'Failed' }, { value: 'created', label: 'Not finished' }]} />
      </Toolbar>
      <ErrorNote error={error} onRetry={reload} />
      <Table
        loading={loading}
        rows={data?.items}
        empty={<EmptyState icon={CreditCard} title="No payments yet" />}
        columns={[
          { key: 'receipt', title: 'Receipt', render: (p) => <span className="font-mono text-[12px] text-ink-600">{p.receipt}</span> },
          { key: 'user', title: 'User', render: (p) => <Person p={p.user} /> },
          { key: 'plan', title: 'For', render: (p) => p.planName || 'Registration fee' },
          { key: 'amount', title: 'Amount', align: 'right', render: (p) => <span className="font-semibold tabular">{rupees(p.amount)}</span> },
          { key: 'method', title: 'Method', render: (p) => (p.method === 'admin' ? 'Admin' : 'Razorpay') },
          { key: 'paymentId', title: 'Razorpay ID', render: (p) => <span className="font-mono text-xs text-ink-500">{p.paymentId || p.orderId || '-'}</span> },
          { key: 'createdAt', title: 'When', render: (p) => <span className="whitespace-nowrap text-ink-500">{dateTime(p.createdAt)}</span> },
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
      <Card>
        <Tabs
          className="px-3"
          value={f.tab}
          onChange={(v) => set({ tab: v, state: '', role: '', status: '' })}
          tabs={[
            { value: 'subscriptions', label: 'Subscriptions' },
            { value: 'payments', label: 'Payments' },
          ]}
        />
        {f.tab === 'payments' ? <PaymentsTable f={f} set={set} /> : <SubscriptionsTable f={f} set={set} />}
      </Card>
    </div>
  )
}
