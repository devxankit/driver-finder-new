import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BadgeIndianRupee,
  Check,
  ChevronDown,
  Languages,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  PhoneCall,
  ShieldCheck,
  X,
} from 'lucide-react'
import { api, fileUrl } from '@/lib/api'
import { cn, rupees } from '@/lib/format'
import { LANGUAGES, T } from './content'
import logo from '@/assets/images/logo-mark.png'
import vTruck from '@/assets/images/v-truck.jpg'
import driverPhoto from '@/assets/images/driver-mahesh.jpg'
import ownerPhoto from '@/assets/images/owner-ramesh.jpg'
import tTruck from '@/assets/images/t-truck.jpg'
import tTempo from '@/assets/images/t-tempo.jpg'
import tBigtruck from '@/assets/images/t-bigtruck.jpg'
import tBus from '@/assets/images/t-bus.jpg'
import tMinibus from '@/assets/images/t-minibus.jpg'
import tCar from '@/assets/images/t-car.jpg'
import tSuv from '@/assets/images/t-suv.jpg'

const PLAY_URL = import.meta.env.VITE_PLAY_STORE_URL || ''

/** Shown before /api/meta loads, or if the API is down. */
const FALLBACK_CATEGORIES = [
  { key: 'truck', label: 'Truck', labels: { hi: 'ट्रक' }, img: tTruck },
  { key: 'bigtruck', label: 'Big Truck', labels: { hi: 'बड़ा ट्रक' }, img: tBigtruck },
  { key: 'tempo', label: 'Tempo', labels: { hi: 'टेम्पो' }, img: tTempo },
  { key: 'bus', label: 'Bus', labels: { hi: 'बस' }, img: tBus },
  { key: 'minibus', label: 'Mini bus', labels: { hi: 'मिनी बस' }, img: tMinibus },
  { key: 'car', label: 'Car', labels: { hi: 'कार' }, img: tCar },
  { key: 'suv', label: 'SUV', labels: { hi: 'एसयूवी' }, img: tSuv },
]
const LOCAL_TILE = Object.fromEntries(FALLBACK_CATEGORIES.map((c) => [c.key, c.img]))

function useLang() {
  const [lang, setLang] = useState(() => localStorage.getItem('df.lang') || (navigator.language?.startsWith('hi') ? 'hi' : 'en'))
  useEffect(() => {
    localStorage.setItem('df.lang', lang)
    document.documentElement.lang = lang
  }, [lang])
  return [lang, setLang]
}

function Container({ className, children }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>{children}</div>
}

