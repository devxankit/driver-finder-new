import { useState } from 'react'
import { Truck } from 'lucide-react'
import { Card, EmptyState, ErrorNote, FilterSelect, Identity, Pagination, SearchInput, Table, Toolbar } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { useUrlState } from '@/hooks/useUrlState'
import { fileUrl } from '@/lib/api'
import { CATEGORY_LABELS, date, phone } from '@/lib/format'
import { PageHeader } from '../AdminLayout'

function VehicleThumb({ src }) {
  const [failed, setFailed] = useState(false)
  return src && !failed ? (
    <img src={src} alt="" onError={() => setFailed(true)} className="size-10 rounded-lg object-cover ring-1 ring-ink-200/60" />
  ) : (
    <div className="flex size-10 items-center justify-center rounded-lg bg-ink-100">
      <Truck className="size-4 text-ink-400" />
    </div>
  )
}

export default function Vehicles() {
  const [f, set] = useUrlState()
  const { data, error, loading, reload } = useApi('/admin/vehicles', { q: f.q, category: f.category, page: f.page })
  return (
    <div>
      <PageHeader title="Vehicles" subtitle="Every vehicle owners have added. Check registration numbers against reports." />
      <Card>
        <Toolbar right={<span className="tabular">{data ? `${data.total} vehicles` : ''}</span>}>
          <SearchInput value={f.q} onChange={(v) => set({ q: v })} placeholder="Registration number or model" />
          <FilterSelect icon={Truck} value={f.category ?? ''} onChange={(v) => set({ category: v })} placeholder="Type: any" options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
        </Toolbar>
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
                  <VehicleThumb src={fileUrl(v.photo)} />
                  <span className="rounded-md border border-ink-300 bg-yellow-50 px-2 py-0.5 font-mono text-[12.5px] font-semibold tracking-wide text-ink shadow-[inset_0_-1px_0_rgb(0_0_0/0.06)]">{v.number}</span>
                </div>
              ),
            },
            { key: 'category', title: 'Type', render: (v) => CATEGORY_LABELS[v.category] ?? v.category },
            { key: 'model', title: 'Model' },
            { key: 'year', title: 'Year', render: (v) => <span className="tabular">{v.year || '—'}</span> },
            { key: 'owner', title: 'Owner', render: (v) => <Identity size={28} name={v.owner?.company || v.owner?.name || '—'} sub={phone(v.owner?.phone)} /> },
            { key: 'driverName', title: 'Current driver', render: (v) => v.driverName || <span className="text-ink-400">None</span> },
            { key: 'createdAt', title: 'Added', render: (v) => date(v.createdAt) },
          ]}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: p })} />
      </Card>
    </div>
  )
}
