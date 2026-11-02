import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, ChevronLeft, ChevronRight, Clock, MousePointerClick } from 'lucide-react'
import { Avatar, Card, EmptyState, ErrorNote, IconButton, Segmented, Skeleton, StatusBadge, Tabs } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { fileUrl } from '@/lib/api'
import { ago, CATEGORY_LABELS, cn, phone } from '@/lib/format'
import { PageHeader } from '../AdminLayout'
import UserPanel from '../components/UserPanel'

/** Review workspace: queue on the left, the selected person on the right. */
export default function Kyc() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'pending'
  const role = params.get('role') || ''
  const page = Number(params.get('page') || 1)
  const openId = params.get('user')
  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }

  const { data, error, loading, reload } = useApi('/admin/users', { kyc: status, role, page }, { live: ['kyc', 'users'] })
  const counts = useApi('/admin/dashboard', undefined, { live: ['kyc'] }).data?.stats
  const items = data?.items ?? []
  const idx = items.findIndex((r) => r.id === openId)

  // Open the first person automatically so the reviewer can start straight away.
  useEffect(() => {
    if (!openId && items.length && window.innerWidth >= 1024) set({ user: items[0].id })
  }, [items, openId]) // eslint-disable-line react-hooks/exhaustive-deps

  const step = (d) => {
    const n = items[idx + d]
    if (n) set({ user: n.id })
  }
  // After a decision on the pending list the person leaves it; move to whoever is next.
  const decided = () => {
    if (status !== 'pending') return
    const n = items[idx + 1] ?? items[idx - 1]
    set({ user: n && n.id !== openId ? n.id : '' })
  }

  return (
    <div>
      <PageHeader title="KYC review" subtitle="Check each document against the profile, then approve, or send it back with a reason the user will see." />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-200 px-4 pt-1">
          <Tabs
            className="border-none"
            value={status}
            onChange={(v) => set({ status: v, page: '', user: '' })}
            tabs={[
              { value: 'pending', label: 'Waiting', count: counts?.kycPending },
              { value: 'rejected', label: 'Sent back' },
              { value: 'approved', label: 'Verified' },
              { value: 'none', label: 'Not submitted' },
            ]}
          />
          <Segmented
            className="mb-2"
            value={role}
            onChange={(v) => set({ role: v, page: '', user: '' })}
            options={[
              { value: '', label: 'Everyone' },
              { value: 'driver', label: 'Drivers', count: status === 'pending' ? counts?.kycPendingDrivers : undefined },
              { value: 'owner', label: 'Owners', count: status === 'pending' ? counts?.kycPendingOwners : undefined },
            ]}
          />
        </div>

        <div className="grid lg:h-[calc(100vh-232px)] lg:min-h-[560px] lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Queue */}
          <div className={cn('flex min-h-0 flex-col border-ink-200 lg:border-r', openId && 'hidden lg:flex')}>
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5 text-[12px] text-ink-500">
              <span className="tabular">{data ? `${data.total} ${data.total === 1 ? 'person' : 'people'}` : ' '}</span>
              {status === 'pending' && <span>Oldest first</span>}
            </div>
            <ErrorNote error={error} onRetry={reload} />
            <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              {loading && !data
                ? Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className="flex items-center gap-3 border-b border-ink-100 px-4 py-3.5">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </li>
                  ))
                : items.map((r) => {
                    const on = r.id === openId
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => set({ user: r.id })}
                          className={cn('relative flex w-full items-center gap-3 border-b border-ink-100 px-4 py-3 text-left transition', on ? 'bg-yellow-50' : 'hover:bg-ink-50')}
                        >
                          {on && <span className="absolute inset-y-0 left-0 w-[3px] bg-yellow" />}
                          <Avatar src={fileUrl(r.photo)} name={r.name || r.phone} size={40} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[13.5px] font-semibold">{r.name || 'No name yet'}</span>
                              <span className={cn('shrink-0 rounded px-1.5 py-px text-[10.5px] font-semibold', r.role === 'owner' ? 'bg-blue-soft text-blue-text' : 'bg-ink-100 text-ink-600')}>
                                {r.role === 'owner' ? 'Owner' : r.role === 'driver' ? 'Driver' : '—'}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] text-ink-500">
                              {[r.city, r.role === 'owner' ? r.company : r.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')].filter(Boolean).join(' · ') || phone(r.phone)}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            {status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
                                <Clock className="size-3" />
                                {ago(r.kycSubmittedAt)}
                              </span>
                            ) : (
                              <StatusBadge status={r.kyc} />
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
              {data && !items.length && (
                <li>
                  <EmptyState
                    icon={BadgeCheck}
                    title={status === 'pending' ? 'All caught up' : 'No one here'}
                    text={status === 'pending' ? 'New KYC submissions from the app appear here the moment they arrive.' : 'Try another tab.'}
                  />
                </li>
              )}
            </ul>
            {data?.pages > 1 && (
              <div className="flex items-center justify-between border-t border-ink-100 px-4 py-2 text-[12px] text-ink-500">
                <span className="tabular">
                  Page {data.page} of {data.pages}
                </span>
                <span className="flex gap-1">
                  <IconButton size="sm" icon={ChevronLeft} label="Previous page" disabled={data.page <= 1} onClick={() => set({ page: String(data.page - 1), user: '' })} />
                  <IconButton size="sm" icon={ChevronRight} label="Next page" disabled={data.page >= data.pages} onClick={() => set({ page: String(data.page + 1), user: '' })} />
                </span>
              </div>
            )}
          </div>

          {/* Detail */}
          <div className={cn('flex min-h-0 flex-col', !openId && 'hidden lg:flex')}>
            {openId ? (
              <>
                <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-1.5 text-[12px] text-ink-500">
                  <button className="inline-flex items-center gap-1 font-medium hover:text-ink lg:hidden" onClick={() => set({ user: '' })}>
                    <ChevronLeft className="size-3.5" /> Back to list
                  </button>
                  <span className="hidden tabular lg:inline">{idx >= 0 ? `${idx + 1} of ${items.length} on this page` : ''}</span>
                  <span className="flex gap-1">
                    <IconButton size="sm" icon={ChevronLeft} label="Previous person" disabled={idx <= 0} onClick={() => step(-1)} />
                    <IconButton size="sm" icon={ChevronRight} label="Next person" disabled={idx < 0 || idx >= items.length - 1} onClick={() => step(1)} />
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <UserPanel key={openId} userId={openId} onChanged={reload} onDecided={decided} />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-canvas">
                <EmptyState icon={MousePointerClick} title="Pick someone to review" text="Their documents, profile and plan open here." />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