function PlayButton({ t, dark }) {
  const cls = cn(
    'inline-flex h-14 items-center gap-3 rounded-2xl px-5 transition',
    dark ? 'bg-white text-ink hover:bg-ink-100' : 'bg-ink text-white hover:bg-ink-700'
  )
  const icon = (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <path fill="#34A853" d="M3.6 2.3 13.4 12l-9.8 9.7c-.4-.2-.6-.7-.6-1.2V3.5c0-.5.2-1 .6-1.2Z" />
      <path fill="#FBBC04" d="m16.8 8.6-3.4 3.4 3.4 3.4 3.9-2.2c.9-.5.9-1.8 0-2.3l-3.9-2.3Z" />
      <path fill="#4285F4" d="M3.6 21.7 13.4 12l3.4 3.4-11.4 6.5c-.6.3-1.3.2-1.8-.2Z" />
      <path fill="#EA4335" d="M3.6 2.3c.5-.4 1.2-.5 1.8-.2l11.4 6.5-3.4 3.4-9.8-9.7Z" />
    </svg>
  )
  const label = (
    <span className="text-left leading-tight">
      <span className="block text-[11px] opacity-70">{PLAY_URL ? 'GET IT ON' : t.hero.soon.split(' ').slice(0, 2).join(' ')}</span>
      <span className="block text-[15px] font-bold">Google Play</span>
    </span>
  )
  return PLAY_URL ? (
    <a href={PLAY_URL} target="_blank" rel="noreferrer" className={cls}>
      {icon}
      {label}
    </a>
  ) : (
    <span className={cn(cls, 'cursor-default opacity-90')} title={t.hero.soon}>
      {icon}
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ Nav */

function Nav({ t, lang, setLang }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8)
    h()
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  const links = [
    ['#how', t.nav.how],
    ['#vehicles', t.nav.vehicles],
    ['#plans', t.nav.plans],
    ['#faq', t.nav.faq],
    ['#contact', t.nav.contact],
  ]
  return (
    <header className={cn('sticky top-0 z-40 transition', scrolled ? 'border-b border-ink-200 bg-white/90 backdrop-blur' : 'bg-transparent')}>
      <Container className="flex h-16 items-center gap-6">
        <a href="#top" className="flex items-center gap-2.5">
          <img src={logo} alt="" className="size-10" />
          <span className="text-[17px] font-extrabold tracking-tight">Driver Finder</span>
        </a>
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-ink-300 bg-white px-3 text-sm font-semibold hover:border-ink"
            aria-label="Change language"
          >
            <Languages className="size-4" />
            {lang === 'en' ? 'हिन्दी' : 'English'}
          </button>
          <a href="#get" className="hidden h-10 items-center rounded-xl bg-yellow px-4 text-sm font-bold text-ink hover:bg-yellow-dark sm:inline-flex">
            {t.nav.getApp}
          </a>
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>
      {open && (
        <div className="border-t border-ink-200 bg-white lg:hidden">
          <Container className="flex flex-col py-2">
            {links.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="py-3 font-medium">
                {label}
              </a>
            ))}
          </Container>
        </div>
      )}
    </header>
  )
}

/* ----------------------------------------------------------------- Hero */

function Hero({ t }) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 size-[620px] rounded-full bg-yellow/25 blur-3xl" />
      <Container className="relative grid items-center gap-12 pt-10 pb-16 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-300 bg-white px-3 py-1 text-[13px] font-semibold text-ink-600">
            <span className="size-2 rounded-full bg-yellow" />
            {t.hero.kicker}
          </span>
          <h1 className="mt-5 text-[40px] leading-[1.08] font-extrabold tracking-tight sm:text-[54px]">
            {t.hero.title1}
            <br />
            {/* Highlighter stroke that follows the text when it wraps onto two lines. */}
            <span className="box-decoration-clone bg-[linear-gradient(transparent_64%,var(--color-yellow)_64%,var(--color-yellow)_92%,transparent_92%)]">{t.hero.title2}</span>
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-600">{t.hero.text}</p>
          <div id="get" className="mt-8 flex flex-wrap items-center gap-3">
            <PlayButton t={t} />
            <a href="#how" className="inline-flex h-14 items-center gap-2 rounded-2xl border border-ink-300 bg-white px-5 font-bold hover:border-ink">
              {t.nav.how} <ArrowRight className="size-4" />
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
            {t.trust.map((x) => (
              <li key={x} className="flex items-center gap-2">
                <Check className="size-4 text-green" strokeWidth={3} />
                {x}
              </li>
            ))}
          </ul>
        </div>

        {/* A job card and a driver card, the two things the app is about. */}
        <div className="relative mx-auto mt-6 w-full max-w-[480px] lg:mt-0">
          <div className="rounded-[28px] border border-ink-200 bg-white p-4 shadow-pop">
            <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-white">
              <img src={vTruck} alt="Truck" className="h-full w-full object-contain" />
            </div>
            <div className="mt-3 flex items-start justify-between gap-3 px-1">
              <div>
                <span className="inline-block rounded-md bg-[#FFEDE3] px-2 py-0.5 text-xs font-bold text-[#7C2D12]">Truck · HMV</span>
                <h3 className="mt-2 text-lg leading-snug font-bold">Long-haul driver, Mumbai ⇄ Ahmedabad</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
                  <MapPin className="size-3.5" /> Bhiwandi · Food + stay
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-extrabold tabular">₹28,000</div>
                <div className="text-xs text-ink-500">{t.hero.perMonth}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
              <img src={ownerPhoto} alt="" className="size-10 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">Agarwal Roadlines</div>
                <div className="text-xs text-ink-500">12 vehicles · 14 {t.hero.applicants}</div>
              </div>
              <span className="flex size-10 items-center justify-center rounded-full bg-yellow">
                <PhoneCall className="size-4" />
              </span>
            </div>
          </div>

          <div className="absolute -top-5 -left-3 flex w-[250px] items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 shadow-pop sm:-left-14">
            <img src={driverPhoto} alt="" className="size-12 rounded-full object-cover" />
            <div className="min-w-0">
              <div className="text-sm font-bold">Mahesh Patil</div>
              <div className="text-xs text-ink-500">12 yrs · HMV · Nashik</div>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-bold text-green-text">
                <BadgeCheck className="size-3" /> {t.hero.verified}
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

