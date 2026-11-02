import { useState } from 'react'
import { KeyRound, Pencil, Plus } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ErrorNote, Field, IconButton, Input, Modal, Select, StatusBadge, Table, Toggle, useToast } from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { dateTime } from '@/lib/format'
import { PageHeader } from '../AdminLayout'
import { useAuth } from '../auth'

function ChangePassword() {
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  async function submit(e) {
    e.preventDefault()
    const ok = await run(() => api('/admin/auth/password', { method: 'POST', body: { current, next } }), 'Password changed')
    if (ok) {
      setCurrent('')
      setNext('')
    }
  }
  return (
    <Card className="h-fit">
      <CardHeader title="My password" />
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field label="Current password">
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" hint="At least 8 characters">
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Button type="submit" icon={KeyRound} loading={busy} disabled={!current || next.length < 8}>
          Change password
        </Button>
      </form>
    </Card>
  )
}

function Admins() {
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const { data, error, loading, reload } = useApi('/admin/admins')
  const [form, setForm] = useState(null)

  async function save() {
    const body = { name: form.name, email: form.email, role: form.role, active: form.active, ...(form.password ? { password: form.password } : {}) }
    const ok = await run(() => api(form.id ? `/admin/admins/${form.id}` : '/admin/admins', { method: form.id ? 'PUT' : 'POST', body }), 'Admin saved')
    if (ok) {
      setForm(null)
      reload()
    }
  }

  return (
    <Card>
      <CardHeader
        title="Admin users"
        subtitle="Super admins manage plans, prices and admins. Staff handle KYC, jobs and reports."
        action={
          <Button size="sm" icon={Plus} onClick={() => setForm({ name: '', email: '', password: '', role: 'staff', active: true })}>
            Add admin
          </Button>
        }
      />
      <ErrorNote error={error} onRetry={reload} />
      <Table
        loading={loading}
        rows={data?.items}
        columns={[
          { key: 'name', title: 'Name', render: (a) => <span className="font-semibold text-ink">{a.name}</span> },
          { key: 'email', title: 'Email' },
          { key: 'role', title: 'Role', render: (a) => <Badge tone={a.role === 'super' ? 'dark' : 'neutral'}>{a.role === 'super' ? 'Super admin' : 'Staff'}</Badge> },
          { key: 'active', title: 'Status', render: (a) => <StatusBadge status={a.active ? 'active' : 'suspended'} label={a.active ? 'Active' : 'Disabled'} /> },
          { key: 'lastLoginAt', title: 'Last sign in', render: (a) => dateTime(a.lastLoginAt) },
          { key: 'edit', title: '', align: 'right', render: (a) => <IconButton icon={Pencil} label="Edit" onClick={() => setForm({ ...a, password: '' })} /> },
        ]}
      />
      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? 'Edit admin' : 'Add admin'}
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy} disabled={!form?.name || !form?.email || (!form?.id && (form?.password ?? '').length < 8)}>
              Save
            </Button>
          </>
        }
      >
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label={form.id ? 'New password (optional)' : 'Password'} hint="At least 8 characters">
              <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} options={[{ value: 'staff', label: 'Staff' }, { value: 'super', label: 'Super admin' }]} />
            </Field>
            <Field label="Can sign in">
              <div className="flex h-10 items-center">
                <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </Card>
  )
}

export default function Settings() {
  const { isSuper } = useAuth()
  return (
    <div>
      <PageHeader title="Admin users" subtitle="Who can sign in to this panel." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {isSuper ? <Admins /> : <Card className="p-5 text-sm text-ink-500">Only a super admin can manage admin users.</Card>}
        <ChangePassword />
      </div>
    </div>
  )
}
