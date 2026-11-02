import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock,
  FileCheck2,
  Fuel,
  Gift,
  Languages,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  PhoneCall,
  Plus,
  ScanLine,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react'
import { api, fileUrl } from '@/lib/api'
import { cn, count, rupees } from '@/lib/format'
import { LANGUAGES, T } from './content'
import logo from '@/assets/images/logo-mark.png'
import pMahesh from '@/assets/images/driver-mahesh.jpg'
import pSuresh from '@/assets/images/driver-suresh.jpg'
import pImran from '@/assets/images/driver-imran.jpg'
import pArjun from '@/assets/images/driver-arjun.jpg'
import pRamesh from '@/assets/images/owner-ramesh.jpg'
import tTruck from '@/assets/images/t-truck.jpg'
import tTempo from '@/assets/images/t-tempo.jpg'
import tBigtruck from '@/assets/images/t-bigtruck.jpg'
import tBus from '@/assets/images/t-bus.jpg'
import tMinibus from '@/assets/images/t-minibus.jpg'
import tCar from '@/assets/images/t-car.jpg'
import tSuv from '@/assets/images/t-suv.jpg'
import vTruck from '@/assets/images/v-truck.jpg'
import vBigtruck from '@/assets/images/v-bigtruck.jpg'

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
const HERO_TILE = { truck: vTruck, bigtruck: vBigtruck }

function useLang() {
  const [lang, setLang] = useState(() => localStorage.getItem('df.lang') || (navigator.language?.startsWith('hi') ? 'hi' : 'en'))
  useEffect(() => {
    localStorage.setItem('df.lang', lang)
    document.documentElement.lang = lang
  }, [lang])
  return [lang, setLang]
}

/** Fades sections in as they scroll into view (skipped for reduced motion via CSS). */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.in)')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  })
}

function Container({ className, children }) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-5 sm:px-8', className)}>{children}</div>
}

function Eyebrow({ children, dark }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-[12.5px] font-semibold tracking-[0.14em] uppercase', dark ? 'text-yellow' : 'text-ink-500')}>
      <span className={cn('h-px w-6', dark ? 'bg-yellow' : 'bg-ink-400')} />
      {children}
    </span>
  )
}

function H2({ children, className, dark }) {
  return <h2 className={cn('font-display text-[34px] leading-[1.06] font-bold tracking-[-0.035em] sm:text-[48px]', dark ? 'text-white' : 'text-ink', className)}>{children}</h2>
}

function PlayButton({ t, light }) {
  const cls = cn(
    'group inline-flex h-14 items-center gap-3 rounded-full pr-6 pl-5 transition',
    light ? 'bg-white text-ink hover:bg-yellow' : 'bg-ink text-white hover:bg-ink-700'
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
      <span className="block text-[10.5px] font-semibold tracking-wide opacity-60">{PLAY_URL ? 'GET IT ON' : t.hero.soon.split(' ').slice(0, 2).join(' ').toUpperCase()}</span>
      <span className="block text-[15px] font-bold">Google Play</span>
    </span>
  )
  return PLAY_URL ? (
    <a href={PLAY_URL} target="_blank" rel="noreferrer" className={cls}>
      {icon}
      {label}
    </a>
  ) : (
    <span className={cn(cls, 'cursor-default')} title={t.hero.soon}>
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
    const h = () => setScrolled(window.scrollY > 24)
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
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        className={cn(
          'mx-auto flex h-14 max-w-[1200px] items-center gap-4 rounded-full pr-2 pl-3 transition-all duration-300',
          scrolled || open ? 'bg-ink-950/90 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.5)] ring-1 ring-white/10 backdrop-blur-xl' : 'bg-transparent'
        )}
      >
        <a href="#top" className="flex items-center gap-2.5">
          <img src={logo} alt="" className="size-9 rounded-full bg-white p-0.5" />
          <span className="font-display text-[16px] font-bold tracking-tight text-white">Driver Finder</span>
        </a>
        <nav className="ml-auto hidden items-center lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-3.5 py-2 text-[14px] font-medium text-white/65 transition hover:text-white">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 lg:ml-2">
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold text-white/80 ring-1 ring-white/15 transition hover:text-white hover:ring-white/35"
            aria-label="Change language"
          >
            <Languages className="size-4" />
            {lang === 'en' ? 'हिन्दी' : 'English'}
          </button>
          <a href="#get" className="hidden h-10 items-center gap-1.5 rounded-full bg-yellow px-4.5 text-[14px] font-bold text-ink transition hover:bg-white sm:inline-flex">
            {t.nav.getApp}
            <ArrowRight className="size-4" />
          </a>
          <button className="flex size-10 items-center justify-center rounded-full text-white lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="mx-auto mt-2 max-w-[1200px] overflow-hidden rounded-3xl bg-ink-950/95 p-2 ring-1 ring-white/10 backdrop-blur-xl lg:hidden">
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-2xl px-4 py-3.5 font-medium text-white/85 hover:bg-white/5">
              {label}
              <ArrowRight className="size-4 text-white/30" />
            </a>
          ))}
        </div>
      )}
    </header>
  )
}

