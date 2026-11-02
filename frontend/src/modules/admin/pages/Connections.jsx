import { Handshake } from 'lucide-react'
import { Badge, Card, EmptyState, ErrorNote, Identity, Pagination, Segmented, StatusBadge, Table, Toolbar } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { useUrlState } from '@/hooks/useUrlState'
import { ago, dateTime, phone } from '@/lib/format'
import { PageHeader } from '../AdminLayout'

const Person = ({ p }) => (p ? <Identity size={28} name={p.company || p.name || '—'} sub={phone(p.phone)} /> : <span className="text-ink-400">—</span>)

export default function Connections() {
  const [f, set] = useUrlState({ source: '' })
  const { data, error, loading, reload } = useApi('/admin/connections', { source: f.source, page: f.page })
  return (
    <div>
      <PageHeader title="Connections" subtitle="Owner and driver pairs who can now call, WhatsApp and chat with each other." />
      <Card>
        <Toolbar right={<span className="tabular">{data ? `${data.total} connections` : ''}</span>}>
          <Segmented
            value={f.source}
            onChange={(v) => set({ source: v })}
            options={[
              { value: '', label: 'All' },
              { value: 'application', label: 'Driver applied' },
              { value: 'request', label: 'Owner requested' },
            ]}
          />
        </Toolbar>
        <ErrorNote error={error} onRetry={reload} />
        <Table
          loading={loading}
          rows={data?.items}
          empty={<EmptyState icon={Handshake} title="No connections yet" text="They appear when an owner connects with an applicant or a driver accepts a hiring request." />}
          columns={[
            { key: 'owner', title: 'Owner', render: (c) => <Person p={c.owner} /> },
            { key: 'driver', title: 'Driver', render: (c) => <Person p={c.driver} /> },
            { key: 'job', title: 'Job', render: (c) => <span className="line-clamp-1 max-w-[260px]">{c.job?.title ?? <span className="text-ink-400">Direct request</span>}</span> },
            { key: 'source', title: 'How', render: (c) => <Badge tone={c.source === 'request' ? 'blue' : 'amber'}>{c.source === 'request' ? 'Owner requested' : 'Driver applied'}</Badge> },
            { key: 'status', title: 'Status', render: (c) => <StatusBadge status={c.status === 'active' ? 'connected' : c.status} /> },
            { key: 'last', title: 'Last message', render: (c) => <span className="text-ink-500">{c.lastMessageAt ? ago(c.lastMessageAt) : '-'}</span> },
            { key: 'createdAt', title: 'Connected', render: (c) => dateTime(c.createdAt) },
          ]}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: p })} />
      </Card>
    </div>
  )
}
