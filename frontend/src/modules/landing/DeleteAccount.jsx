import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Smartphone } from 'lucide-react'
import { api } from '@/lib/api'
import logo from '@/assets/images/logo-mark.png'
import { Footer } from './Landing'
import { T } from './content'

/**
 * /delete-account: the public page Google Play asks for ("a link where users
 * can request that their account and data are deleted", without the app).
 * Written to match what the backend does (DELETE /api/me in me.controller.js).
 * The support email comes from Admin -> Content & support.
 */
export default function DeleteAccount() {
  const [email, setEmail] = useState('')
  useEffect(() => {
    document.title = 'Delete your account · Driver Finder'
    api('/cms/support', { auth: false })
      .then((d) => setEmail(d.value?.email || ''))
      .catch(() => {})
  }, [])

  const lang = localStorage.getItem('df.lang') === 'hi' ? 'hi' : 'en'
  const mailto = email ? `mailto:${email}?subject=${encodeURIComponent('Delete my account')}&body=${encodeURIComponent('Please delete my Driver Finder account.\nRegistered mobile number: ')}` : null

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

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 text-[15px] leading-relaxed text-ink-700">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Delete your Driver Finder account</h1>
        <p className="mt-3">
          You can delete your Driver Finder account and its data at any time, from the app or without it. <span lang="hi">आप कभी भी अपना खाता और उसका डेटा हटा सकते हैं।</span>
        </p>

        <section className="mt-8 rounded-2xl border border-ink-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Smartphone className="size-5" /> In the app
          </h2>
          <ol className="mt-3 list-decimal space-y-1 pl-6">
            <li>Open Driver Finder and sign in with your mobile number.</li>
            <li>Go to <b>Profile</b>.</li>
            <li>Tap <b>Delete account</b> and confirm.</li>
          </ol>
          <p className="mt-3">Your account is deleted straight away.</p>
        </section>

        <section className="mt-5 rounded-2xl border border-ink-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Mail className="size-5" /> Without the app
          </h2>
          <p className="mt-3">
            Email{' '}
            {mailto ? (
              <a href={mailto} className="font-semibold text-ink underline">
                {email}
              </a>
            ) : (
              'our support team'
            )}{' '}
            with the subject <b>“Delete my account”</b> and your registered mobile number. We confirm the request by SMS or a call to that number, then delete the account within 7 days.
          </p>
        </section>

        <h2 className="mt-10 text-xl font-bold text-ink">What is deleted</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          <li>Your name, city and profile photo</li>
          <li>Your verification documents (driving licence, Aadhaar, PAN)</li>
          <li>Your saved jobs and notification tokens</li>
          <li>Your active job posts are closed and no longer shown</li>
        </ul>

        <h2 className="mt-8 text-xl font-bold text-ink">What we keep, and for how long</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          <li>Your mobile number, to prevent fraud and repeat misuse</li>
          <li>Payment records (plan, amount, date), as tax law requires</li>
        </ul>
        <p className="mt-3">These are kept for up to 8 years and are not used for anything else. If you sign up again with the same number, you start with a new, empty account.</p>

        <p className="mt-8 text-sm text-ink-500">
          More detail: <Link to="/privacy" className="underline">Privacy policy</Link>
        </p>
      </main>
      <Footer t={T[lang]} />
    </div>
  )
}
