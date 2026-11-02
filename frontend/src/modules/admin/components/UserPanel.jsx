import { useState } from 'react'
import {
  AlertTriangle,
  Ban,
  BriefcaseBusiness,
  CalendarPlus,
  Car,
  Check,
  Copy,
  FileText,
  Handshake,
  Maximize2,
  Phone,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  ConfirmModal,
  ErrorNote,
  Field,
  IconButton,
  Input,
  KeyValue,
  Modal,
  Select,
  Skeleton,
  StatusBadge,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { api, fileUrl } from '@/lib/api'
import { ago, CATEGORY_LABELS, cn, DOC_LABELS, date, dateTime, phone, rupees } from '@/lib/format'
import DocViewer from './DocViewer'

const REJECT_REASONS = [
  'Photo is blurry. Please take it again in good light.',
  'Document is cut off. Please keep all four corners inside the frame.',
  'Name on the document does not match your profile name.',
  'Document has expired. Please upload a valid one.',
  'Wrong document uploaded.',
]

function Section({ title, action, children, className }) {
  return (
    <section className={cn('rounded-xl border border-ink-200/80 bg-white shadow-card', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
        <h3 className="text-[13.5px] font-semibold tracking-tight">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Notice({ tone = 'red', title, children }) {
  const cls = tone === 'red' ? 'border-red/15 bg-red-soft text-red-text' : 'border-amber/20 bg-amber-soft text-amber-text'
  return (
    <div className={cn('flex gap-2.5 rounded-xl border px-4 py-3 text-[13px]', cls)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <b className="font-semibold">{title}</b>
        {children && <span className="opacity-90"> {children}</span>}
      </div>
    </div>
  )
}

function Row({ children, right }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
      <span className="min-w-0 truncate">{children}</span>
      <span className="flex shrink-0 items-center gap-2">{right}</span>
    </li>
  )
}

function DocTile({ d, onOpen }) {
  const isPdf = d.mime === 'application/pdf'
  const [broken, setBroken] = useState(false)
  return (
    <button onClick={onOpen} className="group overflow-hidden rounded-xl border border-ink-200 bg-white text-left transition hover:border-ink-400 hover:shadow-soft">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-ink-50">
        {isPdf || broken ? (
          <span className="flex flex-col items-center gap-1 text-[11px] text-ink-400">
            <FileText className="size-7" />
            {broken ? 'Preview not available' : 'PDF'}
          </span>
        ) : (
          <img src={fileUrl(d.url, { withToken: true })} alt="" loading="lazy" onError={() => setBroken(true)} className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        )}
        <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-white/90 text-ink-700 opacity-0 shadow-card transition group-hover:opacity-100">
          <Maximize2 className="size-3.5" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-ink-100 px-3 py-2">
        <span className="truncate text-[12px] font-semibold">{DOC_LABELS[d.key] ?? d.key}</span>
        <StatusBadge status={d.status === 'uploaded' ? 'pending' : d.status} label={d.status === 'uploaded' ? 'New' : undefined} />
      </div>
    </button>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  )
}

/**
 * Everything about one driver or owner, plus the KYC decision.
 * Used inline in the KYC workspace and inside a slide-over everywhere else.
 */
export default function UserPanel({ userId, onClose, onChanged, onDecided }) {
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const { data, error, loading, reload } = useApi(userId ? `/admin/users/${userId}` : null, undefined, { live: ['kyc', 'users'] })
  const [tab, setTab] = useState('overview')
  const [viewer, setViewer] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState(REJECT_REASONS[0])
  const [retake, setRetake] = useState([])
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [grantOpen, setGrantOpen] = useState(false)
  const [days, setDays] = useState(30)
  const [grantNote, setGrantNote] = useState('')

  const changed = () => {
    reload()
    onChanged?.()
  }

  if (!userId) return null
  if (error) return (
    <div className="p-6">
      <ErrorNote error={error} onRetry={reload} />
    </div>
  )
  if ((loading && !data) || !data?.user || data.user.id !== userId) return <PanelSkeleton />

  const u = data.user
  const docs = data.documents ?? []
  const isOwner = u.role === 'owner'
  const activeSub = data.subscriptions?.find((s) => s.active)
  const paid = data.payments.filter((p) => p.status === 'paid')

  async function approve() {
    const ok = await run(() => api(`/admin/kyc/${userId}/approve`, { method: 'POST' }), `${u.name || 'User'} is now verified`)
    if (ok) {
      changed()
      onDecided?.()
    }
  }
  async function reject() {
    const ok = await run(() => api(`/admin/kyc/${userId}/reject`, { method: 'POST', body: { reason, docs: retake } }), 'Sent back. The user was notified in the app.')
    if (ok) {
      setRejectOpen(false)
      changed()
      onDecided?.()
    }
  }
  async function setStatus(status) {
    const ok = await run(
      () => api(`/admin/users/${userId}/status`, { method: 'PATCH', body: { status, reason: suspendReason } }),
      status === 'suspended' ? 'Account suspended' : 'Account re-activated'
    )
    if (ok) {
      setSuspendOpen(false)
      changed()
    }
  }
  async function grant() {
    const ok = await run(() => api('/admin/subscriptions/grant', { method: 'POST', body: { userId, days: Number(days), note: grantNote } }), `Plan extended by ${days} days`)
    if (ok) {
      setGrantOpen(false)
      changed()
    }
  }
  const copyPhone = () => {
    navigator.clipboard?.writeText(`+91${u.phone}`)
    toast('Phone number copied')
  }

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'plan', label: 'Plan & payments', count: data.subscriptions.length || undefined },
    isOwner ? { value: 'activity', label: 'Vehicles & jobs', count: data.vehicles.length + data.jobs.length || undefined } : u.role === 'driver' ? { value: 'activity', label: 'Applications', count: data.applications.length || undefined } : null,
  ].filter(Boolean)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="border-b border-ink-200 bg-white px-6 pt-5">
        <div className="flex items-start gap-4">
          <Avatar src={fileUrl(u.photo)} name={u.name || u.phone} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[18px] font-semibold tracking-tight">{u.name || 'No name yet'}</h2>
              <StatusBadge status={u.kyc} />
              {u.status === 'suspended' && <StatusBadge status="suspended" />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
              <span>{isOwner ? (u.owner?.type === 'fleet' ? 'Fleet owner' : 'Vehicle owner') : u.role === 'driver' ? 'Driver' : 'Role not chosen'}</span>
              {u.city && <span>· {u.city}</span>}
              <span className="inline-flex items-center gap-1">
                ·
                <a href={`tel:+91${u.phone}`} className="inline-flex items-center gap-1 font-medium text-ink-700 hover:underline">
                  <Phone className="size-3" /> {phone(u.phone)}
                </a>
                <button onClick={copyPhone} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Copy phone number">
                  <Copy className="size-3" />
                </button>
              </span>
            </div>
          </div>
          {onClose && <IconButton icon={X} label="Close" onClick={onClose} />}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 text-center">
          {[
            ['Joined', date(u.createdAt)],
            ['Last seen', ago(u.lastSeenAt)],
            ['Plan', activeSub ? `Till ${date(activeSub.expiresAt)}` : 'None'],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink-50/60 px-3 py-2">
              <div className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-400 uppercase">{k}</div>
              <div className="mt-0.5 truncate text-[13px] font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <Tabs className="mt-3 border-none" value={tab} onChange={setTab} tabs={tabs} />
      </header>

      {/* Body */}
      <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto bg-canvas p-6">
        {u.kycDetail?.status === 'rejected' && u.kycDetail.reason && <Notice title="KYC was sent back:">{u.kycDetail.reason}</Notice>}
        {u.status === 'suspended' && <Notice title="Account suspended.">{u.suspendReason}</Notice>}
        {u.role && !u.registration?.paid && <Notice tone="amber" title="Registration fee not paid yet." />}

        {tab === 'overview' && (
          <>
            <Section
              title="KYC documents"
              action={data.missingDocs.length ? <Badge tone="red" dot>{data.missingDocs.length} missing</Badge> : docs.length ? <Badge tone="green" dot>All uploaded</Badge> : null}
            >
              {docs.length || data.missingDocs.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {docs.map((d, i) => (
                    <DocTile key={d.id} d={d} onOpen={() => setViewer(i)} />
                  ))}
                  {data.missingDocs.map((k) => (
                    <div key={k} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-300 bg-white/60 p-3 text-center text-[12px] text-ink-500">
                      <FileText className="size-5 text-ink-300" />
                      <b className="font-semibold text-ink-700">{DOC_LABELS[k] ?? k}</b>
                      Not uploaded yet
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-ink-500">No documents uploaded yet.</p>
              )}
              {docs.length > 0 && <p className="mt-3 text-[12px] text-ink-400">Click a document to zoom, rotate and compare it with the profile photo.</p>}
            </Section>

            <Section title={isOwner ? 'Business details' : 'Driver profile'}>
              {isOwner ? (
                <KeyValue items={[['Name', u.name], ['Business name', u.owner?.company], ['Type', u.owner?.type === 'fleet' ? 'Fleet / company' : 'Individual'], ['City', u.city]]} />
              ) : (
                <KeyValue
                  items={[
                    ['Name', u.name],
                    ['City', u.city],
                    ['Experience', u.driver?.experience != null ? `${u.driver.experience} years` : ''],
                    ['Licence', u.driver?.licence?.join(', ')],
                    ['Vehicles', u.driver?.categories?.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')],
                    ['Vehicle types', u.driver?.types?.join(', ')],
                    ['Pay', `${u.driver?.payPref === 'trip' ? 'Per trip' : u.driver?.payPref === 'both' ? 'Monthly or per trip' : 'Monthly'}${u.driver?.expectedPay ? `, ${u.driver.expectedPay}` : ''}`],
                    ['Work', u.driver?.fullTime === false ? 'Part-time' : 'Full-time'],
                    ['Languages', u.driver?.languages],
                    ['Wants to drive in', u.driver?.preferredLocations?.join(', ')],
                  ]}
                />
              )}
              <div className="mt-4 border-t border-ink-100 pt-4">
                <KeyValue
                  cols={3}
                  items={[
                    ['KYC sent', dateTime(u.kycDetail?.submittedAt)],
                    ['Reviewed', dateTime(u.kycDetail?.reviewedAt)],
                    ['App language', u.lang],
                  ]}
                />
              </div>
            </Section>

            <div className="grid grid-cols-3 gap-3">
              {[
                [Handshake, 'Connections', data.counts.connections],
                [BriefcaseBusiness, 'Hiring requests', data.counts.requests],
                [AlertTriangle, 'Reports against', data.counts.reports],
              ].map(([Icon, k, v]) => (
                <div key={k} className="rounded-xl border border-ink-200/80 bg-white px-4 py-3 shadow-card">
                  <Icon className={cn('size-4', k === 'Reports against' && v ? 'text-red' : 'text-ink-400')} />
                  <div className="mt-2 text-[20px] leading-none font-bold tabular">{v}</div>
                  <div className="mt-1 text-[12px] text-ink-500">{k}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'plan' && (
          <Section
            title="Subscriptions"
            action={
              <Button variant="outline" size="sm" icon={CalendarPlus} onClick={() => setGrantOpen(true)} disabled={!u.role}>
                Extend / give plan
              </Button>
            }
          >
            {data.subscriptions.length ? (
              <ul className="divide-y divide-ink-100">
                {data.subscriptions.map((s) => (
                  <Row key={s.id} right={<StatusBadge status={s.active ? 'active' : 'expired'} />}>
                    <b className="font-semibold">{s.planName}</b>
                    <span className="text-ink-500">
                      {' '}
                      · {date(s.startsAt)} → {date(s.expiresAt)} · {s.source === 'admin' ? 'given by admin' : 'paid'}
                    </span>
                  </Row>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-500">Has not bought a plan yet.</p>
            )}
            {data.payments.length > 0 && (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <div className="mb-1 text-[11.5px] font-semibold tracking-wide text-ink-500 uppercase">Payments · {rupees(paid.reduce((a, p) => a + p.amount, 0))} paid</div>
                <ul className="divide-y divide-ink-100">
                  {data.payments.map((p) => (
                    <Row key={p.id} right={<StatusBadge status={p.status} />}>
                      <b className="font-semibold tabular">{rupees(p.amount)}</b>
                      <span className="text-ink-500"> · {p.planName || 'Registration fee'} · {dateTime(p.createdAt)}</span>
                    </Row>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {tab === 'activity' && isOwner && (
          <>
            <Section title={`Vehicles (${data.vehicles.length})`}>
              {data.vehicles.length ? (
                <ul className="divide-y divide-ink-100">
                  {data.vehicles.map((v) => (
                    <Row key={v.id} right={<span className="text-ink-500">{CATEGORY_LABELS[v.category] ?? v.category}{v.year && ` · ${v.year}`}</span>}>
                      <Car className="mr-2 inline size-3.5 text-ink-400" />
                      <b className="font-semibold">{v.number}</b> <span className="text-ink-500">· {v.model}</span>
                    </Row>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-ink-500">No vehicles added.</p>
              )}
            </Section>
            <Section title={`Job posts (${data.jobs.length})`}>
              {data.jobs.length ? (
                <ul className="divide-y divide-ink-100">
                  {data.jobs.map((j) => (
                    <Row key={j.id} right={<><span className="text-[12px] text-ink-500">{j.applicants} applicants</span><StatusBadge status={j.status} /></>}>
                      {j.title}
                    </Row>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-ink-500">No jobs posted.</p>
              )}
            </Section>
          </>
        )}

        {tab === 'activity' && u.role === 'driver' && (
          <Section title={`Applications (${data.applications.length})`}>
            {data.applications.length ? (
              <ul className="divide-y divide-ink-100">
                {data.applications.map((a) => (
                  <Row key={a.id} right={<><span className="text-[12px] text-ink-500">{ago(a.createdAt)}</span><StatusBadge status={a.status} /></>}>
                    {a.job?.title ?? 'Job removed'}
                  </Row>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-500">No applications yet.</p>
            )}
          </Section>
        )}
      </div>

      {/* Decision bar */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-ink-200 bg-white px-6 py-3">
        {u.status === 'active' ? (
          <Button variant="ghost" size="sm" icon={Ban} onClick={() => setSuspendOpen(true)}>
            Suspend
          </Button>
        ) : (
          <Button variant="outline" size="sm" icon={RotateCcw} onClick={() => setStatus('active')} loading={busy}>
            Re-activate
          </Button>
        )}
        <div className="flex-1" />
        {u.kyc === 'approved' && (
          <span className="mr-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-green-text">
            <ShieldCheck className="size-4" /> Verified {date(u.kycDetail?.reviewedAt)}
          </span>
        )}
        {['pending', 'rejected', 'approved'].includes(u.kyc) && (
          <Button
            variant={u.kyc === 'approved' ? 'outline' : 'danger-soft'}
            icon={X}
            onClick={() => {
              setRetake([])
              setRejectOpen(true)
            }}
            disabled={!docs.length}
          >
            {u.kyc === 'approved' ? 'Revoke' : 'Reject'}
          </Button>
        )}
        {u.kyc !== 'approved' && (
          <Button variant="success" icon={Check} onClick={approve} loading={busy} disabled={data.missingDocs.length > 0} title={data.missingDocs.length ? 'Some documents are missing' : undefined}>
            Approve
          </Button>
        )}
      </footer>

      {viewer !== null && <DocViewer docs={docs} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} compareWith={fileUrl(u.photo)} />}

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={u.kyc === 'approved' ? 'Revoke verification' : 'Send KYC back'}
        description="The user gets a notification with your reason and can upload again from the app."
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reject} loading={busy} disabled={!reason.trim()}>
              Send to user
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Which documents must be taken again?" hint="Only these open again in the app; the others stay.">
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {docs.map((d) => (
                <label key={d.key} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition', retake.includes(d.key) ? 'border-ink-400 bg-ink-50' : 'border-ink-200 hover:border-ink-300')}>
                  <input
                    type="checkbox"
                    className="size-4 accent-ink"
                    checked={retake.includes(d.key)}
                    onChange={(e) => setRetake((x) => (e.target.checked ? [...x, d.key] : x.filter((k) => k !== d.key)))}
                  />
                  {DOC_LABELS[d.key] ?? d.key}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Reason (the user sees this in the app)">
            <Select options={REJECT_REASONS} value={REJECT_REASONS.includes(reason) ? reason : ''} placeholder="Write my own…" onChange={(e) => setReason(e.target.value)} />
            <Textarea className="mt-2" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={() => setStatus('suspended')}
        title="Suspend this account?"
        text="They are signed out, cannot log in, and their job posts leave the feed until you re-activate them."
        confirmLabel="Suspend"
        variant="danger"
        loading={busy}
      >
        <Field label="Reason (shown to the user)">
          <Input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="e.g. Fake documents" />
        </Field>
      </ConfirmModal>

      <ConfirmModal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        onConfirm={grant}
        title="Extend or give a plan"
        text="Adds days after their current plan ends (or from today). No payment is taken; it is recorded as given by admin."
        confirmLabel="Give plan"
        loading={busy}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Days">
            <Select value={String(days)} onChange={(e) => setDays(e.target.value)} options={['7', '15', '30', '90', '180', '365'].map((d) => ({ value: d, label: `${d} days` }))} />
          </Field>
          <Field label="Note (internal)">
            <Input value={grantNote} onChange={(e) => setGrantNote(e.target.value)} placeholder="e.g. Payment issue, goodwill" />
          </Field>
        </div>
      </ConfirmModal>
    </div>
  )
}
