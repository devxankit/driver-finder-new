import { useState } from 'react'
import { Briefcase, EyeOff, RotateCcw, Truck } from 'lucide-react'
import { Badge, Button, Card, ConfirmModal, Drawer, EmptyState, ErrorNote, Field, FilterSelect, Identity, Input, KeyValue, Pagination, SearchInput, StatusBadge, Table, Tabs, Toolbar, useToast } from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { useUrlState } from '@/hooks/useUrlState'
import { api } from '@/lib/api'
import { ago, CATEGORY_LABELS, dateTime, phone, rupees } from '@/lib/format'
import { PageHeader } from '../AdminLayout'

export default function Jobs() {
  const [f, set] = useUrlState({ status: '' })
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const { data, error, loading, reload } = useApi('/admin/jobs', { status: f.status, category: f.category, q: f.q, flagged: f.flagged, page: f.page }, { live: ['jobs', 'reports'] })
  const [open, setOpen] = useState(null)
  const [hideOpen, setHideOpen] = useState(false)
  const [reason, setReason] = useState('')

  async function setStatus(job, status) {
    const ok = await run(() => api(`/admin/jobs/${job.id}`, { method: 'PATCH', body: { status, reason } }), status === 'hidden' ? 'Job hidden from the app' : 'Job restored')
    if (ok) {
      setHideOpen(false)
      setOpen(null)
      setReason('')
      reload()
    }
  }

  return (
    <div>
      <PageHeader title="Job posts" subtitle="Jobs go live as soon as an owner posts them. Hide anything misleading or against the rules." />
      <Card>
        <Tabs
          className="px-3"
          value={f.flagged === 'true' ? 'flagged' : f.status}
          onChange={(v) => (v === 'flagged' ? set({ flagged: 'true', status: '' }) : set({ status: v, flagged: '' }))}
          tabs={[
            { value: '', label: 'All' },
            { value: 'active', label: 'Live' },
            { value: 'flagged', label: 'Reported' },
            { value: 'hidden', label: 'Hidden' },
            { value: 'paused', label: 'Paused' },
            { value: 'closed', label: 'Closed' },
          ]}
        />
        <Toolbar right={<span className="tabular">{data ? `${data.total} jobs` : ''}</span>}>
          <SearchInput value={f.q} onChange={(v) => set({ q: v })} placeholder="Title, area or vehicle" />
          <FilterSelect icon={Truck} value={f.category ?? ''} onChange={(v) => set({ category: v })} placeholder="Vehicle: any" options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
        </Toolbar>
        <ErrorNote error={error} onRetry={reload} />
        <Table
          loading={loading}
          rows={data?.items}
          onRowClick={setOpen}
          empty={<EmptyState icon={Briefcase} title="No job posts" />}
          columns={[
            {
              key: 'title',
              title: 'Job',
              render: (j) => (
                <div className="max-w-[340px]">
                  <div className="truncate font-semibold text-ink">{j.title}</div>
                  <div className="truncate text-[12px] text-ink-500">
                    {CATEGORY_LABELS[j.category] ?? j.category} · {j.area}
                  </div>
                </div>
              ),
            },
            { key: 'owner', title: 'Owner', render: (j) => <Identity size={28} name={j.owner?.company || j.owner?.name || '—'} sub={phone(j.owner?.phone)} /> },
            { key: 'pay', title: 'Pay', render: (j) => <span className="tabular">{rupees(j.pay)}{j.payType === 'trip' ? '/trip' : '/mo'}</span> },
            { key: 'applicants', title: 'Applicants', align: 'right', render: (j) => <span className="tabular">{j.applicants}</span> },
            { key: 'reports', title: 'Reports', align: 'right', render: (j) => (j.reports ? <Badge tone="red">{j.reports}</Badge> : <span className="text-ink-400">0</span>) },
            { key: 'createdAt', title: 'Posted', render: (j) => <span className="text-ink-500">{ago(j.createdAt)}</span> },
            { key: 'status', title: 'Status', render: (j) => <StatusBadge status={j.status} label={j.status === 'active' ? 'Live' : undefined} /> },
          ]}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={(p) => set({ page: p })} />
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.title}
        subtitle={open && <StatusBadge status={open.status} label={open.status === 'active' ? 'Live' : undefined} />}
        width="max-w-xl"
        footer={
          open &&
          (open.status === 'hidden' ? (
            <Button icon={RotateCcw} onClick={() => setStatus(open, 'active')} loading={busy}>
              Restore
            </Button>
          ) : (
            <Button variant="danger" icon={EyeOff} onClick={() => setHideOpen(true)}>
              Hide from app
            </Button>
          ))
        }
      >
        {open && (
          <Card className="p-5">
            {open.status === 'hidden' && open.hiddenReason && <p className="mb-4 rounded-lg bg-red-soft px-3 py-2 text-sm text-red-text">Hidden: {open.hiddenReason}</p>}
            <KeyValue
              items={[
                ['Owner', `${open.owner?.company || open.owner?.name || '-'} (${phone(open.owner?.phone)})`],
                ['Vehicle', `${CATEGORY_LABELS[open.category] ?? open.category} · ${open.vehicle} ${open.vehicleNo ? `· ${open.vehicleNo}` : ''}`],
                ['Pay', `${rupees(open.pay)} ${open.payType === 'trip' ? 'per trip' : 'per month'} ${open.allowance || ''}`],
                ['Area', open.area],
                ['Route', open.route],
                ['Duty', open.duty],
                ['Licence', open.licence],
                ['Experience', open.experience],
                ['Food / stay', open.stay],
                ['Start', open.start],
                open.idleAllowance?.amount != null && ['Idle allowance', `${rupees(open.idleAllowance.amount)}/day after ${open.idleAllowance.afterHours ?? 0} hrs`],
                open.mileage && ['Diesel mileage', `${open.mileage} km/litre`],
                (open.bonus?.amount || open.bonus?.details) && ['Bonus', `${open.bonus.amount ? rupees(open.bonus.amount) : ''} ${open.bonus.details || ''}`.trim()],
                ['Applicants', String(open.applicants)],
                ['Posted', dateTime(open.createdAt)],
              ]}
            />
          </Card>
        )}
      </Drawer>

      <ConfirmModal
        open={hideOpen}
        onClose={() => setHideOpen(false)}
        onConfirm={() => setStatus(open, 'hidden')}
        title="Hide this job?"
        text="Drivers will no longer see it. The owner is notified with your reason."
        confirmLabel="Hide job"
        variant="danger"
        loading={busy}
      >
        <Field label="Reason (sent to the owner)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Salary looks misleading" />
        </Field>
      </ConfirmModal>
    </div>
  )
}
