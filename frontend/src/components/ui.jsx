import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/format'

/* ----------------------------------------------------------------- Button */

const BTN = {
  primary: 'bg-yellow text-ink shadow-[inset_0_-1px_0_rgb(0_0_0/0.08)] hover:bg-yellow-dark active:translate-y-px',
  dark: 'bg-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] hover:bg-ink-800 active:translate-y-px',
  outline: 'border border-ink-200 bg-white text-ink shadow-card hover:border-ink-300 hover:bg-ink-50',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink',
  danger: 'bg-red text-white hover:bg-red-text active:translate-y-px',
  'danger-soft': 'bg-red-soft text-red-text hover:bg-red/15',
  success: 'bg-green text-white hover:bg-green-text active:translate-y-px',
}
const SIZE = { xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md', sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg', md: 'h-9 px-3.5 text-[13.5px] gap-2 rounded-lg', lg: 'h-11 px-5 text-sm gap-2 rounded-xl' }

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, iconRight: IconRight, className, children, disabled, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-50',
        BTN[variant],
        SIZE[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" strokeWidth={2.2} /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="size-4" strokeWidth={2.2} /> : null}
    </button>
  )
}

export function IconButton({ icon: Icon, label, className, size = 'md', ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink disabled:opacity-30', size === 'sm' ? 'size-8' : 'size-9', className)}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} />
    </button>
  )
}

export function Kbd({ children, className }) {
  return <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded border border-ink-200 bg-white px-1 font-sans text-[10.5px] font-semibold text-ink-500 shadow-[0_1px_0_var(--color-ink-200)]', className)}>{children}</kbd>
}

/* ------------------------------------------------------------------ Badge */

const TONE = {
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200/70',
  green: 'bg-green-soft text-green-text ring-green/15',
  red: 'bg-red-soft text-red-text ring-red/15',
  amber: 'bg-amber-soft text-amber-text ring-yellow-dark/25',
  blue: 'bg-blue-soft text-blue-text ring-blue-text/15',
  dark: 'bg-ink text-white ring-ink',
  yellow: 'bg-yellow text-ink ring-yellow-dark/30',
}
const DOT = { neutral: 'bg-ink-400', green: 'bg-green', red: 'bg-red', amber: 'bg-yellow-dark', blue: 'bg-blue-text', dark: 'bg-yellow', yellow: 'bg-ink' }

export function Badge({ tone = 'neutral', className, children, dot }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1.5 rounded-md px-2 text-[11.5px] font-semibold whitespace-nowrap ring-1 ring-inset', TONE[tone], className)}>
      {dot && <span className={cn('size-1.5 rounded-full', DOT[tone])} />}
      {children}
    </span>
  )
}

const STATUS_TONE = {
  approved: 'green',
  verified: 'green',
  active: 'green',
  live: 'green',
  paid: 'green',
  connected: 'green',
  resolved: 'green',
  done: 'green',
  hired: 'green',
  pending: 'amber',
  applied: 'amber',
  created: 'amber',
  open: 'amber',
  new: 'amber',
  shortlisted: 'blue',
  paused: 'neutral',
  none: 'neutral',
  closed: 'neutral',
  expired: 'neutral',
  dismissed: 'neutral',
  rejected: 'red',
  suspended: 'red',
  hidden: 'red',
  failed: 'red',
  'not selected': 'red',
}
const STATUS_LABEL = { none: 'Not submitted', pending: 'Pending review', created: 'Started', approved: 'Verified' }

export function StatusBadge({ status, label }) {
  const key = String(status || 'none').toLowerCase()
  return (
    <Badge tone={STATUS_TONE[key] ?? 'neutral'} dot>
      {label ?? STATUS_LABEL[key] ?? key.charAt(0).toUpperCase() + key.slice(1)}
    </Badge>
  )
}

/* ------------------------------------------------------------------- Card */

export function Card({ className, children, ...rest }) {
  return (
    <div className={cn('rounded-xl border border-ink-200/80 bg-white shadow-card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, icon: Icon, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 ring-1 ring-ink-200/70">
            <Icon className="size-4 text-ink-600" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-semibold tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ Forms */

const inputBase =
  'w-full rounded-lg border border-ink-200 bg-white px-3 text-[13.5px] text-ink shadow-[0_1px_1px_rgb(17_17_17/0.03)] placeholder:text-ink-400 outline-none transition focus:border-ink-400 focus:ring-4 focus:ring-yellow/25 disabled:bg-ink-50 disabled:text-ink-500'

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-700">{label}</span>}
      {children}
      {error ? <span className="mt-1.5 block text-xs font-medium text-red">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-ink-500">{hint}</span> : null}
    </label>
  )
}

export const Input = ({ className, ...p }) => <input className={cn(inputBase, 'h-9', className)} {...p} />

export const Textarea = ({ className, rows = 4, ...p }) => <textarea rows={rows} className={cn(inputBase, 'py-2 leading-relaxed', className)} {...p} />

/** Full-width select for forms. */
export function Select({ className, options, placeholder, ...p }) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(inputBase, 'h-9 appearance-none pr-9')} {...p}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400" />
    </div>
  )
}