/* ----------------------------------------------------------------- Hero */

/** A road network drawn as lines, with one yellow route being driven. */
function RouteField() {
  const n = [
    [80, 140], [260, 90], [420, 210], [640, 120], [820, 260], [1010, 150], [1160, 300],
    [150, 380], [360, 470], [560, 400], [760, 520], [960, 430], [1120, 560], [240, 640], [520, 680], [860, 700],
  ]
  const e = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 7], [7, 8], [2, 9], [8, 9], [9, 10], [4, 10], [10, 11], [5, 11], [11, 12], [6, 12], [8, 13], [13, 14], [9, 14], [14, 15], [10, 15], [12, 15]]
  const route = [7, 8, 9, 4, 5, 6]
  return (
    <svg viewBox="0 0 1240 760" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <pattern id="hero-dots" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="white" opacity="0.06" />
        </pattern>
        <radialGradient id="hero-fade" cx="50%" cy="40%" r="70%">
          <stop offset="0.3" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="hero-mask">
          <rect width="1240" height="760" fill="url(#hero-fade)" />
        </mask>
      </defs>
      <rect width="1240" height="760" fill="url(#hero-dots)" />
      <g mask="url(#hero-mask)">
        {e.map(([a, b], i) => (
          <line key={i} x1={n[a][0]} y1={n[a][1]} x2={n[b][0]} y2={n[b][1]} stroke="white" strokeOpacity="0.07" strokeWidth="1.5" />
        ))}
        <polyline points={route.map((i) => n[i].join(',')).join(' ')} fill="none" stroke="#febe02" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round" className="route-dash" />
        {n.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={route.includes(i) ? 3.5 : 2.5} fill={route.includes(i) ? '#febe02' : '#3a3a36'} />
        ))}
      </g>
    </svg>
  )
}

