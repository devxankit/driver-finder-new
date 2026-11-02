import { useState } from 'react'
import { Ban, CalendarPlus, Check, FileText, Phone, ShieldCheck, X } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmModal,
  Drawer,
  ErrorNote,
  Field,
  Input,
  KeyValue,
  Modal,
  PageLoader,
  Select,
  StatusBadge,
  Textarea,
  useToast,
} from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { api, fileUrl } from '@/lib/api'
import { CATEGORY_LABELS, DOC_LABELS, date, dateTime, phone, rupees } from '@/lib/format'
import DocViewer from './DocViewer'

const REJECT_REASONS = [
  'Photo is blurry. Please take it again in good light.',
  'Document is cut off. Please keep all four corners inside the frame.',
  'Name on the document does not match your profile name.',
  'Document has expired. Please upload a valid one.',
  'Wrong document uploaded.',
]

function Section({ title, children, action }) {
  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
        <h3 className="text-sm font-bold">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

/** Everything about one driver or owner, plus the KYC decision. */
export default function UserDrawer({ userId, onClose, onChanged }) {
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const { data, error, loading, reload } = useApi(userId ? `/admin/users/${userId}` : null)
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

  const u = data?.user
  const docs = data?.documents ?? []
  const isOwner = u?.role === 'owner'

  async function approve() {
    const ok = await run(() => api(`/admin/kyc/${userId}/approve`, { method: 'POST' }), `${u.name || 'User'} approved`)
    if (ok) changed()
  }
  async function reject() {
    const ok = await run(() => api(`/admin/kyc/${userId}/reject`, { method: 'POST', body: { reason, docs: retake } }), 'Rejected. The user was notified.')
    if (ok) {
      setRejectOpen(false)
      changed()
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

  const activeSub = data?.subscriptions?.find((s) => s.active)

  return (
    <Drawer
      open={Boolean(userId)}
      onClose={onClose}
      title={u ? u.name || 'No name yet' : 'Loading…'}
      subtitle={
        u && (
          <span className="inline-flex flex-wrap items-center gap-2">
            {isOwner ? 'Vehicle owner' : u.role === 'driver' ? 'Driver' : 'Role not chosen'} · {phone(u.phone)}
            <StatusBadge status={u.kyc} />
            {u.status === 'suspended' && <StatusBadge status="suspended" />}
          </span>
        )
      }
      footer={
        u && (
          <>
            {u.status === 'active' ? (
              <Button variant="ghost" icon={Ban} onClick={() => setSuspendOpen(true)}>
                Suspend
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setStatus('active')} loading={busy}>
                Re-activate
              </Button>
            )}
            <div className="flex-1" />
            {(u.kyc === 'pending' || u.kyc === 'rejected' || u.kyc === 'approved') && (
              <Button variant="outline" icon={X} onClick={() => { setRetake([]); setRejectOpen(true) }} disabled={!docs.length}>
                {u.kyc === 'approved' ? 'Revoke' : 'Reject'}
              </Button>
            )}
            {u.kyc !== 'approved' && (
              <Button variant="success" icon={Check} onClick={approve} loading={busy} disabled={data.missingDocs.length > 0}>
                Approve
              </Button>
            )}
          </>
        )
      }
    >
      {loading && !data ? (
        <PageLoader />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : u ? (
        <>
          <div className="mb-4 flex items-center gap-4">
            <Avatar src={fileUrl(u.photo)} name={u.name || u.phone} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                {u.categories?.map((c) => (
                  <Badge key={c}>{CATEGORY_LABELS[c] ?? c}</Badge>
                ))}
                {activeSub ? <Badge tone="green">Plan till {date(activeSub.expiresAt)}</Badge> : <Badge>No active plan</Badge>}
                {u.registration?.paid ? <Badge tone="green">Registration paid</Badge> : u.role ? <Badge tone="amber">Registration not paid</Badge> : null}
              </div>
              <a href={`tel:+91${u.phone}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:underline">
                <Phone className="size-3.5" /> {phone(u.phone)}
              </a>
            </div>
          </div>

          {u.kycDetail?.status === 'rejected' && u.kycDetail.reason && (
            <div className="mb-4 rounded-xl border border-red/20 bg-red-soft px-4 py-3 text-sm text-red-text">
              <b>Rejected:</b> {u.kycDetail.reason}
            </div>
          )}
          {u.status === 'suspended' && (
            <div className="mb-4 rounded-xl border border-red/20 bg-red-soft px-4 py-3 text-sm text-red-text">
              <b>Suspended</b>
              {u.suspendReason ? `: ${u.suspendReason}` : ''}
            </div>
          )}

          <Section
            title="KYC documents"
            action={data.missingDocs.length ? <Badge tone="red">{data.missingDocs.length} missing</Badge> : docs.length ? <Badge tone="green">All uploaded</Badge> : null}
          >
            {docs.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {docs.map((d, i) => (
                  <button key={d.id} onClick={() => setViewer(i)} className="group overflow-hidden rounded-xl border border-ink-200 bg-ink-50 text-left hover:border-ink">
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-ink-100">
                      {d.mime === 'application/pdf' ? (
                        <FileText className="size-8 text-ink-400" />
                      ) : (
                        <img
                          src={fileUrl(d.url, { withToken: true })}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover transition group-hover:scale-105"
                          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                        />
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2 px-3 py-2">
                      <span className="text-xs leading-snug font-semibold">{DOC_LABELS[d.key] ?? d.key}</span>
                      <StatusBadge status={d.status === 'uploaded' ? 'pending' : d.status} label={d.status === 'uploaded' ? 'New' : undefined} />
                    </div>
                  </button>
                ))}
                {data.missingDocs.map((k) => (
                  <div key={k} className="flex flex-col justify-center rounded-xl border border-dashed border-ink-300 p-3 text-xs text-ink-500">
                    <b className="text-ink-700">{DOC_LABELS[k] ?? k}</b>
                    Not uploaded yet
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">No documents uploaded yet.</p>
            )}
          </Section>

          <Section title={isOwner ? 'Business' : 'Driver profile'}>
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
                  ['Pay', `${u.driver?.payPref === 'trip' ? 'Per trip' : u.driver?.payPref === 'both' ? 'Monthly or per trip' : 'Monthly'}${u.driver?.expectedPay ? `, ${u.driver.expectedPay}` : ''}`],
                  ['Work', u.driver?.fullTime === false ? 'Part-time' : 'Full-time'],
                  ['Languages', u.driver?.languages],
                  ['Vehicle types', u.driver?.types?.join(', ')],
                  ['Wants to drive in', u.driver?.preferredLocations?.join(', ')],
                ]}
              />
            )}
            <div className="mt-4 border-t border-ink-100 pt-3">
              <KeyValue
                items={[
                  ['Joined', date(u.createdAt)],
                  ['Last seen', dateTime(u.lastSeenAt)],
                  ['KYC sent', dateTime(u.kycDetail?.submittedAt)],
                  ['App language', u.lang],
                ]}
              />
            </div>
          </Section>

          <Section
            title="Subscription"
            action={
              <Button variant="outline" size="sm" icon={CalendarPlus} onClick={() => setGrantOpen(true)} disabled={!u.role}>
                Extend / give plan
              </Button>
            }
          >
            {data.subscriptions.length ? (
              <ul className="divide-y divide-ink-100 text-sm">
                {data.subscriptions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <b>{s.planName}</b> <span className="text-ink-500">({s.source === 'admin' ? 'given by admin' : 'paid'})</span>
                    </span>
                    <span className="text-ink-500">
                      {date(s.startsAt)} → {date(s.expiresAt)}
                    </span>
                    <StatusBadge status={s.active ? 'active' : 'expired'} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">Has not bought a plan yet.</p>
            )}
            {data.payments.length > 0 && (
              <div className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
                Payments: {data.payments.filter((p) => p.status === 'paid').length} paid,{' '}
                {rupees(data.payments.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount, 0))} total
              </div>
            )}
          </Section>

          {isOwner ? (
            <>
              <Section title={`Vehicles (${data.vehicles.length})`}>
                {data.vehicles.length ? (
                  <ul className="divide-y divide-ink-100 text-sm">
                    {data.vehicles.map((v) => (
                      <li key={v.id} className="flex justify-between py-2">
                        <span>
                          <b>{v.number}</b> · {v.model}
                        </span>
                        <span className="text-ink-500">
                          {CATEGORY_LABELS[v.category] ?? v.category} {v.year && `· ${v.year}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-500">No vehicles added.</p>
                )}
              </Section>
              <Section title={`Job posts (${data.jobs.length})`}>
                {data.jobs.length ? (
                  <ul className="divide-y divide-ink-100 text-sm">
                    {data.jobs.map((j) => (
                      <li key={j.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="truncate">{j.title}</span>
                        <span className="shrink-0 text-xs text-ink-500">{j.applicants} applicants</span>
                        <StatusBadge status={j.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-500">No jobs posted.</p>
                )}
              </Section>
            </>
          ) : u.role === 'driver' ? (
            <Section title={`Applications (${data.applications.length})`}>
              {data.applications.length ? (
                <ul className="divide-y divide-ink-100 text-sm">
                  {data.applications.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate">{a.job?.title ?? 'Job removed'}</span>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500">No applications yet.</p>
              )}
            </Section>
          ) : null}

          <p className="text-xs text-ink-500">
            {data.counts.connections} connections · {data.counts.requests} hiring requests · {data.counts.reports} reports against this user
          </p>

          {viewer !== null && <DocViewer docs={docs} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} compareWith={fileUrl(u.photo)} />}

          <Modal
            open={rejectOpen}
            onClose={() => setRejectOpen(false)}
            title={u.kyc === 'approved' ? 'Revoke verification' : 'Reject KYC'}
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
                    <label key={d.key} className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm">
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
            <Field label="Reason (shown to the user)" className="mt-4">
              <Input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="e.g. Fake documents" />
            </Field>
          </ConfirmModal>

          <ConfirmModal open={grantOpen} onClose={() => setGrantOpen(false)} onConfirm={grant} title="Extend or give a plan" confirmLabel="Give plan" loading={busy}>
            <p className="text-sm text-ink-600">Adds days after their current plan ends (or from today). No payment is taken; it is recorded as given by admin.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Days">
                <Select value={String(days)} onChange={(e) => setDays(e.target.value)} options={['7', '15', '30', '90', '180', '365'].map((d) => ({ value: d, label: `${d} days` }))} />
              </Field>
              <Field label="Note (internal)">
                <Input value={grantNote} onChange={(e) => setGrantNote(e.target.value)} placeholder="e.g. Payment issue, goodwill" />
              </Field>
            </div>
          </ConfirmModal>
        </>
      ) : null}
      {u?.kyc === 'approved' && (
        <div className="mt-4 flex items-center gap-2 text-xs text-green-text">
          <ShieldCheck className="size-4" /> Verified {dateTime(u.kycDetail?.reviewedAt)}
        </div>
      )}
    </Drawer>
  )
}
