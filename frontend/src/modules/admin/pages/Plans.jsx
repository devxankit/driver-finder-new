import { useState } from 'react'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, ConfirmModal, ErrorNote, Field, Input, Modal, PageLoader, Select, Textarea, Toggle, useToast } from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { rupees } from '@/lib/format'
import { PageHeader } from '../AdminLayout'
import { useAuth } from '../auth'

const EMPTY = { role: 'driver', name: '', months: 1, price: 0, note: '', tag: '', benefits: [], order: 0, active: true }

function PlanCard({ p, onEdit, canEdit }) {
  return (
    <Card className={`flex flex-col p-5 ${p.active ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-bold">{p.name}</div>
          <div className="text-xs text-ink-500">{p.note}</div>
        </div>
        <div className="flex gap-1.5">
          {p.tag && <Badge tone="yellow">{p.tag}</Badge>}
          {!p.active && <Badge>Off</Badge>}
        </div>
      </div>
      <div className="mt-4 text-3xl font-extrabold tracking-tight tabular">{p.price ? rupees(p.price) : <span className="text-lg text-ink-500">Price at launch</span>}</div>
      <div className="text-xs text-ink-500">
        for {p.months} {p.months === 1 ? 'month' : 'months'}
        {p.price > 0 && p.months > 1 && ` · ${rupees(Math.round(p.price / p.months))}/month`}
      </div>
      <ul className="mt-4 flex-1 space-y-1.5 text-[13px] text-ink-600">
        {p.benefits.map((b) => (
          <li key={b} className="flex gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-green" />
            {b}
          </li>
        ))}
      </ul>
      {canEdit && (
        <Button variant="outline" size="sm" icon={Pencil} className="mt-4" onClick={() => onEdit(p)}>
          Edit
        </Button>
      )}
    </Card>
  )
}

export default function Plans() {
  const { isSuper } = useAuth()
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const { data, error, loading, reload } = useApi('/admin/plans')
  const [form, setForm] = useState(null)
  const [del, setDel] = useState(false)

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  async function save() {
    const body = { ...form, months: Number(form.months), price: Number(form.price), order: Number(form.order), benefits: (form.benefitsText ?? '').split('\n').map((s) => s.trim()).filter(Boolean) }
    delete body.benefitsText
    delete body.id
    delete body.createdAt
    delete body.updatedAt
    delete body.__v
    const ok = await run(() => api(form.id ? `/admin/plans/${form.id}` : '/admin/plans', { method: form.id ? 'PUT' : 'POST', body }), 'Plan saved. The app shows it right away.')
    if (ok) {
      setForm(null)
      reload()
    }
  }
  async function remove() {
    const ok = await run(() => api(`/admin/plans/${form.id}`, { method: 'DELETE' }), 'Plan deleted')
    if (ok) {
      setDel(false)
      setForm(null)
      reload()
    }
  }

  if (loading && !data) return <PageLoader />
  const plans = data?.items ?? []

  return (
    <div>
      <PageHeader
        title="Subscription plans"
        subtitle="Drivers and owners have separate plans. Browsing is free; a plan unlocks applying, connecting, chat and phone numbers."
        actions={
          isSuper && (
            <Button icon={Plus} onClick={() => setForm({ ...EMPTY, benefitsText: '' })}>
              New plan
            </Button>
          )
        }
      />
      <ErrorNote error={error} onRetry={reload} />
      {!isSuper && <p className="mb-4 text-sm text-ink-500">Only a super admin can change plans and prices.</p>}

      {['driver', 'owner'].map((role) => (
        <section key={role} className="mb-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-ink-500 uppercase">{role === 'driver' ? 'Driver plans' : 'Owner plans'}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans
              .filter((p) => p.role === role)
              .map((p) => (
                <PlanCard key={p.id} p={p} canEdit={isSuper} onEdit={(x) => setForm({ ...x, benefitsText: x.benefits.join('\n') })} />
              ))}
          </div>
        </section>
      ))}

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? 'Edit plan' : 'New plan'}
        footer={
          <>
            {form?.id && (
              <Button variant="ghost" icon={Trash2} className="mr-auto text-red" onClick={() => setDel(true)}>
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy} disabled={!form?.name}>
              Save plan
            </Button>
          </>
        }
      >
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="For">
              <Select value={form.role} onChange={upd('role')} options={[{ value: 'driver', label: 'Drivers' }, { value: 'owner', label: 'Vehicle owners' }]} />
            </Field>
            <Field label="Name">
              <Input value={form.name} onChange={upd('name')} placeholder="3 months" />
            </Field>
            <Field label="Duration (months)">
              <Input type="number" min={1} max={36} value={form.months} onChange={upd('months')} />
            </Field>
            <Field label="Price (₹, incl. GST)" hint="0 shows 'Price at launch' and blocks checkout.">
              <Input type="number" min={0} value={form.price} onChange={upd('price')} />
            </Field>
            <Field label="Short note">
              <Input value={form.note} onChange={upd('note')} placeholder="Most people pick this" />
            </Field>
            <Field label="Tag">
              <Input value={form.tag} onChange={upd('tag')} placeholder="Popular / Best value" />
            </Field>
            <Field label="Benefits (one per line)" className="sm:col-span-2">
              <Textarea rows={4} value={form.benefitsText} onChange={upd('benefitsText')} />
            </Field>
            <Field label="Order">
              <Input type="number" value={form.order} onChange={upd('order')} />
            </Field>
            <Field label="Shown in the app">
              <div className="flex h-10 items-center">
                <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
              </div>
            </Field>
          </div>
        )}
      </Modal>
      <ConfirmModal open={del} onClose={() => setDel(false)} onConfirm={remove} title="Delete this plan?" text="Plans that people already bought cannot be deleted; turn them off instead." confirmLabel="Delete" variant="danger" loading={busy} />
    </div>
  )
}
