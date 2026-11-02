import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Flag, Inbox, Phone, X } from 'lucide-react'
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Identity, Modal, Pagination, Segmented, StatusBadge, Table, Tabs, Textarea, Toolbar, useToast } from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { useUrlState } from '@/hooks/useUrlState'
import { api } from '@/lib/api'
import { ago, dateTime, phone } from '@/lib/format'
import { PageHeader } from '../AdminLayout'

function ReportsTable({ f, set }) {
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const navigate = useNavigate()
  const { data, error, loading, reload } = useApi('/admin/reports', { status: f.status, page: f.page }, { live: ['reports'] })
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState('')

  async function resolve(status) {
    const ok = await run(() => api(`/admin/reports/${open.id}`, { method: 'PATCH', body: { status, note } }), status === 'resolved' ? 'Marked resolved' : 'Dismissed')
    if (ok) {
      setOpen(null)
      reload()
    }
  }
  const userLink = (u) => u && navigate(`/admin/${u.role === 'owner' ? 'owners' : 'drivers'}?user=${u.id}`)

  return (
    <>
      <Toolbar right={<span className="tabular">{data ? `${data.total} reports` : ''}</span>}>
        <Segmented value={f.status} onChange={(v) => set({ status: v })} options={[{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }, { value: 'dismissed', label: 'Dismissed' }, { value: '', label: 'All' }]} />
      </Toolbar>
      <ErrorNote error={error} onRetry={reload} />
      <Table
        loading={loading}
        rows={data?.items}
        onRowClick={(r) => {
          setNote(r.note || '')
          setOpen(r)
        }}
        empty={<EmptyState icon={Flag} title="No reports" text="When someone reports a user or a job in the app, it shows here." />}
        columns={[
          { key: 'reason', title: 'Reason', render: (r) => <Badge tone={r.status === 'open' ? 'red' : 'neutral'} dot>{r.reason}</Badge> },
          { key: 'target', title: 'About', render: (r) => (r.targetType === 'job' ? <Identity size={28} square name={r.targetJob?.title || 'Job'} sub={`Job by ${r.targetUser?.company || r.targetUser?.name || '—'}`} /> : <Identity size={28} name={r.targetUser?.company || r.targetUser?.name || '—'} sub={phone(r.targetUser?.phone)} />) },
          { key: 'reporter', title: 'Reported by', render: (r) => <Identity size={28} name={r.reporter?.company || r.reporter?.name || '—'} sub={phone(r.reporter?.phone)} /> },
          { key: 'createdAt', title: 'When', render: (r) => <span className="text-ink-500">{ago(r.createdAt)}</span> },
          { key: 'status', title: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: p })} />

      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title="Report"
        description={open ? `Raised ${dateTime(open.createdAt)}` : undefined}
        footer={
          <>
            <Button variant="outline" icon={X} onClick={() => resolve('dismissed')} loading={busy}>
              Dismiss
            </Button>
            <Button variant="dark" icon={Check} onClick={() => resolve('resolved')} loading={busy}>
              Mark resolved
            </Button>
          </>
        }
      >
        {open && (
          <div className="space-y-4 text-sm">
            <div>
              <Badge tone="red">{open.reason}</Badge>
              {open.details && <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2.5 leading-relaxed text-ink-700">“{open.details}”</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => userLink(open.targetUser)} className="rounded-xl border border-ink-200 p-3 text-left transition hover:border-ink-400 hover:shadow-soft">
                <div className="text-xs text-ink-500">Reported {open.targetType === 'job' ? 'job owner' : 'user'}</div>
                <div className="font-semibold">{open.targetUser?.company || open.targetUser?.name}</div>
                <div className="text-xs text-ink-500">{phone(open.targetUser?.phone)}</div>
                {open.targetJob && <div className="mt-1 text-xs">Job: {open.targetJob.title}</div>}
              </button>
              <button onClick={() => userLink(open.reporter)} className="rounded-xl border border-ink-200 p-3 text-left transition hover:border-ink-400 hover:shadow-soft">
                <div className="text-xs text-ink-500">Reported by</div>
                <div className="font-semibold">{open.reporter?.company || open.reporter?.name}</div>
                <div className="text-xs text-ink-500">{phone(open.reporter?.phone)}</div>
              </button>
            </div>
            <p className="text-xs text-ink-500">To act, open the user and suspend them, or hide the job from Job posts.</p>
            <Field label="Resolution note (internal)">
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  )
}

function EnquiriesTable({ f, set }) {
  const toast = useToast()
  const [run] = useAction(toast)
  const { data, error, loading, reload } = useApi('/admin/enquiries', { status: f.estatus, page: f.page }, { live: ['enquiries'] })
  async function mark(e, status) {
    const ok = await run(() => api(`/admin/enquiries/${e.id}`, { method: 'PATCH', body: { status } }))
    if (ok) reload()
  }
  return (
    <>
      <Toolbar right={<span className="tabular">{data ? `${data.total} enquiries` : ''}</span>}>
        <Segmented value={f.estatus ?? ''} onChange={(v) => set({ estatus: v })} options={[{ value: '', label: 'All' }, { value: 'new', label: 'New' }, { value: 'done', label: 'Done' }]} />
      </Toolbar>
      <ErrorNote error={error} onRetry={reload} />
      <Table
        loading={loading}
        rows={data?.items}
        empty={<EmptyState icon={Inbox} title="No enquiries" text="Messages from the website contact form show here." />}
        columns={[
          { key: 'name', title: 'Name', render: (e) => <Identity size={28} name={e.name} sub={e.role || undefined} /> },
          { key: 'phone', title: 'Phone', render: (e) => <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap text-ink hover:underline"><Phone className="size-3 text-ink-400" />{e.phone}</a> },
          { key: 'message', title: 'Message', render: (e) => <span className="line-clamp-2 max-w-[360px]">{e.message || '-'}</span> },
          { key: 'createdAt', title: 'When', render: (e) => <span className="text-ink-500">{ago(e.createdAt)}</span> },
          {
            key: 'status',
            title: '',
            align: 'right',
            render: (e) =>
              e.status === 'new' ? (
                <Button size="sm" variant="outline" icon={Check} onClick={() => mark(e, 'done')}>
                  Done
                </Button>
              ) : (
                <StatusBadge status="done" />
              ),
          },
        ]}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: p })} />
    </>
  )
}

export default function Reports() {
  const [f, set] = useUrlState({ tab: 'reports', status: 'open' })
  return (
    <div>
      <PageHeader title="Reports & enquiries" subtitle="Disputes raised in the app, and messages from the website." />
      <Card>
        <Tabs className="px-3" value={f.tab} onChange={(v) => set({ tab: v })} tabs={[{ value: 'reports', label: 'App reports' }, { value: 'enquiries', label: 'Website enquiries' }]} />
        {f.tab === 'enquiries' ? <EnquiriesTable f={f} set={set} /> : <ReportsTable f={f} set={set} />}
      </Card>
    </div>
  )
}
