import { useRef, useState } from 'react'
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ErrorNote, Field, IconButton, Input, Modal, PageLoader, Tabs, Toggle, useToast } from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { api, fileUrl } from '@/lib/api'
import { PageHeader } from '../AdminLayout'

const EMPTY_CAT = { key: '', label: '', hi: '', color: '#FEBE02', typesText: '', order: 0, active: true }

function Categories() {
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const { data, error, loading, reload } = useApi('/admin/categories')
  const [form, setForm] = useState(null)
  const fileRef = useRef(null)
  const [uploadFor, setUploadFor] = useState(null)

  async function save() {
    const body = {
      key: form.key,
      label: form.label,
      labels: form.hi ? { ...(form.labels ?? {}), hi: form.hi } : form.labels ?? {},
      color: form.color,
      types: form.typesText.split(',').map((s) => s.trim()).filter(Boolean),
      order: Number(form.order) || 0,
      active: form.active,
    }
    const ok = await run(() => api(form.id ? `/admin/categories/${form.id}` : '/admin/categories', { method: form.id ? 'PUT' : 'POST', body }), 'Category saved')
    if (ok) {
      setForm(null)
      reload()
    }
  }

  async function upload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uploadFor) return
    const fd = new FormData()
    fd.append('file', file)
    const ok = await run(() => api(`/admin/categories/${uploadFor}/image`, { method: 'POST', body: fd }), 'Image updated')
    if (ok) reload()
  }

  if (loading && !data) return <PageLoader />
  return (
    <>
      <ErrorNote error={error} onRetry={reload} />
      <div className="mb-3 flex justify-end">
        <Button icon={Plus} onClick={() => setForm(EMPTY_CAT)}>
          New category
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((c) => (
          <Card key={c.id} className={`overflow-hidden ${c.active ? '' : 'opacity-60'}`}>
            <div className="relative flex aspect-[16/9] items-center justify-center bg-white">
              {c.image ? <img src={fileUrl(c.image)} alt={c.label} className="size-full object-contain p-3" /> : <span className="text-sm text-ink-400">No image</span>}
              <button
                onClick={() => {
                  setUploadFor(c.id)
                  fileRef.current?.click()
                }}
                className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold shadow-card hover:bg-white"
              >
                <ImagePlus className="size-3.5" /> Change image
              </button>
            </div>
            <div className="border-t border-ink-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: c.color }} />
                  <span className="font-bold">{c.label}</span>
                  {c.labels?.hi && <span className="text-sm text-ink-500">{c.labels.hi}</span>}
                </div>
                <div className="flex items-center gap-1">
                  {!c.active && <Badge>Off</Badge>}
                  <IconButton icon={Pencil} label="Edit" onClick={() => setForm({ ...c, hi: c.labels?.hi ?? '', typesText: c.types.join(', ') })} />
                </div>
              </div>
              <div className="mt-1 text-xs text-ink-500">key: {c.key}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.types.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? `Edit ${form.label}` : 'New vehicle category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy} disabled={!form?.key || !form?.label}>
              Save
            </Button>
          </>
        }
      >
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Key" hint={form.id ? 'Cannot be changed: jobs and drivers use it.' : 'Lowercase, e.g. tractor'}>
              <Input value={form.key} disabled={Boolean(form.id)} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase() }))} />
            </Field>
            <Field label="Label (English)">
              <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </Field>
            <Field label="Label (Hindi)">
              <Input value={form.hi} onChange={(e) => setForm((f) => ({ ...f, hi: e.target.value }))} />
            </Field>
            <Field label="Colour">
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="h-10 w-12 cursor-pointer rounded-lg border border-ink-300" />
                <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
            </Field>
            <Field label="Sub-types (comma separated)" className="sm:col-span-2">
              <Input value={form.typesText} onChange={(e) => setForm((f) => ({ ...f, typesText: e.target.value }))} placeholder="Open body, Container, Trailer" />
            </Field>
            <Field label="Order">
              <Input type="number" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />
            </Field>
            <Field label="Shown in the app">
              <div className="flex h-10 items-center">
                <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </>
  )
}

function SimpleList({ type, title, subtitle, placeholder }) {
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const { data, error, reload } = useApi('/admin/masters', { type }, { live: ['masters'] })
  const [value, setValue] = useState('')
  const [filter, setFilter] = useState('')
  const shown = (data?.items ?? []).filter((m) => !filter.trim() || m.value.toLowerCase().includes(filter.trim().toLowerCase()))

  async function add(e) {
    e.preventDefault()
    const ok = await run(() => api('/admin/masters', { method: 'POST', body: { type, value, order: (data?.items.length ?? 0) + 1 } }), `${value} added`)
    if (ok) {
      setValue('')
      reload()
    }
  }
  async function toggle(m) {
    const ok = await run(() => api(`/admin/masters/${m.id}`, { method: 'PUT', body: { type, value: m.value, order: m.order, active: !m.active } }))
    if (ok) reload()
  }
  async function remove(m) {
    const ok = await run(() => api(`/admin/masters/${m.id}`, { method: 'DELETE' }), `${m.value} removed`)
    if (ok) reload()
  }

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <ErrorNote error={error} onRetry={reload} />
      <form onSubmit={add} className="flex gap-2 border-b border-ink-200 p-4">
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
        <Button type="submit" icon={Plus} loading={busy} disabled={!value.trim()}>
          Add
        </Button>
      </form>
      <div className="flex items-center justify-between gap-2 border-b border-ink-200 px-4 py-2">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Search ${data?.items.length ?? ''} items`} className="h-9" />
      </div>
      <ul className="scroll-thin max-h-[480px] divide-y divide-ink-100 overflow-y-auto">
        {shown.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className={`flex-1 text-sm font-medium ${m.active ? '' : 'text-ink-400 line-through'}`}>{m.value}</span>
            {m.addedBy && <Badge tone="blue">Added by a user</Badge>}
            <Toggle checked={m.active} onChange={() => toggle(m)} label={`Show ${m.value}`} />
            <IconButton icon={Trash2} label="Remove" onClick={() => remove(m)} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Masters() {
  const [tab, setTab] = useState('categories')
  return (
    <div>
      <PageHeader title="Categories & lists" subtitle="What the app offers in its pickers. Changes show in the app the next time it opens." />
      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'categories', label: 'Vehicle categories' },
          { value: 'lists', label: 'Cities & licence types' },
        ]}
      />
      {tab === 'categories' ? (
        <Categories />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <SimpleList type="city" title="Cities" subtitle="Launch cities shown in city pickers" placeholder="Add a city" />
          <SimpleList type="licence" title="Licence types" subtitle="Shown in the driver profile wizard" placeholder="Add a licence type" />
        </div>
      )}
    </div>
  )
}
