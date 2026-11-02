import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Button, Card, CardHeader, ErrorNote, Field, IconButton, Input, PageLoader, Tabs, Textarea, useToast } from '@/components/ui'
import { useAction, useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { PageHeader } from '../AdminLayout'

const LEGAL = { terms: 'Terms of use', privacy: 'Privacy policy', refund: 'Refund policy' }

export default function Cms() {
  const toast = useToast()
  const [run, busy] = useAction(toast)
  const { data, error, loading, reload } = useApi('/admin/cms')
  const [tab, setTab] = useState('support')
  const [support, setSupport] = useState({ phone: '', whatsapp: '', email: '', hours: '' })
  const [faq, setFaq] = useState([])
  const [legal, setLegal] = useState({ terms: '', privacy: '', refund: '' })
  const [regFee, setRegFee] = useState('1')

  useEffect(() => {
    if (!data) return
    setSupport({ phone: '', whatsapp: '', email: '', hours: '', ...(data.items.support ?? {}) })
    setFaq(Array.isArray(data.items.faq) ? data.items.faq : [])
    setLegal({ terms: data.items.terms ?? '', privacy: data.items.privacy ?? '', refund: data.items.refund ?? '' })
    setRegFee(String(data.items.fees?.registration ?? 1))
  }, [data])

  const save = (key, value) => run(() => api(`/admin/cms/${key}`, { method: 'PUT', body: { value } }), 'Saved. The app and website show it right away.')

  if (loading && !data) return <PageLoader />
  return (
    <div>
      <PageHeader title="Content & support" subtitle="Support contact, FAQs and legal pages shown in the app and on the website." />
      <ErrorNote error={error} onRetry={reload} />
      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'support', label: 'Support contact' },
          { value: 'fees', label: 'Fees' },
          { value: 'faq', label: 'FAQs' },
          ...Object.entries(LEGAL).map(([value, label]) => ({ value, label })),
        ]}
      />

      {tab === 'fees' && (
        <Card className="max-w-xl">
          <CardHeader title="Registration fee" subtitle="One-time fee every new driver and owner pays after choosing their role. 0 makes registration free." />
          <div className="space-y-4 p-5">
            <Field label="Fee (₹, incl. GST)">
              <Input type="number" min={0} value={regFee} onChange={(e) => setRegFee(e.target.value)} />
            </Field>
            <Button icon={Save} loading={busy} onClick={() => save('fees', { registration: Math.max(0, Number(regFee) || 0) })}>
              Save
            </Button>
          </div>
        </Card>
      )}

      {tab === 'support' && (
        <Card className="max-w-2xl">
          <CardHeader title="Support contact" subtitle="Shown on the Help screen in the app, and on the website." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Call number">
              <Input value={support.phone} onChange={(e) => setSupport((s) => ({ ...s, phone: e.target.value }))} placeholder="+91 98XXXXXXXX" />
            </Field>
            <Field label="WhatsApp number">
              <Input value={support.whatsapp} onChange={(e) => setSupport((s) => ({ ...s, whatsapp: e.target.value }))} placeholder="+91 98XXXXXXXX" />
            </Field>
            <Field label="Email">
              <Input value={support.email} onChange={(e) => setSupport((s) => ({ ...s, email: e.target.value }))} />
            </Field>
            <Field label="Hours">
              <Input value={support.hours} onChange={(e) => setSupport((s) => ({ ...s, hours: e.target.value }))} placeholder="9 AM - 7 PM, Mon-Sat" />
            </Field>
            <div className="sm:col-span-2">
              <Button icon={Save} loading={busy} onClick={() => save('support', support)}>
                Save
              </Button>
            </div>
          </div>
        </Card>
      )}

      {tab === 'faq' && (
        <Card className="max-w-3xl">
          <CardHeader
            title="Frequently asked questions"
            action={
              <Button size="sm" variant="outline" icon={Plus} onClick={() => setFaq((f) => [...f, { q: '', a: '' }])}>
                Add
              </Button>
            }
          />
          <div className="space-y-4 p-5">
            {faq.map((item, i) => (
              <div key={i} className="rounded-xl border border-ink-200 p-4">
                <div className="flex gap-2">
                  <Input value={item.q} placeholder="Question" onChange={(e) => setFaq((f) => f.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} />
                  <IconButton icon={Trash2} label="Remove" onClick={() => setFaq((f) => f.filter((_, k) => k !== i))} />
                </div>
                <Textarea className="mt-2" rows={2} value={item.a} placeholder="Answer" onChange={(e) => setFaq((f) => f.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} />
              </div>
            ))}
            <Button icon={Save} loading={busy} onClick={() => save('faq', faq.filter((x) => x.q.trim()))}>
              Save FAQs
            </Button>
          </div>
        </Card>
      )}

      {LEGAL[tab] && (
        <Card className="max-w-4xl">
          <CardHeader title={LEGAL[tab]} subtitle={`Public at /${tab} on the website and inside the app. Blank lines make new paragraphs; lines starting with # become headings.`} />
          <div className="p-5">
            <Textarea rows={20} value={legal[tab]} onChange={(e) => setLegal((l) => ({ ...l, [tab]: e.target.value }))} className="font-mono text-[13px]" />
            <Button icon={Save} className="mt-4" loading={busy} onClick={() => save(tab, legal[tab])}>
              Save
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
