import { config } from '../content/content'
import type { Lang } from '../content/content'

/**
 * An SMS link, optionally with the message pre-written.
 *
 * The `?&body=` prefix is deliberate and not a typo: iOS expects `&body=` and
 * Android expects `?body=`. `?&body=` is the one form both parse correctly.
 */
export function smsUrl(message?: string): string {
  const base = `sms:${config.contact.smsNumber}`
  return message ? `${base}?&body=${encodeURIComponent(message)}` : base
}

/**
 * What each CTA calls the thing it is asking about, per language.
 *
 * Not `tier.charAt(0).toUpperCase()`. Two of these are brand names that stay in
 * English in both languages ("Liftoff", "Launchly Care") and one genuinely
 * translates ("custom domain" → "dominio propio"), so the mapping has to be
 * written out rather than derived from the key.
 */
const SUBJECT: Record<'liftoff' | 'orbit' | 'care' | 'domain', Record<Lang, string>> = {
  liftoff: { en: 'Liftoff', es: 'Liftoff' },
  orbit: { en: 'Orbit', es: 'Orbit' },
  care: { en: 'Launchly Care', es: 'Launchly Care' },
  domain: { en: 'custom domain', es: 'dominio propio' },
}

export type CtaSubject = keyof typeof SUBJECT

/**
 * The opener we pre-write into the message when someone taps a CTA.
 *
 * The two add-ons get their own sentence rather than being forced through the
 * "I'm interested in the X tier" template: Care and a domain are not tiers, and
 * a message saying they are would read as though it came from a form rather than
 * from the person sending it.
 */
export function messageOpener(lang: Lang, tier?: CtaSubject): string {
  const name = tier ? SUBJECT[tier][lang] : null

  if (lang === 'es') {
    if (!name) return 'Hola Philip, vi el sitio de Launchly y quiero un sitio web para mi negocio.'
    if (tier === 'care') return `Hola Philip, vi el sitio de Launchly y me interesa ${name}.`
    if (tier === 'domain')
      return `Hola Philip, vi el sitio de Launchly y me gustaría configurar un ${name}.`
    return `Hola Philip, vi el sitio de Launchly y me interesa el plan ${name}.`
  }

  if (!name) return 'Hi Philip, I saw the Launchly site and I want a website for my business.'
  if (tier === 'care') return `Hi Philip, I saw the Launchly site and I'm interested in ${name}.`
  if (tier === 'domain')
    return `Hi Philip, I saw the Launchly site and I'd like help setting up a ${name}.`
  return `Hi Philip, I saw the Launchly site and I'm interested in the ${name} tier.`
}

/** Formats the contact-form contents as a text message. */
export function formAsMessage(
  lang: Lang,
  fields: { name: string; business: string; need: string },
): string {
  return lang === 'es'
    ? `Hola Philip, soy ${fields.name} de ${fields.business}.\n\n${fields.need}`
    : `Hi Philip, this is ${fields.name} from ${fields.business}.\n\n${fields.need}`
}

export const priceLabel = (amount: number) => `$${amount}`
