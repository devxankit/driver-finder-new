import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Briefcase, CornerDownLeft, Search, UserRound } from 'lucide-react'
import { api, fileUrl } from '@/lib/api'
import { cn, phone } from '@/lib/format'
import { Avatar, Kbd, Spinner } from '@/components/ui'

/**
 * Ctrl/⌘ K: jump to any page, or find a driver, owner or job by name, phone,
 * city or title. Arrow keys move, Enter opens, Esc closes.
 */
export default function CommandPalette({ open, onClose, pages }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setPeople([])
    setJobs([])
    setActive(0)
    setTimeout(() => input.current?.focus(), 10)
  }, [open])

  useEffect(() => {
    const s = q.trim()
    if (!open || s.length < 2) {
      setPeople([])
      setJobs([])
      return
    }
    setLoading(true)
    const c = new AbortController()
    const t = setTimeout(() => {
      Promise.all([api('/admin/users', { query: { q: s, limit: 6 }, signal: c.signal }), api('/admin/jobs', { query: { q: s, limit: 4 }, signal: c.signal })])
        .then(([u, j]) => {
          setPeople(u.items ?? [])
          setJobs(j.items ?? [])
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 220)
    return () => {
      clearTimeout(t)
      c.abort()
    }
  }, [q, open])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    const pageHits = pages.filter((p) => !s || p.label.toLowerCase().includes(s) || p.group.toLowerCase().includes(s)).slice(0, s ? 5 : 8)
    return [
      ...pageHits.map((p) => ({ kind: 'page', key: p.to, label: p.label, sub: p.group, icon: p.icon, go: p.to })),
      ...people.map((u) => ({
        kind: 'person',
        key: u.id,
        label: u.name || phone(u.phone),
        sub: `${u.role === 'owner' ? 'Vehicle owner' : u.role === 'driver' ? 'Driver' : 'No role'} · ${phone(u.phone)}${u.city ? ` · ${u.city}` : ''}`,
        photo: fileUrl(u.photo),
        go: u.kyc === 'pending' ? `/admin/kyc?user=${u.id}` : `/admin/${u.role === 'owner' ? 'owners' : 'drivers'}?user=${u.id}`,
      })),
      ...jobs.map((j) => ({ kind: 'job', key: j.id, label: j.title, sub: `${j.owner?.company || j.owner?.name || ''} · ${j.area}`, icon: Briefcase, go: `/admin/jobs?q=${encodeURIComponent(j.title)}` })),
    ]
  }, [q, pages, people, jobs])

  useEffect(() => setActive(0), [results.length])
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null
  const go = (r) => {
    if (!r) return
    navigate(r.go)
    onClose()
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[active])
    } else if (e.key === 'Escape') onClose()
  }

  let i = -1
  const section = (kind, title) => {
    const rows = results.filter((r) => r.kind === kind)
    if (!rows.length) return null
    return (
      <div className="py-1.5">
        <div className="px-4 pt-1 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-ink-400 uppercase">{title}</div>
        {rows.map((r) => {
          i += 1
          const idx = i
          const on = idx === active
          return (
            <button
              key={`${r.kind}-${r.key}`}
              data-i={idx}
              onMouseMove={() => setActive(idx)}
              onClick={() => go(r)}
              className={cn('mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-2.5 py-2 text-left', on ? 'bg-ink-100' : '')}
            >
              {r.kind === 'person' ? (
                <Avatar src={r.photo} name={r.label} size={30} />
              ) : (
                <span className="flex size-[30px] items-center justify-center rounded-lg bg-white ring-1 ring-ink-200">{r.icon ? <r.icon className="size-4 text-ink-600" /> : <UserRound className="size-4" />}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{r.label}</span>
                <span className="block truncate text-[12px] text-ink-500">{r.sub}</span>
              </span>
              {on && <ArrowRight className="size-4 text-ink-400" />}
            </button>
          )
        })}
      </div>
    )
  }

  return createPortal(
    <div className="admin-ui fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-pop-in relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-ink-200/70" role="dialog" aria-label="Search">
        <div className="flex items-center gap-3 border-b border-ink-100 px-4">
          <Search className="size-[18px] text-ink-400" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search drivers, owners, phone numbers, jobs or pages…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-400"
          />
          {loading ? <Spinner className="size-4" /> : <Kbd>Esc</Kbd>}
        </div>
        <div ref={listRef} className="scroll-thin max-h-[52vh] overflow-y-auto">
          {section('person', 'People')}
          {section('job', 'Job posts')}
          {section('page', q.trim() ? 'Pages' : 'Go to')}
          {!results.length && <div className="px-4 py-10 text-center text-[13px] text-ink-500">No matches for “{q}”.</div>}
        </div>
        <div className="flex items-center gap-4 border-t border-ink-100 bg-ink-50/70 px-4 py-2 text-[11.5px] text-ink-500">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to move
          </span>
          <span className="flex items-center gap-1">
            <Kbd>
              <CornerDownLeft className="size-3" />
            </Kbd>
            to open
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
