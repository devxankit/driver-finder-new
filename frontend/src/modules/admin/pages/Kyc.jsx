import { useSearchParams } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { Avatar, Card, EmptyState, ErrorNote, Pagination, Table, Tabs, StatusBadge } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { fileUrl } from '@/lib/api'
import { ago, CATEGORY_LABELS, phone } from '@/lib/format'
import { PageHeader } from '../AdminLayout'
import UserDrawer from '../components/UserDrawer'

export default function Kyc() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'pending'
  const role = params.get('role') || ''
  const page = Number(params.get('page') || 1)
  const openId = params.get('user')
  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

  const { data, error, loading, reload } = useApi('/admin/users', { kyc: status, role, page }, { live: ['kyc', 'users'] })
  const counts = useApi('/admin/dashboard', undefined, { live: ['kyc'] }).data?.stats

  return (
    <div>
      <PageHeader title="KYC queue" subtitle="Check each document against the profile, then approve, or reject with a reason the user will see." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status}
          onChange={(v) => set({ status: v, page: '' })}
          tabs={[
            { value: 'pending', label: 'Waiting', count: counts?.kycPending },
            { value: 'rejected', label: 'Rejected' },
            { value: 'approved', label: 'Approved' },
            { value: 'none', label: 'Not submitted' },
          ]}
        />
        <Tabs
          value={role}
          onChange={(v) => set({ role: v, page: '' })}
          tabs={[
            { value: '', label: 'Everyone' },
            { value: 'driver', label: 'Drivers', count: status === 'pending' ? counts?.kycPendingDrivers : undefined },
            { value: 'owner', label: 'Owners', count: status === 'pending' ? counts?.kycPendingOwners : undefined },
          ]}
        />
      </div>

      <ErrorNote error={error} onRetry={reload} />
      <Card>
        <Table
          loading={loading}
          rows={data?.items}
          onRowClick={(r) => set({ user: r.id })}
          empty={<EmptyState icon={BadgeCheck} title={status === 'pending' ? 'All caught up' : 'No one here'} text={status === 'pending' ? 'New KYC submissions from the app appear here.' : undefined} />}
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
            { key: 'role', title: 'Role', render: (r) => (r.role === 'owner' ? 'Owner' : r.role === 'driver' ? 'Driver' : '-') },
            { key: 'city', title: 'City' },
            {
              key: 'detail',
              title: 'Vehicles / business',
              render: (r) => (r.role === 'owner' ? r.company || '-' : r.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ') || '-'),
            },
            { key: 'sent', title: status === 'pending' ? 'Waiting since' : 'Joined', render: (r) => <span className="text-ink-500">{ago(status === 'pending' ? r.kycSubmittedAt : r.createdAt)}</span> },
            { key: 'kyc', title: 'Status', render: (r) => <StatusBadge status={r.kyc} /> },
          ]}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: String(p) })} />
      </Card>

      <UserDrawer userId={openId} onClose={() => set({ user: '' })} onChanged={reload} />
    </div>
  )
}
