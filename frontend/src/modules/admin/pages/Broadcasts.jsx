import { useState } from 'react'
import { Bell, Send } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ConfirmModal, EmptyState, ErrorNote, Field, Input, Table, Tabs, Textarea, useToast } from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { count, dateTime } from '@/lib/format'
import { PageHeader } from '../AdminLayout'

const AUDIENCE = { all: 'Everyone', driver: 'Drivers', owner: 'Vehicle owners' }

export default function Broadcasts() {
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const { data, error, loading, reload } = useApi('/admin/broadcasts')
  const [audience, setAudience] = useState('all')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [confirm, setConfirm] = useState(false)

  async function send() {
    const r = await run(() => api('/admin/broadcasts', { method: 'POST', body: { audience, title, text } }))
    if (r) {
      toast(`Sent to ${count(r.recipients)} people`)
      setConfirm(false)
      setTitle('')
      setText('')
      reload()
    }
  }

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Send a message to the notification inbox in the app." />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="h-fit">
          <CardHeader title="New message" />
          <div className="space-y-4 p-5">
            <Field label="Send to">
              <Tabs value={audience} onChange={setAudience} tabs={Object.entries(AUDIENCE).map(([value, label]) => ({ value, label }))} />
            </Field>
            <Field label="Title" hint={`${title.length}/80`}>
              <Input maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New jobs in Pune" />
            </Field>
            <Field label="Message" hint={`${text.length}/500 · keep it short and simple`}>
              <Textarea maxLength={500} rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="20 new truck driver jobs were posted this week. Open the app to apply." />
            </Field>
            <Button icon={Send} className="w-full" disabled={!title.trim() || !text.trim()} onClick={() => setConfirm(true)}>
              Send
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sent messages" />
          <ErrorNote error={error} onRetry={reload} />
          <Table
            loading={loading}
            rows={data?.items}
            empty={<EmptyState icon={Bell} title="Nothing sent yet" />}
            columns={[
              {
                key: 'title',
                title: 'Message',
                render: (b) => (
                  <div className="max-w-[420px]">
                    <div className="font-semibold text-ink">{b.title}</div>
                    <div className="line-clamp-2 text-xs text-ink-500">{b.text}</div>
                  </div>
                ),
              },
              { key: 'audience', title: 'To', render: (b) => <Badge>{AUDIENCE[b.audience]}</Badge> },
              { key: 'recipients', title: 'People', align: 'right', render: (b) => <span className="tabular">{count(b.recipients)}</span> },
              { key: 'sentBy', title: 'By' },
              { key: 'createdAt', title: 'Sent', render: (b) => dateTime(b.createdAt) },
            ]}
          />
        </Card>
      </div>
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} onConfirm={send} title={`Send to ${AUDIENCE[audience].toLowerCase()}?`} text="This cannot be taken back." confirmLabel="Send now" loading={busy}>
        <div className="mt-4 rounded-xl bg-ink-50 p-4 text-sm">
          <b>{title}</b>
          <p className="mt-1 text-ink-600">{text}</p>
        </div>
      </ConfirmModal>
    </div>
  )
}
