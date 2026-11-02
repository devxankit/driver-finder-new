import { Truck } from 'lucide-react'
import { Card, EmptyState, ErrorNote, Pagination, SearchInput, Select, Table } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { useUrlState } from '@/hooks/useUrlState'
import { fileUrl } from '@/lib/api'
import { CATEGORY_LABELS, date, phone } from '@/lib/format'
import { PageHeader } from '../AdminLayout'

export default function Vehicles() {
  const [f, set] = useUrlState()
  const { data, error, loading, reload } = useApi('/admin/vehicles', { q: f.q, category: f.category, page: f.page })
  return (
    <div>
      <PageHeader title="Vehicles" subtitle="Every vehicle owners have added. Check registration numbers against reports." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-ink-200 p-4">
          <SearchInput value={f.q} onChange={(v) => set({ q: v })} placeholder="Registration number or model" />
          <Select className="w-auto" value={f.category ?? ''} onChange={(e) => set({ category: e.target.value })} placeholder="All vehicles" options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
        </div>
        <ErrorNote error={error} onRetry={reload} />
        <Table
          loading={loading}
          rows={data?.items}
          empty={<EmptyState icon={Truck} title="No vehicles" />}
          columns={[
            {
              key: 'number',
              title: 'Registration',
              render: (v) => (
                <div className="flex items-center gap-3">
                  {v.photo ? <img src={fileUrl(v.photo)} alt="" className="size-10 rounded-lg object-cover" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-ink-100"><Truck className="size-4 text-ink-400" /></div>}
                  <span className="rounded-md border border-ink-300 bg-yellow-50 px-2 py-0.5 font-mono text-[13px] font-semibold tracking-wide text-ink">{v.number}</span>
                </div>
              ),
            },
            { key: 'category', title: 'Type', render: (v) => CATEGORY_LABELS[v.category] ?? v.category },
            { key: 'model', title: 'Model' },
            { key: 'year', title: 'Year' },
            { key: 'owner', title: 'Owner', render: (v) => <div><div className="font-medium text-ink">{v.owner?.company || v.owner?.name}</div><div className="text-xs text-ink-500">{phone(v.owner?.phone)}</div></div> },
            { key: 'driverName', title: 'Current driver', render: (v) => v.driverName || <span className="text-ink-400">None</span> },
            { key: 'createdAt', title: 'Added', render: (v) => date(v.createdAt) },
          ]}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: p })} />
      </Card>
    </div>
  )
}
