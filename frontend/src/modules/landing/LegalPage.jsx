import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { date } from '@/lib/format'
import { PageLoader } from '@/components/ui'
import logo from '@/assets/images/logo-mark.png'
import { Footer } from './Landing'
import { T } from './content'

const TITLES = { terms: 'Terms of use', privacy: 'Privacy policy', refund: 'Refund policy' }

/** Plain text from the admin: blank line = paragraph, "# " = heading, "- " = list item. */
function Rich({ text }) {
  const blocks = String(text || '').split(/\n\s*\n/)
  return blocks.map((b, i) => {
    const lines = b.split('\n')
    if (b.startsWith('# ')) return <h2 key={i} className="mt-8 text-xl font-bold">{b.slice(2)}</h2>
    if (lines.every((l) => l.trim().startsWith('- '))) {
      return (
        <ul key={i} className="mt-4 list-disc space-y-1 pl-6">
          {lines.map((l) => <li key={l}>{l.trim().slice(2)}</li>)}
        </ul>
      )
    }
    return <p key={i} className="mt-4 leading-relaxed whitespace-pre-line">{b}</p>
  })
}

export default function LegalPage({ page }) {
  const [doc, setDoc] = useState(null)
  useEffect(() => {
    document.title = `${TITLES[page]} · Driver Finder`
    api(`/cms/${page}`, { auth: false })
      .then(setDoc)
      .catch(() => setDoc({ value: 'This page could not be loaded. Please try again later.' }))
  }, [page])

  const lang = localStorage.getItem('df.lang') === 'hi' ? 'hi' : 'en'
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="size-9" />
            <span className="font-extrabold">Driver Finder</span>
          </Link>
          <Link to="/" className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">{TITLES[page]}</h1>
        {doc?.updatedAt && <p className="mt-2 text-sm text-ink-500">Last updated {date(doc.updatedAt)}</p>}
        <div className="mt-6 text-[15px] text-ink-700">{doc ? <Rich text={doc.value} /> : <PageLoader />}</div>
      </main>
      <Footer t={T[lang]} />
    </div>
  )
}