function PhoneMock({ t }) {
  const drivers = [
    [pMahesh, 'Mahesh Patil', '12 yrs · HMV · Nashik', 'Truck'],
    [pSuresh, 'Suresh Yadav', '8 yrs · LMV · Thane', 'Tempo'],
    [pImran, 'Imran Shaikh', '10 yrs · HMV · Pune', 'Big Truck'],
    [pArjun, 'Arjun Rathore', '6 yrs · LMV · Jaipur', 'SUV'],
  ]
  return (
    <div className="relative mx-auto w-[300px] sm:w-[320px]">
      <div className="relative rounded-[48px] bg-gradient-to-b from-[#2b2b28] to-[#121211] p-[10px] shadow-[0_40px_80px_-20px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.12)] ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[39px] bg-ink-50 text-ink">
          <div className="absolute top-2.5 left-1/2 z-10 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
          <div className="bg-ink px-5 pt-11 pb-5 text-white">
            <div className="text-[11px] text-white/50">Good morning, Ramesh</div>
            <div className="mt-0.5 font-display text-[19px] font-bold tracking-tight">Available drivers</div>
            <div className="mt-3 flex gap-1.5 text-[11px] font-semibold">
              <span className="rounded-full bg-yellow px-2.5 py-1 text-ink">All</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">Truck</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">Tempo</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">Bus</span>
            </div>
          </div>
          <div className="space-y-2 p-3">
            {drivers.map(([img, name, sub, tag]) => (
              <div key={name} className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-card">
                <img src={img} alt="" className="size-10 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[13px] font-bold">
                    {name}
                    <BadgeCheck className="size-3.5 text-green" />
                  </div>
                  <div className="truncate text-[11px] text-ink-500">{sub}</div>
                </div>
                <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">{tag}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-around border-t border-ink-200 bg-white px-4 pt-2.5 pb-4 text-[10px] font-semibold text-ink-400">
            <span className="text-ink">Home</span>
            <span>Jobs</span>
            <span>Chats</span>
            <span>Profile</span>
          </div>
        </div>
      </div>

      {/* Floating proof around the phone */}
      <div className="float-a absolute bottom-24 -left-24 hidden w-[232px] rounded-2xl bg-white p-3.5 text-ink shadow-[0_24px_48px_-12px_rgb(0_0_0/0.45)] sm:block lg:-left-40">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-500">
          <span className="flex size-6 items-center justify-center rounded-full bg-green-soft">
            <ShieldCheck className="size-3.5 text-green" />
          </span>
          KYC review
          <span className="ml-auto text-ink-400">just now</span>
        </div>
        <div className="mt-2 text-[13.5px] font-bold">Licence and Aadhaar verified</div>
        <div className="mt-2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 flex-1 rounded-full bg-green" />
          ))}
        </div>
      </div>

      <div className="float-b absolute top-40 -right-20 hidden w-[220px] rounded-2xl bg-yellow p-3.5 text-ink shadow-[0_24px_48px_-12px_rgb(0_0_0/0.45)] sm:block lg:-right-32">
        <div className="text-[11px] font-semibold opacity-70">Truck · Mumbai ⇄ Ahmedabad</div>
        <div className="mt-1 font-display text-[22px] leading-none font-bold tracking-tight tabular">
          ₹28,000<span className="text-[12px] font-semibold opacity-60">{t.hero.perMonth}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-semibold">
          <span className="flex -space-x-1.5">
            {[pMahesh, pSuresh, pImran].map((p) => (
              <img key={p} src={p} alt="" className="size-5 rounded-full object-cover ring-2 ring-yellow" />
            ))}
          </span>
          14 {t.hero.applicants}
        </div>
      </div>

      <div className="float-a absolute -top-4 -left-16 hidden items-center gap-2 rounded-full bg-ink-800 py-1.5 pr-3.5 pl-1.5 text-[12px] font-semibold text-white shadow-pop ring-1 ring-white/10 sm:flex lg:-left-28">
        <img src={pRamesh} alt="" className="size-7 rounded-full object-cover" />
        Can you start Monday?
      </div>
    </div>
  )
}