/** Compact select for toolbars; shows as an active chip when a value is chosen. */
export function FilterSelect({ value, onChange, options, placeholder, icon: Icon, className }) {
  const active = value !== '' && value !== undefined && value !== null
  return (
    <div className={cn('relative inline-flex', className)}>
      {Icon && <Icon className={cn('pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2', active ? 'text-ink' : 'text-ink-400')} />}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 cursor-pointer appearance-none rounded-lg border pr-8 text-[13px] font-medium outline-none transition focus:ring-4 focus:ring-yellow/25',
          Icon ? 'pl-8' : 'pl-3',
          active ? 'border-ink-300 bg-yellow-50 text-ink' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-400" />
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', checked ? 'bg-green' : 'bg-ink-300')}
    >
      <span className={cn('inline-block size-[18px] rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-[20px]' : 'translate-x-0.5')} />
    </button>
  )
}

/* ------------------------------------------------------------- Tabs / seg */

/** Underline tabs: used for page-level status filters. */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('scroll-thin flex gap-1 overflow-x-auto border-b border-ink-200', className)} role="tablist">
      {tabs.map((t) => {
        const on = value === t.value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative -mb-px flex h-10 items-center gap-2 px-3 text-[13px] font-semibold whitespace-nowrap transition',
              on ? 'text-ink' : 'text-ink-500 hover:text-ink'
            )}
          >
            {t.label}
            {t.count !== undefined && t.count !== null && (
              <span className={cn('rounded-md px-1.5 py-px text-[11px] tabular', on ? 'bg-ink text-white' : 'bg-ink-100 text-ink-600')}>{t.count}</span>
            )}
            {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" />}
          </button>
        )
      })}
    </div>
  )
}

