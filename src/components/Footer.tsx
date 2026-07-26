import { config } from '../content/content'
import { useLang } from '../lib/i18n'
import { messageOpener, smsUrl } from '../lib/links'
import { Logo } from './Logo'

export function Footer() {
  const { lang, t } = useLang()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border py-14">
      <div className="shell flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <a
            href="#top"
            aria-label={t.a11y.logoHome}
            className="tap-link w-fit rounded-full"
          >
            <Logo />
          </a>
          <p className="mt-5 text-lg">{t.footer.tagline}</p>
          <p className="eyebrow mt-3">{t.footer.regions}</p>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          {/* sms: hands off to the OS messages app — never a new tab. */}
          <a
            href={smsUrl(messageOpener(lang))}
            className="tap-link link-underline text-muted transition-colors hover:text-accent"
          >
            {t.footer.smsLabel} — {config.contact.phoneDisplay}
          </a>
          <a
            href={config.contact.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-link link-underline text-muted transition-colors hover:text-accent"
          >
            Instagram — {config.contact.instagramHandle}
          </a>
          <p className="eyebrow mt-4">
            © {year} Launchly. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  )
}
