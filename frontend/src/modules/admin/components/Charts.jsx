import { useState } from 'react'
import { Table2, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/format'

/**
 * Small HTML column charts for the dashboard.
 * Palette validated with the dataviz validator (light surface): series 1
 * #d99a00 (brand amber), series 2 #2a78d6 (blue). Amber is under 3:1 on white,
 * so every chart has a legend, hover tooltips and a table view.
 */
export const SERIES = ['#d99a00', '#2a78d6']

function niceMax(v) {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * p
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-ink-600">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

function ViewToggle({ table, setTable }) {
  return (
    <button
      onClick={() => setTable(!table)}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-ink-100 hover:text-ink"
      aria-pressed={table}
    >
      {table ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
      {table ? 'Chart' : 'Table'}
    </button>
  )
}

/**
 * Columns, optionally stacked. data: [{ label, tip, values: [n, n] }]
 * series: [{ label, color }]. format: value -> string (axis + tooltip).
 */
export function ColumnChart({ data, series, format = String, height = 200, labelEvery = 1, capLabels = false }) {
  const [hover, setHover] = useState(null)
  const [table, setTable] = useState(false)
  const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0))
  const max = niceMax(Math.max(1, ...totals))
  const ticks = [0, max / 2, max]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        {series.length > 1 ? <Legend items={series} /> : <span />}
        <ViewToggle table={table} setTable={setTable} />
      </div>

      {table ? (
        <div className="scroll-thin max-h-[240px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs text-ink-500">
                <th className="py-1.5 font-semibold">Period</th>
                {series.map((s) => (
                  <th key={s.label} className="py-1.5 text-right font-semibold">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-b border-ink-100 last:border-0">
                  <td className="py-1.5 text-ink-600">{d.tip ?? d.label}</td>
                  {d.values.map((v, i) => (
                    <td key={i} className="py-1.5 text-right font-medium tabular">
                      {format(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex flex-col justify-between pb-6 text-right text-[11px] text-ink-400 tabular" style={{ height }}>
            {[...ticks].reverse().map((t) => (
              <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
                {format(t)}
              </span>
            ))}
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: height - 24 }}>
              {ticks.map((t) => (
                <div key={t} className="h-px bg-ink-100" />
              ))}
            </div>
            <div className="relative flex items-end" style={{ height: height - 24 }} onMouseLeave={() => setHover(null)}>
              {data.map((d, i) => {
                const total = totals[i]
                return (
                  <div
                    key={d.label}
                    className="relative flex h-full flex-1 cursor-default flex-col items-center justify-end"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    tabIndex={0}
                    aria-label={`${d.tip ?? d.label}: ${series.map((s, k) => `${s.label} ${format(d.values[k])}`).join(', ')}`}
                  >
                    {capLabels && total > 0 && (
                      <span className="mb-1 text-[11px] font-semibold text-ink-600 tabular">{format(total)}</span>
                    )}
                    <div className={cn('flex w-[min(24px,70%)] flex-col-reverse gap-[2px] transition-opacity', hover !== null && hover !== i && 'opacity-55')}>
                      {d.values.map((v, k) =>
                        v > 0 ? (
                          <div
                            key={k}
                            style={{ height: Math.max(2, ((height - 24 - (capLabels ? 18 : 0)) * v) / max), background: series[k].color }}
                            className={cn(k === d.values.length - 1 || d.values.slice(k + 1).every((x) => !x) ? 'rounded-t-[4px]' : '')}
                          />
                        ) : null
                      )}
                    </div>
                    {hover === i && (
                      <div className="pointer-events-none absolute bottom-full z-10 mb-2 min-w-[140px] rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-pop">
                        <div className="mb-1 font-semibold">{d.tip ?? d.label}</div>
                        {series.map((s, k) => (
                          <div key={s.label} className="flex items-center justify-between gap-4">
                            <span className="inline-flex items-center gap-1.5 text-white/75">
                              <span className="size-2 rounded-sm" style={{ background: s.color }} />
                              {s.label}
                            </span>
                            <span className="font-semibold tabular">{format(d.values[k])}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex h-4">
              {data.map((d, i) => (
                <div key={d.label} className="flex-1 text-center text-[11px] text-ink-400">
                  {i % labelEvery === 0 || i === data.length - 1 ? d.label : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