/** Segmented control: small either/or switches inside toolbars. */
export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cn('inline-flex h-8 items-center rounded-lg bg-ink-100 p-0.5', className)} role="radiogroup">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn('flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold whitespace-nowrap transition', on ? 'bg-white text-ink shadow-card' : 'text-ink-500 hover:text-ink')}
          >
            {o.label}
            {o.count !== undefined && o.count !== null && <span className={cn('tabular text-[11px]', on ? 'text-ink-500' : 'text-ink-400')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- Toolbar */

export function Toolbar({ children, right, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-3', className)}>
      {children}
      {right && <div className="ml-auto flex items-center gap-2 text-[12.5px] text-ink-500">{right}</div>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search', className }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => setV(value ?? ''), [value])
  useEffect(() => {
    const t = setTimeout(() => v !== (value ?? '') && onChange(v), 300)
    return () => clearTimeout(t)
  }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className={cn(inputBase, 'h-8 pr-8 pl-9 text-[13px] [&::-webkit-search-cancel-button]:hidden')}
      />
      {v && (
        <button onClick={() => setV('')} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-ink" aria-label="Clear search">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Table */

export function Table({ columns, rows, onRowClick, empty, loading, rowKey = (r) => r.id, selectedKey, minWidth = 760 }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full text-left text-[13px]" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-ink-200/80 bg-ink-50/60">
            {columns.map((c) => (
              <th key={c.key} className={cn('h-9 px-4 text-[11px] font-semibold tracking-wider whitespace-nowrap text-ink-500 uppercase', c.className, c.align === 'right' && 'text-right')}>
                {c.title}
              </th>
            ))}
            {onRowClick && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {loading && !rows?.length ? (
            Array.from({ length: 7 }).map((_, i) => (
              <tr key={i} className="border-b border-ink-100">
                {columns.map((c, k) => (
                  <td key={c.key} className="h-14 px-4">
                    <div className="skeleton h-3.5 rounded" style={{ width: `${k === 0 ? 70 : 45 + ((i * 13 + k * 7) % 40)}%` }} />
                  </td>
                ))}
                {onRowClick && <td />}
              </tr>
            ))
          ) : rows?.length ? (
            rows.map((r) => {
              const key = rowKey(r)
              const selected = selectedKey !== undefined && key === selectedKey
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cn(
                    'group border-b border-ink-100 transition-colors last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-ink-50/80',
                    selected && 'bg-yellow-50 hover:bg-yellow-50'
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn('h-14 px-4 align-middle text-ink-700', c.className, c.align === 'right' && 'text-right')}>
                      {c.render ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                  {onRowClick && (
                    <td className="pr-3">
                      <ChevronRight className="size-4 text-ink-300 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </td>
                  )}
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={columns.length + (onRowClick ? 1 : 0)}>{empty ?? <EmptyState title="Nothing here yet" />}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/** "Showing 21–40 of 312" with page numbers. */
export function Pagination({ page, pages, total, limit = 20, onChange }) {
  if (!total) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(total, page * limit)
  const nums = []
  for (let n = 1; n <= pages; n++) if (n === 1 || n === pages || Math.abs(n - page) <= 1) nums.push(n)
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-2.5 text-[12.5px] text-ink-500">
      <span className="tabular">
        Showing <b className="font-semibold text-ink-700">{from}–{to}</b> of <b className="font-semibold text-ink-700">{total}</b>
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <IconButton size="sm" icon={ChevronLeft} label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} />
          {nums.map((n, i) => (
            <span key={n} className="flex items-center">
              {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-ink-400">…</span>}
              <button onClick={() => onChange(n)} className={cn('size-8 rounded-lg text-[12.5px] font-semibold tabular transition', n === page ? 'bg-ink text-white' : 'text-ink-600 hover:bg-ink-100')}>
                {n}
              </button>
            </span>
          ))}
          <IconButton size="sm" icon={ChevronRight} label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} />
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------- Empty / loading */

export function EmptyState({ icon: Icon, title, text, action, compact }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 text-center', compact ? 'py-8' : 'py-16')}>
      {Icon && (
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-ink-50 ring-1 ring-ink-200/70">
          <Icon className="size-5 text-ink-500" />
        </div>
      )}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ className }) {
  return <Loader2 className={cn('size-5 animate-spin text-ink-400', className)} />
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton rounded-md', className)} />
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="m-4 flex items-center gap-3 rounded-lg border border-red/20 bg-red-soft px-4 py-3 text-[13px] text-red-text">
      <AlertCircle className="size-4 shrink-0" />
      <span className="flex-1">{error.message || String(error)}</span>
      {onRetry && (
        <button className="font-semibold underline underline-offset-2" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- Modal & panes */

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', h)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
}

export function Modal({ open, onClose, title, description, children, footer, width = 'max-w-lg' }) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="admin-ui fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={cn('animate-pop-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop ring-1 ring-ink-200/60 sm:rounded-2xl', width)}>
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-ink-500">{description}</p>}
          </div>
          <IconButton size="sm" icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="scroll-thin overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

/** Right-side panel; children render their own header/body/footer. */
export function SlideOver({ open, onClose, children, width = 'max-w-[720px]', label }) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="admin-ui fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={label} className={cn('animate-slide-in relative flex h-full w-full flex-col bg-canvas shadow-pop', width)}>
        {children}
      </aside>
    </div>,
    document.body
  )
}

/** Classic drawer with title, scrolling body and footer. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl' }) {
  return (
    <SlideOver open={open} onClose={onClose} width={width} label={title}>
      <div className="flex items-start justify-between gap-4 border-b border-ink-200 bg-white px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <div className="mt-1 text-[13px] text-ink-500">{subtitle}</div>}
        </div>
        <IconButton icon={X} label="Close" onClick={onClose} />
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto p-6">{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-200 bg-white px-6 py-3">{footer}</div>}
    </SlideOver>
  )
}

/* ------------------------------------------------------------------ Toast */

const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const idRef = useRef(0)
  const push = useCallback((message, tone = 'success') => {
    const id = ++idRef.current
    setItems((x) => [...x, { id, message, tone }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="admin-ui pointer-events-none fixed right-5 bottom-5 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className="animate-pop-in pointer-events-auto flex items-start gap-3 rounded-xl bg-ink-900 px-4 py-3 text-[13px] text-white shadow-pop ring-1 ring-white/10">
              {t.tone === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-soft" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-yellow" />}
              <span className="leading-relaxed">{t.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

/* ------------------------------------------------------------ Misc bits */

const AVATAR_TINTS = ['bg-yellow-100 text-yellow-text', 'bg-blue-soft text-blue-text', 'bg-green-soft text-green-text', 'bg-[#EEEAFE] text-[#36277F]', 'bg-[#FFEDE3] text-[#7C2D12]']

/** Photo, or coloured initials when there is none (or it fails to load). */
export function Avatar({ src, name, size = 36, className, square }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const tint = AVATAR_TINTS[(name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length]
  const shape = square ? 'rounded-lg' : 'rounded-full'
  return src && !failed ? (
    <img src={src} alt="" onError={() => setFailed(true)} className={cn('shrink-0 object-cover ring-1 ring-ink-200/60', shape, className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cn('inline-flex shrink-0 items-center justify-center font-semibold', shape, tint, className)} style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}>
      {initials}
    </span>
  )
}

/** Name + secondary line next to an avatar: the standard "who" cell. */
export function Identity({ src, name, sub, size = 34, square }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar src={src} name={name} size={size} square={square} />
      <div className="min-w-0">
        <div className="truncate font-semibold text-ink">{name}</div>
        {sub && <div className="truncate text-[12px] text-ink-500">{sub}</div>}
      </div>
    </div>
  )
}

export function KeyValue({ items, className, cols = 2 }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4', cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2', className)}>
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11.5px] font-medium tracking-wide text-ink-500 uppercase">{k}</dt>
          <dd className="mt-1 text-[13.5px] font-medium break-words text-ink">{v || <span className="text-ink-400">—</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, text, confirmLabel = 'Confirm', variant = 'primary', loading, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={text}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
