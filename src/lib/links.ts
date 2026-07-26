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

/** The opener we pre-write into the message when someone taps a CTA. */
export function messageOpener(lang: Lang, tier?: 'liftoff' | 'orbit'): string {
  const tierName = tier === 'orbit' ? 'Orbit' : tier === 'liftoff' ? 'Liftoff' : null

  if (lang === 'es') {
    return tierName
      ? `Hola Philip, vi el sitio de Launchly y me interesa el plan ${tierName}.`
      : 'Hola Philip, vi el sitio de Launchly y quiero un sitio web para mi negocio.'
  }

  return tierName
    ? `Hi Philip, I saw the Launchly site and I'm interested in the ${tierName} tier.`
    : 'Hi Philip, I saw the Launchly site and I want a website for my business.'
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