function Hero({ t, stats }) {
  return (
    <section id="top" className="relative overflow-hidden bg-ink-950 text-white">
      <RouteField />
      <div className="pointer-events-none absolute top-[-20%] right-[-10%] size-[720px] rounded-full bg-yellow/[0.09] blur-[120px]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-ink-950 via-ink-950/75 to-transparent lg:w-[62%]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-full bg-gradient-to-t from-ink-950 to-transparent" />

      <Container className="relative grid items-center gap-16 pt-36 pb-20 lg:grid-cols-[1.15fr_1fr] lg:pt-44 lg:pb-28">
        <div className="reveal">
          <span className="inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] py-1.5 pr-4 pl-1.5 text-[13px] font-medium text-white/75 ring-1 ring-white/10">
            <span className="rounded-full bg-yellow px-2 py-0.5 text-[11px] font-bold text-ink">LIVE</span>
            {t.hero.kicker}
          </span>
          <h1 className="mt-7 font-display text-[46px] leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-[68px] xl:text-[78px]">
            {t.hero.title1}
            <br />
            <span className="text-yellow">{t.hero.title2}</span>
          </h1>
          <p className="mt-7 max-w-[540px] text-[17px] leading-relaxed text-white/60 sm:text-[18px]">{t.hero.text}</p>
          <div id="get" className="mt-9 flex scroll-mt-32 flex-wrap items-center gap-3">
            <PlayButton t={t} light />
            <a href="#how" className="inline-flex h-14 items-center gap-2 rounded-full px-6 font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/5 hover:ring-white/40">
              {t.nav.how}
              <ArrowRight className="size-4" />
            </a>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5 text-[14px] text-white/55">
            {t.trust.map((x) => (
              <li key={x} className="flex items-center gap-2">
                <span className="flex size-4.5 items-center justify-center rounded-full bg-yellow/15">
                  <Check className="size-3 text-yellow" strokeWidth={3} />
                </span>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal [transition-delay:150ms]">
          <PhoneMock t={t} />
        </div>
      </Container>

      <Container className="relative pb-16">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/[0.08] ring-1 ring-white/[0.08] sm:grid-cols-3 lg:grid-cols-5">
          {[
            [stats ? count(stats.drivers) : '—', t.stats.drivers],
            [stats ? count(stats.owners) : '—', t.stats.owners],
            [stats ? count(stats.jobs) : '—', t.stats.jobs],
            ['9', t.stats.langs],
            ['₹0', t.stats.commission],
          ].map(([v, k], i) => (
            <div key={k} className={cn('flex flex-col-reverse bg-ink-950 px-6 py-6', i === 4 && 'col-span-2 sm:col-span-1')}>
              <dt className="mt-2 text-[13px] text-white/45">{k}</dt>
              <dd className="font-display text-[34px] leading-none font-bold tracking-[-0.03em] tabular">{v}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}

/* ---------------------------------------------------------- Two sides */

function SideCard({ dark, title, text, steps, label, cta }) {
  return (
    <div className={cn('reveal relative flex flex-col overflow-hidden rounded-[32px] p-8 sm:p-10', dark ? 'bg-ink-950 text-white' : 'bg-yellow text-ink')}>
      <span className={cn('inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold tracking-wide uppercase', dark ? 'bg-white/10 text-yellow' : 'bg-ink text-yellow')}>{label}</span>
      <h3 className="mt-6 font-display text-[30px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[38px]">{title}</h3>
      <p className={cn('mt-4 max-w-md text-[16px] leading-relaxed', dark ? 'text-white/60' : 'text-ink/70')}>{text}</p>
      <ol className="mt-9 flex-1 space-y-0">
        {steps.map(([title, text], i) => (
          <li key={title} className={cn('grid grid-cols-[44px_1fr] gap-4 border-t py-4', dark ? 'border-white/10' : 'border-ink/15')}>
            <span className={cn('font-display text-[14px] font-bold tabular', dark ? 'text-yellow' : 'text-ink/50')}>0{i + 1}</span>
            <span>
              <span className="block text-[16px] font-semibold">{title}</span>
              <span className={cn('mt-1 block text-[14px] leading-relaxed', dark ? 'text-white/50' : 'text-ink/65')}>{text}</span>
            </span>
          </li>
        ))}
      </ol>
      <a href="#get" className={cn('mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-full px-5 text-[14.5px] font-bold transition', dark ? 'bg-yellow text-ink hover:bg-white' : 'bg-ink text-white hover:bg-ink-700')}>
        {cta}
        <ArrowUpRight className="size-4" />
      </a>
    </div>
  )
}

function Sides({ t }) {
  return (
    <section id="how" className="scroll-mt-20 bg-ink-50 py-24 sm:py-32">
      <Container>
        <div className="reveal max-w-3xl">
          <Eyebrow>{t.sides.eyebrow}</Eyebrow>
          <H2 className="mt-5">{t.sides.title}</H2>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <SideCard dark label={t.how.driver} title={t.sides.driverTitle} text={t.sides.driverText} steps={t.how.driverSteps} cta={t.hero.ctaDriver} />
          <SideCard label={t.how.owner} title={t.sides.ownerTitle} text={t.sides.ownerText} steps={t.how.ownerSteps} cta={t.hero.ctaOwner} />
        </div>
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------- Vehicles */

function Vehicles({ t, lang, categories }) {
  return (
    <section id="vehicles" className="scroll-mt-20 bg-white py-24 sm:py-32">
      <Container>
        <div className="reveal flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Eyebrow>{t.nav.vehicles}</Eyebrow>
            <H2 className="mt-5">{t.vehicles.title}</H2>
          </div>
          <p className="max-w-sm text-[16px] leading-relaxed text-ink-500">{t.vehicles.sub}</p>
        </div>
        <div className="mt-14 grid auto-rows-[220px] grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c, i) => {
            const big = i < 2
            return (
              <div
                key={c.key}
                className={cn(
                  'reveal group relative flex flex-col overflow-hidden rounded-[28px] bg-ink-50 ring-1 ring-ink-200/70 transition duration-500 hover:ring-ink-300',
                  big && 'col-span-2 row-span-2 md:col-span-2'
                )}
              >
                <div className="flex items-start justify-between p-5 sm:p-6">
                  <div>
                    <div className={cn('font-display font-bold tracking-[-0.03em]', big ? 'text-[28px] sm:text-[34px]' : 'text-[19px]')}>{(lang === 'hi' && c.labels?.hi) || c.label}</div>
                    {big && <div className="mt-1 text-[14px] text-ink-500">{c.key === 'bigtruck' ? 'Bag · Bulker · Container' : 'HMV · Long haul · City'}</div>}
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-full bg-white text-ink-400 ring-1 ring-ink-200 transition group-hover:bg-yellow group-hover:text-ink group-hover:ring-yellow">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-x-4 bottom-3 top-0 overflow-hidden rounded-[20px] bg-white">
                    <img
                      src={(big && HERO_TILE[c.key]) || LOCAL_TILE[c.key] || fileUrl(c.image)}
                      alt={c.label}
                      loading="lazy"
                      className="size-full object-contain p-3 transition duration-700 group-hover:scale-[1.05]"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

/* ----------------------------------------------------------------- Bento */

function Tile({ className, children, dark }) {
  return <div className={cn('reveal relative overflow-hidden rounded-[28px] p-7 sm:p-8', dark ? 'bg-ink-900 text-white ring-1 ring-white/[0.07]' : 'bg-white ring-1 ring-ink-200/70', className)}>{children}</div>
}

function TileText({ title, text, dark }) {
  return (
    <div>
      <h3 className="font-display text-[22px] font-bold tracking-[-0.025em]">{title}</h3>
      <p className={cn('mt-2 max-w-md text-[15px] leading-relaxed', dark ? 'text-white/55' : 'text-ink-500')}>{text}</p>
    </div>
  )
}

function Bento({ t }) {
  const b = t.bento
  return (
    <section className="relative overflow-hidden bg-ink-950 py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute top-1/3 left-1/2 size-[800px] -translate-x-1/2 rounded-full bg-yellow/[0.05] blur-[140px]" />
      <Container className="relative">
        <div className="reveal max-w-2xl">
          <Eyebrow dark>{b.eyebrow}</Eyebrow>
          <H2 dark className="mt-5">
            {b.title}
          </H2>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          {/* Verification: the core promise, shown as the actual review flow. */}
          <Tile dark className="lg:col-span-4">
            <TileText dark title={b.verify[0]} text={b.verify[1]} />
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                [ScanLine, 'Driving licence', b.steps[0], 'bg-white/10 text-white/70'],
                [FileCheck2, 'Aadhaar card', b.steps[1], 'bg-yellow/15 text-yellow'],
                [BadgeCheck, 'Profile', b.steps[2], 'bg-green/20 text-[#5fd38a]'],
              ].map(([Icon, doc, state, cls], i) => (
                <div key={doc} className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <Icon className="size-5 text-white/60" />
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', cls)}>{state}</span>
                  </div>
                  <div className="mt-6 h-2 w-3/4 rounded-full bg-white/10" />
                  <div className="mt-1.5 h-2 w-1/2 rounded-full bg-white/[0.06]" />
                  <div className="mt-4 text-[13px] font-semibold text-white/80">{doc}</div>
                  <div className="mt-3 flex gap-1">
                    {[0, 1, 2].map((k) => (
                      <span key={k} className={cn('h-1 flex-1 rounded-full', k <= i ? (i === 2 ? 'bg-[#5fd38a]' : 'bg-yellow') : 'bg-white/10')} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Tile>

          {/* Zero commission */}
          <Tile className="flex flex-col justify-between bg-yellow text-ink ring-0 lg:col-span-2">
            <div className="font-display text-[96px] leading-[0.85] font-extrabold tracking-[-0.06em]">₹0</div>
            <div className="mt-10">
              <h3 className="font-display text-[22px] font-bold tracking-[-0.025em]">{b.commission[0]}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{b.commission[1]}</p>
            </div>
          </Tile>

          {/* Direct contact */}
          <Tile dark className="lg:col-span-2">
            <div className="space-y-2.5">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-yellow px-3.5 py-2 text-[13px] font-medium text-ink">Is the Pune route still open?</div>
              <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2 text-[13px] text-white/85">Yes. Food and stay included.</div>
            </div>
            <div className="mt-5 flex gap-2">
              {[
                [PhoneCall, 'Call'],
                [MessageCircle, 'WhatsApp'],
              ].map(([Icon, l]) => (
                <span key={l} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/75 ring-1 ring-white/10">
                  <Icon className="size-3.5" />
                  {l}
                </span>
              ))}
            </div>
            <div className="mt-8">
              <TileText dark title={b.contact[0]} text={b.contact[1]} />
            </div>
          </Tile>

          {/* Languages */}
          <Tile dark className="lg:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map(([native, en], i) => (
                <span key={en} title={en} className={cn('rounded-full px-3 py-1.5 text-[14px] font-semibold', i === 0 ? 'bg-yellow text-ink' : 'bg-white/[0.06] text-white/80 ring-1 ring-white/10')}>
                  {native}
                </span>
              ))}
            </div>
            <div className="mt-8">
              <TileText dark title={b.langs[0]} text={b.langs[1]} />
            </div>
          </Tile>

          {/* Truck job details */}
          <Tile dark className="lg:col-span-2">
            <div className="divide-y divide-white/[0.08] rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
              {[
                [Clock, 'Idle allowance', '₹200/day after 48 h'],
                [Fuel, 'Diesel mileage', '2.75 km/l'],
                [Gift, 'Bonus', 'On every trip'],
              ].map(([Icon, k, v]) => (
                <div key={k} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                  <Icon className="size-4 text-yellow" />
                  <span className="text-white/60">{k}</span>
                  <span className="ml-auto font-semibold tabular">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <TileText dark title={b.truck[0]} text={b.truck[1]} />
            </div>
          </Tile>
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
    <section id="plans" className="scroll-mt-20 bg-ink-50 py-24 sm:py-32">
      <Container>
        <div className="reveal flex flex-col items-center text-center">
          <Eyebrow>{t.nav.plans}</Eyebrow>
          <H2 className="mt-5">{t.plans.title}</H2>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-500">{t.plans.sub}</p>
          <div className="mt-8 inline-flex rounded-full bg-white p-1 ring-1 ring-ink-200">
            {['driver', 'owner'].map((r) => (
              <button key={r} onClick={() => setRole(r)} className={cn('h-11 rounded-full px-6 text-[14px] font-semibold transition', role === r ? 'bg-ink text-white shadow-soft' : 'text-ink-500 hover:text-ink')}>
                {r === 'driver' ? t.plans.driver : t.plans.owner}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl items-stretch gap-4 md:grid-cols-3">
          {list.map((p) => {
            const hero = p.tag?.toLowerCase().includes('popular')
            const perMonth = p.price && p.months > 1 ? Math.round(p.price / p.months) : null
            return (
              <div
                key={p.id}
                className={cn('reveal relative flex flex-col rounded-[28px] p-8', hero ? 'bg-ink-950 text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45)] md:-my-4 md:py-12' : 'bg-white ring-1 ring-ink-200/70')}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold opacity-80">{p.name}</span>
                  {p.tag && <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold', hero ? 'bg-yellow text-ink' : 'bg-ink-100 text-ink-600')}>{hero && <Star className="size-3 fill-current" />}{p.tag}</span>}
                </div>
                <div className="mt-7 font-display text-[52px] leading-none font-extrabold tracking-[-0.045em] tabular">{p.price ? rupees(p.price) : <span className="text-[26px]">{t.plans.atLaunch}</span>}</div>
                <div className={cn('mt-2 text-[14px]', hero ? 'text-white/50' : 'text-ink-500')}>
                  {t.plans.for} {p.months} {p.months === 1 ? t.plans.month : t.plans.months}
                  {perMonth && ` · ${rupees(perMonth)}/${t.plans.month}`}
                </div>
                <ul className={cn('mt-8 flex-1 space-y-3 border-t pt-7 text-[14.5px]', hero ? 'border-white/10' : 'border-ink-100')}>
                  {p.benefits.map((x) => (
                    <li key={x} className="flex gap-3">
                      <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full', hero ? 'bg-yellow text-ink' : 'bg-ink text-white')}>
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span className={hero ? 'text-white/80' : 'text-ink-600'}>{x}</span>
                    </li>
                  ))}
                </ul>
                <a href="#get" className={cn('mt-8 inline-flex h-12 items-center justify-center rounded-full text-[14.5px] font-bold transition', hero ? 'bg-yellow text-ink hover:bg-white' : 'bg-ink-50 text-ink ring-1 ring-ink-200 hover:bg-ink hover:text-white')}>
                  {t.nav.getApp}
                </a>
              </div>
            )
          })}
        </div>
        {fee ? <p className="reveal mt-12 text-center text-[14px] text-ink-500">{t.plans.reg.replace('{fee}', rupees(fee))}</p> : null}
      </Container>
    </section>
  )
}

/* ------------------------------------------------------------------ FAQ */

function Faq({ t, faq }) {
  const [open, setOpen] = useState(0)
  if (!faq.length) return null
  return (
    <section id="faq" className="scroll-mt-20 bg-white py-24 sm:py-32">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="reveal lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>{t.nav.faq}</Eyebrow>
          <H2 className="mt-5">{t.faq.title}</H2>
          <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-ink-500">{t.faqSub}</p>
          <a href="#contact" className="mt-7 inline-flex items-center gap-2 text-[15px] font-semibold underline decoration-yellow decoration-2 underline-offset-[6px] hover:decoration-ink">
            {t.contact.title}
            <ArrowRight className="size-4" />
          </a>
        </div>
        <div className="reveal divide-y divide-ink-200 border-y border-ink-200">
          {faq.map((f, i) => {
            const on = open === i
            return (
              <div key={f.q}>
                <button onClick={() => setOpen(on ? -1 : i)} className="flex w-full items-center justify-between gap-6 py-6 text-left" aria-expanded={on}>
                  <span className="font-display text-[18px] font-semibold tracking-[-0.015em] sm:text-[19px]">{f.q}</span>
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full transition duration-300', on ? 'rotate-45 bg-yellow' : 'bg-ink-50 ring-1 ring-ink-200')}>
                    <Plus className="size-4" />
                  </span>
                </button>
                <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out', on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pr-12 pb-6 text-[15.5px] leading-relaxed text-ink-500">{f.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

/* -------------------------------------------------------------- Contact */

function Contact({ t, support }) {
  const [form, setForm] = useState({ name: '', phone: '', role: t.contact.roles[0], message: '', website: '' })
  const [state, setState] = useState({ busy: false, done: null, error: null })
  const roles = useRef(t.contact.roles)
  useEffect(() => {
    // Keep the chosen role in the current language when it changes.
    const i = roles.current.indexOf(form.role)
    roles.current = t.contact.roles
    if (i >= 0) setForm((f) => ({ ...f, role: t.contact.roles[i] }))
  }, [t]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const input =
    'h-12 w-full rounded-2xl border border-ink-200 bg-ink-50/60 px-4 text-[15px] outline-none transition placeholder:text-ink-400 hover:border-ink-300 focus:border-ink focus:bg-white focus:ring-4 focus:ring-yellow/30'
  const channels = [
    support.phone && [Phone, t.contact.call, support.phone, `tel:${support.phone.replace(/\s/g, '')}`],
    support.whatsapp && [MessageCircle, t.contact.whatsapp, support.whatsapp, `https://wa.me/${support.whatsapp.replace(/\D/g, '')}`],
    support.email && [Mail, t.contact.email, support.email, `mailto:${support.email}`],
  ].filter(Boolean)

  return (
    <section id="contact" className="scroll-mt-20 bg-ink-50 py-24 sm:py-32">
      <Container>
        <div className="reveal relative overflow-hidden rounded-[36px] bg-ink-950 text-white">
          <RouteField />
          <div className="pointer-events-none absolute -bottom-40 -left-20 size-[520px] rounded-full bg-yellow/[0.12] blur-[120px]" />
          <div className="relative grid gap-12 p-8 sm:p-12 lg:grid-cols-[1fr_1.05fr] lg:p-16">
            <div className="flex flex-col">
              <Eyebrow dark>{t.nav.getApp}</Eyebrow>
              <h2 className="mt-5 font-display text-[36px] leading-[1.02] font-extrabold tracking-[-0.04em] sm:text-[52px]">{t.cta.title}</h2>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/55">{t.cta.sub}</p>
              <div className="mt-8">
                <PlayButton t={t} light />
              </div>
              <div className="mt-auto space-y-2 pt-12">
                {channels.map(([Icon, label, value, href]) => (
                  <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="group flex items-center gap-4 rounded-2xl px-1 py-2">
                    <span className="flex size-11 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/10 transition group-hover:bg-yellow group-hover:text-ink">
                      <Icon className="size-[18px]" />
                    </span>
                    <span>
                      <span className="block text-[12px] text-white/40">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </span>
                  </a>
                ))}
                {support.hours && <p className="pt-1 pl-1 text-[13px] text-white/35">{support.hours}</p>}
              </div>
            </div>

            <form onSubmit={submit} className="rounded-[28px] bg-white p-6 text-ink shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)] sm:p-8">
              <h3 className="font-display text-[22px] font-bold tracking-[-0.025em]">{t.contact.title}</h3>
              <p className="mt-1 text-[14.5px] text-ink-500">{t.contact.sub}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">{t.contact.name}</span>
                  <input required className={input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">{t.contact.phone}</span>
                  <input required inputMode="tel" pattern="[0-9+\-\s]{10,15}" className={input} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} autoComplete="tel" placeholder="98765 43210" />
                </label>
              </div>
              <fieldset className="mt-5">
                <legend className="mb-2 text-[13px] font-semibold text-ink-700">{t.contact.role}</legend>
                <div className="flex flex-wrap gap-2">
                  {t.contact.roles.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setForm((f) => ({ ...f, role: r }))}
                      className={cn('h-10 rounded-full px-4 text-[13.5px] font-semibold transition', form.role === r ? 'bg-ink text-white' : 'bg-ink-50 text-ink-600 ring-1 ring-ink-200 hover:ring-ink-400')}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="mt-5 block">
                <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">{t.contact.message}</span>
                <textarea rows={3} className={cn(input, 'h-auto py-3')} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
              </label>
              {/* Honeypot: hidden from people, filled by bots. */}
              <input type="text" tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} aria-hidden="true" />
              {state.error && <p className="mt-4 rounded-2xl bg-red-soft px-4 py-3 text-[14px] text-red-text">{state.error}</p>}
              {state.done && (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-soft px-4 py-3 text-[14px] font-semibold text-green-text">
                  <BadgeCheck className="size-4" />
                  {state.done}
                </p>
              )}
              <button disabled={state.busy} className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-yellow text-[15px] font-bold text-ink transition hover:bg-ink hover:text-white disabled:opacity-60">
                {state.busy ? '…' : t.contact.send}
                {!state.busy && <ArrowRight className="size-4" />}
              </button>
            </form>
          </div>
        </div>
      </Container>
    </section>
  )
}

/* --------------------------------------------------------------- Footer */

export function Footer({ t }) {
  return (
    <footer className="relative overflow-hidden bg-ink-950 pt-16 text-white">
      <Container>
        <div className="flex flex-col gap-10 border-b border-white/10 pb-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-3">
              <img src={logo} alt="" className="size-10 rounded-full bg-white p-0.5" />
              <span className="font-display text-[17px] font-bold tracking-tight">Driver Finder</span>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-white/45">{t.hero.text.split('.')[0]}.</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-14 gap-y-3 text-[14px] text-white/60">
            <a href="/#how" className="hover:text-white">{t.nav.how}</a>
            <Link to="/terms" className="hover:text-white">{t.footer.terms}</Link>
            <a href="/#plans" className="hover:text-white">{t.nav.plans}</a>
            <Link to="/privacy" className="hover:text-white">{t.footer.privacy}</Link>
            <a href="/#faq" className="hover:text-white">{t.nav.faq}</a>
            <Link to="/refund" className="hover:text-white">{t.footer.refund}</Link>
            <a href="/#contact" className="hover:text-white">{t.nav.contact}</a>
            <Link to="/admin" className="hover:text-white">{t.footer.admin}</Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-6 text-[13px] text-white/35">
          <span>
            © {new Date().getFullYear()} Driver Finder. {t.footer.rights}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> Made in India
          </span>
        </div>
      </Container>
      <div aria-hidden="true" className="pointer-events-none -mb-[0.22em] text-center font-display text-[17vw] leading-none font-extrabold tracking-[-0.06em] whitespace-nowrap text-white/[0.04] select-none">
        Driver Finder
      </div>
    </footer>
  )
}

/* ----------------------------------------------------------------- Page */

export default function Landing() {
  const [lang, setLang] = useLang()
  const t = T[lang]
  const [meta, setMeta] = useState(null)
  const [faq, setFaq] = useState([])
  const [stats, setStats] = useState(null)
  useReveal()

  useEffect(() => {
    api('/meta', { auth: false }).then(setMeta).catch(() => {})
    api('/stats', { auth: false }).then(setStats).catch(() => {})
    api('/cms/faq', { auth: false })
      .then((d) => Array.isArray(d.value) && setFaq(d.value))
      .catch(() => {})
  }, [])

  const categories = meta?.categories?.length ? meta.categories : FALLBACK_CATEGORIES

  return (
    <div className="landing min-h-screen bg-ink-50">
      <Nav t={t} lang={lang} setLang={setLang} />
      <Hero t={t} stats={stats} />
      <Sides t={t} />
      <Vehicles t={t} lang={lang} categories={categories} />
      <Bento t={t} />
      <Plans t={t} plans={meta?.plans ?? []} fee={meta?.fees?.registration} />
      <Faq t={t} faq={faq} />
      <Contact t={t} support={meta?.support ?? {}} />
      <Footer t={t} />
    </div>
  )
}
