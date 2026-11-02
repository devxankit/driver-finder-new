import { useSearchParams } from 'react-router-dom'
import { Users as UsersIcon } from 'lucide-react'
import { Avatar, Card, EmptyState, ErrorNote, Pagination, SearchInput, Select, StatusBadge, Table } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { fileUrl } from '@/lib/api'
import { ago, CATEGORY_LABELS, date, phone } from '@/lib/format'
import { PageHeader } from '../AdminLayout'
import UserDrawer from '../components/UserDrawer'

/** Drivers or owners list. */
export default function Users({ role }) {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const kyc = params.get('kyc') || ''
  const status = params.get('status') || ''
  const page = Number(params.get('page') || 1)
  const openId = params.get('user')
  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

  const { data, error, loading, reload } = useApi('/admin/users', { role, q, kyc, status, page }, { live: ['users', 'kyc'] })
  const isOwner = role === 'owner'

  return (
    <div>
      <PageHeader
        title={isOwner ? 'Vehicle owners' : 'Drivers'}
        subtitle={isOwner ? 'Individuals and fleet companies who hire drivers.' : 'Everyone who signed up to find driving work.'}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 p-4">
          <SearchInput value={q} onChange={(v) => set({ q: v, page: '' })} placeholder={isOwner ? 'Name, business, phone, city' : 'Name, phone, city'} />
          <Select
            className="w-auto"
            value={kyc}
            onChange={(e) => set({ kyc: e.target.value, page: '' })}
            placeholder="Any KYC status"
            options={[
              { value: 'approved', label: 'Verified' },
              { value: 'pending', label: 'Waiting for review' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'none', label: 'Not submitted' },
            ]}
          />
          <Select
            className="w-auto"
            value={status}
            onChange={(e) => set({ status: e.target.value, page: '' })}
            placeholder="Active and suspended"
            options={[
              { value: 'active', label: 'Active only' },
              { value: 'suspended', label: 'Suspended only' },
            ]}
          />
          <span className="ml-auto text-sm text-ink-500 tabular">{data ? `${data.total} found` : ''}</span>
        </div>
        <ErrorNote error={error} onRetry={reload} />
        <Table
          loading={loading}
          rows={data?.items}
          onRowClick={(r) => set({ user: r.id })}
          empty={<EmptyState icon={UsersIcon} title="No one matches" text="Try clearing the filters." />}
          columns={[
            {
              key: 'name',
              title: 'Name',
              render: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar src={fileUrl(r.photo)} name={r.name || r.phone} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{r.name || 'No name yet'}</div>
                    <div className="text-xs text-ink-500">{phone(r.phone)}</div>
                  </div>
                </div>
              ),
            },
            isOwner
              ? { key: 'company', title: 'Business' }
              : {
                  key: 'cats',
                  title: 'Drives',
                  render: (r) => (
                    <span>
                      {r.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ') || '-'}
                      {r.experience != null && <span className="text-ink-500"> · {r.experience} yrs</span>}
                    </span>
                  ),
                },
            { key: 'city', title: 'City' },
            { key: 'kyc', title: 'KYC', render: (r) => <StatusBadge status={r.kyc} label={r.kyc === 'approved' ? 'Verified' : undefined} /> },
            { key: 'status', title: 'Account', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'createdAt', title: 'Joined', render: (r) => date(r.createdAt) },
            { key: 'seen', title: 'Last seen', render: (r) => <span className="text-ink-500">{ago(r.lastSeenAt)}</span> },
          ]}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: String(p) })} />
      </Card>

      <UserDrawer userId={openId} onClose={() => set({ user: '' })} onChanged={reload} />
    </div>
  )
}
