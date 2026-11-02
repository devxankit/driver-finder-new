import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/format'

/* ----------------------------------------------------------------- Button */

const BTN = {
  primary: 'bg-yellow text-ink hover:bg-yellow-dark active:bg-yellow-dark',
  dark: 'bg-ink text-white hover:bg-ink-700',
  outline: 'border border-ink-300 bg-white text-ink hover:bg-ink-50',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink',
  danger: 'bg-red text-white hover:bg-red-text',
  success: 'bg-green text-white hover:bg-green-text',
}
const SIZE = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-[15px] gap-2' }

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[10px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        BTN[variant],
        SIZE[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" strokeWidth={2.2} /> : null}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, className, ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} className={cn('inline-flex size-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 hover:text-ink', className)} {...rest}>
      <Icon className="size-[18px]" />
    </button>
  )
}

/* ------------------------------------------------------------------ Badge */

const TONE = {
  neutral: 'bg-ink-100 text-ink-700',
  green: 'bg-green-soft text-green-text',
  red: 'bg-red-soft text-red-text',
  amber: 'bg-amber-soft text-amber-text',
  blue: 'bg-blue-soft text-blue-text',
  dark: 'bg-ink text-white',
  yellow: 'bg-yellow text-ink',
}

export function Badge({ tone = 'neutral', className, children, dot }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', TONE[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  )
}

const STATUS_TONE = {
  approved: 'green',
  active: 'green',
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
const STATUS_LABEL = { none: 'Not submitted', pending: 'Pending review', created: 'Started' }

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
    <div className={cn('rounded-[14px] border border-ink-200 bg-white shadow-card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ Forms */

const inputBase =
  'w-full rounded-[10px] border border-ink-300 bg-white px-3 text-sm text-ink placeholder:text-ink-400 outline-none transition focus:border-ink focus:ring-2 focus:ring-yellow/60 disabled:bg-ink-50'

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-red">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-500">{hint}</span> : null}
    </label>
  )
}

export const Input = ({ className, ...p }) => <input className={cn(inputBase, 'h-10', className)} {...p} />

export const Textarea = ({ className, rows = 4, ...p }) => <textarea rows={rows} className={cn(inputBase, 'py-2.5 leading-relaxed', className)} {...p} />

export function Select({ className, options, placeholder, ...p }) {
  return (
    <select className={cn(inputBase, 'h-10 pr-8', className)} {...p}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
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
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', checked ? 'bg-green' : 'bg-ink-300')}
    >
      <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  )
}

/* ------------------------------------------------------------------- Tabs */

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1 scroll-thin', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition',
            value === t.value ? 'bg-white text-ink shadow-card' : 'text-ink-500 hover:text-ink'
          )}
        >
          {t.label}
          {t.count !== undefined && t.count !== null && (
            <span className={cn('rounded-full px-1.5 text-[11px] tabular', value === t.value ? 'bg-yellow text-ink' : 'bg-ink-200 text-ink-600')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ Table */

export function Table({ columns, rows, onRowClick, empty, loading, rowKey = (r) => r.id }) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50/70">
            {columns.map((c) => (
              <th key={c.key} className={cn('px-4 py-2.5 text-xs font-semibold tracking-wide text-ink-500 uppercase', c.className, c.align === 'right' && 'text-right')}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows?.length ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-ink-100">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3.5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows?.length ? (
            rows.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cn('border-b border-ink-100 last:border-0', onRowClick && 'cursor-pointer hover:bg-yellow-50/60')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle text-ink-700', c.className, c.align === 'right' && 'text-right')}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>{empty ?? <EmptyState title="Nothing here yet" />}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) return total ? <div className="px-4 py-3 text-xs text-ink-500">{total} total</div> : null
  return (
    <div className="flex items-center justify-between border-t border-ink-200 px-4 py-3 text-[13px] text-ink-500">
      <span className="tabular">
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-1">
        <IconButton icon={ChevronLeft} label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className="disabled:opacity-30" />
        <IconButton icon={ChevronRight} label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} className="disabled:opacity-30" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------- Empty / loading */

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-ink-100">
          <Icon className="size-6 text-ink-500" />
        </div>
      )}
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[13px] text-ink-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ className }) {
  return <Loader2 className={cn('size-5 animate-spin text-ink-400', className)} />
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner className="size-7" />
    </div>
  )
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red/20 bg-red-soft px-4 py-3 text-sm text-red-text">
      <AlertCircle className="size-4 shrink-0" />
      <span className="flex-1">{error.message || String(error)}</span>
      {onRetry && (
        <button className="font-semibold underline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- Modal & drawer */

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

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={cn('animate-fade-up relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-2xl', width)}>
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <h2 className="text-base font-bold">{title}</h2>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-200 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl' }) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={title} className={cn('relative flex h-full w-full flex-col bg-ink-50 shadow-pop', width)}>
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-ink-500">{subtitle}</div>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-200 bg-white px-5 py-3">{footer}</div>}
      </aside>
    </div>,
    document.body
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
        <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className="animate-fade-up pointer-events-auto flex items-start gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-pop">
              {t.tone === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-soft" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-yellow" />}
              <span>{t.message}</span>
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

export function Avatar({ src, name, size = 36, className }) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return src ? (
    <img src={src} alt="" width={size} height={size} className={cn('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-yellow-100 font-bold text-yellow-text', className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </span>
  )
}

export function KeyValue({ items, className }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium text-ink-500">{k}</dt>
          <dd className="mt-0.5 text-sm font-medium break-words text-ink">{v || '-'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search', className }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => setV(value ?? ''), [value])
  useEffect(() => {
    const t = setTimeout(() => v !== (value ?? '') && onChange(v), 350)
    return () => clearTimeout(t)
  }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  return <Input type="search" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className={cn('w-full sm:w-64', className)} />
}

export function ConfirmModal({ open, onClose, onConfirm, title, text, confirmLabel = 'Confirm', variant = 'primary', loading, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
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
      {text && <p className="text-sm text-ink-600">{text}</p>}
      {children}
    </Modal>
  )
}
