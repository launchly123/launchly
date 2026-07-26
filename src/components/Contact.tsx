import { useId, useState } from 'react'
import { config } from '../content/content'
import { useLang } from '../lib/i18n'
import { formAsMessage, messageOpener, smsUrl } from '../lib/links'
import { Button, ButtonLink } from './Button'
import { SectionHeader } from './SectionHeader'

type Fields = { name: string; business: string; need: string }
type Errors = Partial<Record<keyof Fields, string>> & { form?: string }
type Status = 'idle' | 'sending' | 'sent'

const EMPTY: Fields = { name: '', business: '', need: '' }

export function Contact({ index }: { index: number }) {
  const { lang, t } = useLang()
  const uid = useId()

  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }))
  }

  function validate(): Errors {
    const next: Errors = {}
    if (!fields.name.trim()) next.name = t.contact.form.errors.name
    if (!fields.business.trim()) next.business = t.contact.form.errors.business
    if (!fields.need.trim()) next.need = t.contact.form.errors.need
    return next
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Move focus to the first problem so keyboard and screen-reader users
      // aren't left guessing what failed.
      const first = (['name', 'business', 'need'] as const).find((k) => found[k])
      if (first) document.getElementById(`${uid}-${first}`)?.focus()
      return
    }

    setStatus('sending')

    // No endpoint configured → hand off to the messages app, pre-written.
    // Assigning location (rather than window.open) keeps the OS handoff on the
    // same tab; `sms:` in a popup leaves a blank window behind on desktop.
    if (!config.formEndpoint) {
      window.location.href = smsUrl(formAsMessage(lang, fields))
      setStatus('sent')
      setFields(EMPTY)
      return
    }

    try {
      const res = await fetch(config.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...fields, language: lang }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('sent')
      setFields(EMPTY)
    } catch {
      setStatus('idle')
      setErrors({ form: t.contact.form.errors.generic })
    }
  }

  const field = (key: keyof Fields) => ({
    id: `${uid}-${key}`,
    name: key,
    value: fields[key],
    onChange: set(key),
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${uid}-${key}-error` : undefined,
    /* text-base = 16px so iOS Safari doesn't zoom the page on focus. */
    className:
      'mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-muted/70 focus:border-muted/60 aria-[invalid]:border-red-400/70',
  })

  const labelClass = 'block text-sm text-muted'
  const errorClass = 'mt-2 text-sm text-red-400'

  return (
    <section
      id="contact"
      className="section"
      data-nav-label={t.contact.label}
      data-handoff
    >
      <div className="shell">
        <SectionHeader
          index={index}
          label={t.contact.label}
          heading={t.contact.heading}
        />

        <div data-reveal-group className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Texting is the primary action — it converts, forms don't. */}
          <div>
            <p className="measure text-lg text-muted">{t.contact.body}</p>

            <ButtonLink
              href={smsUrl(messageOpener(lang))}
              className="mt-8 w-full sm:w-auto"
            >
              {t.contact.messageCta}
            </ButtonLink>

            <p className="eyebrow mt-4">
              {t.contact.messageNote}{' '}
              <span className="text-text">{config.contact.phoneDisplay}</span>
            </p>

            <p className="mt-10">
              <a
                href={config.contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-link text-muted underline decoration-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
              >
                {t.contact.instagramCta} — {config.contact.instagramHandle}
              </a>
            </p>
          </div>

          <div>
            <p className="eyebrow">{t.contact.or}</p>

            <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
              <div>
                <label htmlFor={`${uid}-name`} className={labelClass}>
                  {t.contact.form.nameLabel}
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder={t.contact.form.namePlaceholder}
                  {...field('name')}
                />
                {errors.name && (
                  <p id={`${uid}-name-error`} className={errorClass}>
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={`${uid}-business`} className={labelClass}>
                  {t.contact.form.businessLabel}
                </label>
                <input
                  type="text"
                  autoComplete="organization"
                  placeholder={t.contact.form.businessPlaceholder}
                  {...field('business')}
                />
                {errors.business && (
                  <p id={`${uid}-business-error`} className={errorClass}>
                    {errors.business}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={`${uid}-need`} className={labelClass}>
                  {t.contact.form.needLabel}
                </label>
                <textarea
                  rows={4}
                  placeholder={t.contact.form.needPlaceholder}
                  {...field('need')}
                />
                {errors.need && (
                  <p id={`${uid}-need-error`} className={errorClass}>
                    {errors.need}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="secondary"
                disabled={status === 'sending'}
                className="w-full sm:w-auto sm:self-start"
              >
                {status === 'sending'
                  ? t.contact.form.sending
                  : t.contact.form.submit}
              </Button>

              <p role="status" aria-live="polite" className="text-sm text-accent">
                {status === 'sent' ? t.contact.form.sent : ''}
              </p>

              {errors.form && (
                <p role="alert" className={errorClass}>
                  {errors.form}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
