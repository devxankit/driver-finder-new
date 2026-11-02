import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, CircleDot, Truck, Users as UsersIcon } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorNote, FilterSelect, Identity, Pagination, SearchInput, StatusBadge, Table, Toolbar } from '@/components/ui'
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
  const category = params.get('category') || ''
  const page = Number(params.get('page') || 1)
  const openId = params.get('user')
  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

  const isOwner = role === 'owner'
  const { data, error, loading, reload } = useApi('/admin/users', { role, q, kyc, status, category: isOwner ? undefined : category, page }, { live: ['users', 'kyc'] })
  const filtered = q || kyc || status || category

  return (
    <div>
      <PageHeader
        title={isOwner ? 'Vehicle owners' : 'Drivers'}
        subtitle={isOwner ? 'Individuals and fleet companies who hire drivers.' : 'Everyone who signed up to find driving work.'}
      />

      <Card>
        <Toolbar
          right={
            <>
              {filtered && (
                <Button variant="ghost" size="xs" onClick={() => set({ q: '', kyc: '', status: '', category: '', page: '' })}>
                  Clear filters
                </Button>
              )}
              <span className="tabular">{data ? `${data.total} ${isOwner ? 'owners' : 'drivers'}` : ''}</span>
            </>
          }
        >
          <SearchInput value={q} onChange={(v) => set({ q: v, page: '' })} placeholder={isOwner ? 'Name, business, phone or city' : 'Name, phone or city'} />
          <FilterSelect
            icon={BadgeCheck}
            value={kyc}
            onChange={(v) => set({ kyc: v, page: '' })}
            placeholder="KYC: any"
            options={[
              { value: 'approved', label: 'Verified' },
              { value: 'pending', label: 'Waiting for review' },
              { value: 'rejected', label: 'Sent back' },
              { value: 'none', label: 'Not submitted' },
            ]}
          />
          <FilterSelect
            icon={CircleDot}
            value={status}
            onChange={(v) => set({ status: v, page: '' })}
            placeholder="Account: any"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
          {!isOwner && (
            <FilterSelect icon={Truck} value={category} onChange={(v) => set({ category: v, page: '' })} placeholder="Vehicle: any" options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
          )}
        </Toolbar>
        <ErrorNote error={error} onRetry={reload} />
        <Table
          loading={loading}
          rows={data?.items}
          onRowClick={(r) => set({ user: r.id })}
          selectedKey={openId}
          empty={<EmptyState icon={UsersIcon} title="No one matches" text={filtered ? 'Try clearing the filters.' : 'People appear here as they sign up in the app.'} />}
          columns={[
            { key: 'name', title: 'Name', render: (r) => <Identity src={fileUrl(r.photo)} name={r.name || 'No name yet'} sub={phone(r.phone)} /> },
            isOwner
              ? { key: 'company', title: 'Business', render: (r) => r.company || <span className="text-ink-400">Individual</span> }
              : {
                  key: 'cats',
                  title: 'Drives',
                  render: (r) =>
                    r.categories.length ? (
                      <span className="flex flex-wrap items-center gap-1">
                        {r.categories.slice(0, 2).map((c) => (
                          <Badge key={c}>{CATEGORY_LABELS[c] ?? c}</Badge>
                        ))}
                        {r.categories.length > 2 && <span className="text-[12px] text-ink-500">+{r.categories.length - 2}</span>}
                        {r.experience != null && <span className="ml-1 text-[12px] text-ink-500">{r.experience} yrs</span>}
                      </span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    ),
                },
            { key: 'city', title: 'City', render: (r) => r.city || <span className="text-ink-400">—</span> },
            { key: 'kyc', title: 'KYC', render: (r) => <StatusBadge status={r.kyc} /> },
            { key: 'status', title: 'Account', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'createdAt', title: 'Joined', render: (r) => <span className="tabular">{date(r.createdAt)}</span> },
            { key: 'seen', title: 'Last seen', render: (r) => <span className="text-ink-500">{ago(r.lastSeenAt)}</span> },
          ]}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: String(p) })} />
      </Card>

      <UserDrawer userId={openId} onClose={() => set({ user: '' })} onChanged={reload} />
    </div>
  )
}
