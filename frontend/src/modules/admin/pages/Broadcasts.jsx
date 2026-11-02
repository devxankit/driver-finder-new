import { useState } from 'react'
import { Bell, Send, Users } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ConfirmModal, EmptyState, ErrorNote, Field, Input, Segmented, Table, Textarea, useToast } from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { count, dateTime } from '@/lib/format'
import logo from '@/assets/images/logo-mark.png'
import { PageHeader } from '../AdminLayout'

/** How the message will look in the phone's notification inbox. */
function Preview({ title, text }) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-ink-900 to-ink-950 p-4">
      <div className="mb-2 text-center text-[10.5px] font-semibold tracking-[0.1em] text-white/40 uppercase">Preview</div>
      <div className="rounded-xl bg-white/95 p-3 shadow-pop backdrop-blur">
        <div className="flex items-center gap-2 text-[11px] text-ink-500">
          <img src={logo} alt="" className="size-4 rounded" />
          <span className="font-semibold text-ink-700">Driver Finder</span>
          <span className="ml-auto">now</span>
        </div>
        <div className="mt-1.5 truncate text-[13px] font-semibold text-ink">{title || 'Your title'}</div>
        <div className="mt-0.5 line-clamp-3 text-[12.5px] leading-snug text-ink-600">{text || 'Your message shows here.'}</div>
      </div>
    </div>
  )
}

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
      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader title="New message" subtitle="Lands in the in-app notification inbox" icon={Send} />
          <div className="space-y-4 p-5">
            <Field label="Send to">
              <Segmented className="w-full [&>button]:flex-1 [&>button]:justify-center" value={audience} onChange={setAudience} options={Object.entries(AUDIENCE).map(([value, label]) => ({ value, label }))} />
            </Field>
            <Field label="Title" hint={`${title.length}/80`}>
              <Input maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New jobs in Pune" />
            </Field>
            <Field label="Message" hint={`${text.length}/500 · keep it short and simple`}>
              <Textarea maxLength={500} rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="20 new truck driver jobs were posted this week. Open the app to apply." />
            </Field>
            <Preview title={title} text={text} />
            <Button variant="dark" icon={Send} className="w-full" disabled={!title.trim() || !text.trim()} onClick={() => setConfirm(true)}>
              Send
            </Button>
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader title="Sent messages" subtitle={data ? `${data.items.length} sent` : undefined} icon={Bell} />
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
                    <div className="line-clamp-2 text-[12px] text-ink-500">{b.text}</div>
                  </div>
                ),
              },
              { key: 'audience', title: 'To', render: (b) => <Badge tone={b.audience === 'driver' ? 'yellow' : b.audience === 'owner' ? 'blue' : 'neutral'}>{AUDIENCE[b.audience]}</Badge> },
              { key: 'recipients', title: 'People', align: 'right', render: (b) => <span className="inline-flex items-center gap-1 tabular"><Users className="size-3 text-ink-400" />{count(b.recipients)}</span> },
              { key: 'sentBy', title: 'By' },
              { key: 'createdAt', title: 'Sent', render: (b) => <span className="whitespace-nowrap text-ink-500">{dateTime(b.createdAt)}</span> },
            ]}
          />
        </Card>
      </div>
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} onConfirm={send} title={`Send to ${AUDIENCE[audience].toLowerCase()}?`} text="This cannot be taken back." confirmLabel="Send now" loading={busy}>
        <Preview title={title} text={text} />
      </ConfirmModal>
    </div>
  )
}