/* --------------------------------------------------------- How it works */

function How({ t }) {
  const [side, setSide] = useState('driver')
  const steps = side === 'driver' ? t.how.driverSteps : t.how.ownerSteps
  return (
    <section id="how" className="scroll-mt-16 bg-white py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.how.title}</h2>
            <p className="mt-2 max-w-xl text-ink-600">{t.how.sub}</p>
          </div>
          <div className="flex rounded-2xl bg-ink-100 p-1">
            {['driver', 'owner'].map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={cn('h-11 rounded-xl px-5 text-sm font-bold transition', side === s ? 'bg-ink text-white' : 'text-ink-600 hover:text-ink')}
              >
                {s === 'driver' ? t.how.driver : t.how.owner}
              </button>
            ))}
          </div>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text], i) => (
            <li key={title} className="relative rounded-3xl border border-ink-200 bg-ink-50 p-6">
              <span className="flex size-10 items-center justify-center rounded-full bg-yellow text-lg font-extrabold">{i + 1}</span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------- Vehicles */

function Vehicles({ t, lang, categories }) {
  return (
    <section id="vehicles" className="scroll-mt-16 py-20">
      <Container>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.vehicles.title}</h2>
        <p className="mt-2 max-w-xl text-ink-600">{t.vehicles.sub}</p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {categories.map((c) => (
            <div key={c.key} className="group rounded-3xl border border-ink-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-ink">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-white">
                <img src={LOCAL_TILE[c.key] ?? fileUrl(c.image)} alt={c.label} loading="lazy" className="size-full object-contain transition group-hover:scale-105" />
              </div>
              <div className="mt-2 text-center font-bold">{(lang === 'hi' && c.labels?.hi) || c.label}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------------ Why */

const WHY_ICONS = [ShieldCheck, PhoneCall, BadgeIndianRupee, Languages]

function Why({ t }) {
  return (
    <section className="bg-ink py-20 text-white">
      <Container>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.why.title}</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.why.items.map(([title, text], i) => {
            const Icon = WHY_ICONS[i]
            return (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-yellow text-ink">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/65">{text}</p>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

/* ---------------------------------------------------------------- Plans */

function Plans({ t, plans, fee }) {
  const [role, setRole] = useState('driver')
  const list = plans.filter((p) => p.role === role)
  if (!plans.length) return null
  return (
    <section id="plans" className="scroll-mt-16 py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.plans.title}</h2>
            <p className="mt-2 max-w-xl text-ink-600">{t.plans.sub}</p>
            {fee ? <p className="mt-2 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-text">{t.plans.reg.replace('{fee}', rupees(fee))}</p> : null}
          </div>
          <div className="flex rounded-2xl bg-ink-100 p-1">
            {['driver', 'owner'].map((r) => (
              <button key={r} onClick={() => setRole(r)} className={cn('h-11 rounded-xl px-5 text-sm font-bold transition', role === r ? 'bg-ink text-white' : 'text-ink-600 hover:text-ink')}>
                {r === 'driver' ? t.plans.driver : t.plans.owner}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {list.map((p) => {
            const featured = Boolean(p.tag)
            return (
              <div key={p.id} className={cn('flex flex-col rounded-3xl border p-7', featured && p.tag.toLowerCase().includes('popular') ? 'border-ink bg-ink text-white' : 'border-ink-200 bg-white')}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{p.name}</span>
                  {p.tag && <span className="rounded-full bg-yellow px-2.5 py-0.5 text-xs font-bold text-ink">{p.tag}</span>}
                </div>
                <div className="mt-6 text-4xl font-extrabold tracking-tight tabular">{p.price ? rupees(p.price) : t.plans.atLaunch}</div>
                <div className="mt-1 text-sm opacity-60">
                  {t.plans.for} {p.months} {p.months === 1 ? t.plans.month : t.plans.months}
                </div>
                <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
                  {p.benefits.map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-yellow" strokeWidth={3} />
                      <span className="opacity-85">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------ Languages */

function LanguagesBand({ t }) {
  return (
    <section className="border-y border-ink-200 bg-yellow py-14">
      <Container>
        <h2 className="text-center text-2xl font-extrabold tracking-tight">{t.langs.title}</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {LANGUAGES.map(([native, en]) => (
            <span key={en} className="rounded-2xl bg-white px-5 py-3 text-lg font-bold" title={en}>
              {native}
            </span>
          ))}
        </div>
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------------ FAQ */

function Faq({ t, faq }) {
  const [open, setOpen] = useState(0)
  if (!faq.length) return null
  return (
    <section id="faq" className="scroll-mt-16 bg-white py-20">
      <Container className="max-w-3xl">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.faq.title}</h2>
        <div className="mt-8 divide-y divide-ink-200 border-y border-ink-200">
          {faq.map((f, i) => (
            <div key={f.q}>
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-[17px] font-bold" aria-expanded={open === i}>
                {f.q}
                <ChevronDown className={cn('size-5 shrink-0 transition', open === i && 'rotate-180')} />
              </button>
              {open === i && <p className="-mt-1 pb-5 leading-relaxed text-ink-600">{f.a}</p>}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------- Contact */

function Contact({ t, support }) {
  const [form, setForm] = useState({ name: '', phone: '', role: t.contact.roles[0], message: '', website: '' })
  const [state, setState] = useState({ busy: false, done: null, error: null })

  async function submit(e) {
    e.preventDefault()
    setState({ busy: true, done: null, error: null })
    try {
      const r = await api('/enquiries', { method: 'POST', body: form, auth: false })
      setState({ busy: false, done: r.message, error: null })
      setForm((f) => ({ ...f, name: '', phone: '', message: '' }))
    } catch (err) {
      setState({ busy: false, done: null, error: err.message })
    }
  }
  const input = 'h-12 w-full rounded-xl border border-ink-300 bg-white px-4 text-[15px] outline-none focus:border-ink focus:ring-2 focus:ring-yellow/60'

  return (
    <section id="contact" className="scroll-mt-16 py-20">
      <Container className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.contact.title}</h2>
          <p className="mt-2 text-ink-600">{t.contact.sub}</p>
          <div className="mt-8 space-y-3">
            {support.phone && (
              <a href={`tel:${support.phone.replace(/\s/g, '')}`} className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 hover:border-ink">
                <span className="flex size-11 items-center justify-center rounded-xl bg-yellow"><Phone className="size-5" /></span>
                <span><span className="block text-xs text-ink-500">{t.contact.call}</span><b>{support.phone}</b></span>
              </a>
            )}
            {support.whatsapp && (
              <a href={`https://wa.me/${support.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 hover:border-ink">
                <span className="flex size-11 items-center justify-center rounded-xl bg-green text-white"><MessageCircle className="size-5" /></span>
                <span><span className="block text-xs text-ink-500">{t.contact.whatsapp}</span><b>{support.whatsapp}</b></span>
              </a>
            )}
            {support.email && (
              <a href={`mailto:${support.email}`} className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 hover:border-ink">
                <span className="flex size-11 items-center justify-center rounded-xl bg-ink text-white"><Mail className="size-5" /></span>
                <span><span className="block text-xs text-ink-500">{t.contact.email}</span><b>{support.email}</b></span>
              </a>
            )}
            {support.hours && <p className="pl-1 text-sm text-ink-500">{support.hours}</p>}
          </div>
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">{t.contact.name}</span>
              <input required className={input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">{t.contact.phone}</span>
              <input required inputMode="tel" pattern="[0-9+\-\s]{10,15}" className={input} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} autoComplete="tel" />
            </label>
          </div>
          <fieldset className="mt-4">
            <legend className="mb-1.5 text-sm font-semibold">{t.contact.role}</legend>
            <div className="flex flex-wrap gap-2">
              {t.contact.roles.map((r) => (
                <button type="button" key={r} onClick={() => setForm((f) => ({ ...f, role: r }))} className={cn('h-10 rounded-xl border px-4 text-sm font-semibold', form.role === r ? 'border-ink bg-ink text-white' : 'border-ink-300 hover:border-ink')}>
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-semibold">{t.contact.message}</span>
            <textarea rows={3} className={cn(input, 'h-auto py-3')} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
          </label>
          {/* Honeypot: hidden from people, filled by bots. */}
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} aria-hidden="true" />
          {state.error && <p className="mt-4 rounded-xl bg-red-soft px-4 py-3 text-sm text-red-text">{state.error}</p>}
          {state.done && <p className="mt-4 rounded-xl bg-green-soft px-4 py-3 text-sm font-semibold text-green-text">{state.done}</p>}
          <button disabled={state.busy} className="mt-6 h-13 w-full rounded-xl bg-yellow py-3.5 text-[15px] font-bold text-ink hover:bg-yellow-dark disabled:opacity-60">
            {state.busy ? '…' : t.contact.send}
          </button>
        </form>
      </Container>
    </section>
  )
}

/* --------------------------------------------------------------- Footer */

export function Footer({ t }) {
  return (
    <footer className="bg-ink py-12 text-white">
      <Container className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="size-11 rounded-xl bg-white p-0.5" />
          <div>
            <div className="font-extrabold">Driver Finder</div>
            <div className="text-sm text-white/50">
              © {new Date().getFullYear()} Driver Finder. {t.footer.rights}
            </div>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
          <Link to="/terms" className="hover:text-white">{t.footer.terms}</Link>
          <Link to="/privacy" className="hover:text-white">{t.footer.privacy}</Link>
          <Link to="/refund" className="hover:text-white">{t.footer.refund}</Link>
          <Link to="/admin" className="hover:text-white">{t.footer.admin}</Link>
        </nav>
      </Container>
    </footer>
  )
}

/* ----------------------------------------------------------------- Page */

export default function Landing() {
  const [lang, setLang] = useLang()
  const t = T[lang]
  const [meta, setMeta] = useState(null)
  const [faq, setFaq] = useState([])

  useEffect(() => {
    api('/meta', { auth: false }).then(setMeta).catch(() => {})
    api('/cms/faq', { auth: false })
      .then((d) => Array.isArray(d.value) && setFaq(d.value))
      .catch(() => {})
  }, [])

  const categories = meta?.categories?.length ? meta.categories : FALLBACK_CATEGORIES

  return (
    <div className="min-h-screen bg-ink-50">
      <Nav t={t} lang={lang} setLang={setLang} />
      <Hero t={t} />
      <How t={t} />
      <Vehicles t={t} lang={lang} categories={categories} />
      <Why t={t} />
      <Plans t={t} plans={meta?.plans ?? []} fee={meta?.fees?.registration} />
      <LanguagesBand t={t} />
      <Faq t={t} faq={faq} />
      <Contact t={t} support={meta?.support ?? {}} />
      <Footer t={t} />
    </div>
  )
}
