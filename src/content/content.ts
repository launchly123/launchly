/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LAUNCHLY — SINGLE SOURCE OF TRUTH
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything editable lives in this file: prices, contact details, projects,
 * testimonials, and every string on the page in both languages.
 *
 * You should never have to open a component file to:
 *   · change a price            → `config.pricing`
 *   · add a project             → push an object into `projects`
 *   · add a testimonial         → push an object into `testimonials`
 *   · fix a typo, any language  → `en` / `es` below
 *
 * TRANSLATION SAFETY NET
 * `es` is typed as `Content`, which is derived from `en`. If you add an English
 * string and forget the Spanish one, `npm run typecheck` fails. There is no way
 * to ship a half-translated page by accident.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Lang = 'en' | 'es'

/** A string that exists in both languages. */
export type Localized = { en: string; es: string }

/* ═══════════════════════════════════════════════════════════════════════════
   1 · CONFIG — numbers, links, handles
   ═══════════════════════════════════════════════════════════════════════════ */

export const config = {
  /** One-time project fees, in USD. Rendered as `$499`. */
  pricing: {
    liftoff: 499,
    orbit: 799,
  },

  contact: {
    /** E.164, country code first — this builds the sms: link. */
    smsNumber: '+12692283589',
    /** How the number is shown to a human. */
    phoneDisplay: '+1 269 228 3589',
    instagramHandle: '@launchly_websites',
    instagramUrl: 'https://instagram.com/launchly_websites',
  },

  /**
   * Where the contact form posts.
   *
   * Leave as `null` and the form gracefully becomes a text-message composer:
   * it validates, then opens the messages app with the message pre-written.
   * Zero setup, works on day one, and matches how this audience replies.
   *
   * To take real submissions instead, paste a Formspree endpoint here, e.g.
   *   formEndpoint: 'https://formspree.io/f/xxxxxxxx'
   */
  formEndpoint: null as string | null,

  /**
   * Production URL. A record, not a source — nothing reads it.
   *
   * The tags that actually ship are hard-coded in `index.html`, because they
   * have to be in the HTML a crawler receives and this is a client-rendered SPA;
   * a canonical tag written by React arrives too late to be worth anything.
   * Rollup drops this property entirely — verified, it does not appear in the
   * bundle. So changing this line alone changes nothing on the live site, which
   * is the trap it is here to warn about.
   *
   * This was `launchly.vercel.app`, which is not ours: that address belongs to
   * an unrelated Vercel account and currently serves a "Silsila — Coming Soon"
   * page. Vercel refuses it outright (`already in use, 403`), which is why the
   * project was auto-assigned `launchly-nu` in the first place.
   *
   * Pointing the canonical tag at it was worse than cosmetic. `rel=canonical`
   * tells a search engine which URL is the real one, so index.html was actively
   * telling Google that the authoritative copy of this page lived on a
   * stranger's domain — and `og:image` pointed there too, at a file that 404s,
   * so shared links had no thumbnail to load.
   *
   * `launchly-nu.vercel.app` still resolves and is kept as a working alias, so
   * anything already shared stays live. Update all of these together if a real
   * domain is bought: this line, the canonical/OG/Twitter tags in index.html,
   * public/robots.txt and public/sitemap.xml.
   */
  siteUrl: 'https://launchly-websites.vercel.app',

  foundedYear: 2025,
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 · PROJECTS — the portfolio
   ═══════════════════════════════════════════════════════════════════════════
   To add a project, copy one object and fill it in. Nothing else to touch.

   status: 'live'        → renders as a real case study with a link
   status: 'placeholder' → renders as an open slot ("Your business here")

   embed: true           → shows the live site in a browser frame (iframe).
                           Only set this true for sites you control that do NOT
                           send X-Frame-Options / CSP frame-ancestors headers,
                           otherwise the frame renders blank.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Project = {
  id: string
  /** Proper noun — intentionally not translated. */
  name: string
  city: Localized
  category: Localized
  tier: 'liftoff' | 'orbit'
  /** One line on what the site actually does. Facts only. */
  result: Localized
  url: string | null
  embed: boolean
  status: 'live' | 'placeholder'
}

export const projects: Project[] = [
  {
    id: 'demiguel',
    name: 'deMiguel Modern Italian Grill',
    // Verified from the live site's own copy — the restaurant is in Cajicá,
    // just north of Bogotá, not in Bogotá itself.
    city: { en: 'Cajicá, Colombia', es: 'Cajicá, Colombia' },
    category: { en: 'Restaurant', es: 'Restaurante' },
    tier: 'liftoff',
    result: {
      en: 'Full menu in Colombian pesos, WhatsApp reservations, Google Maps, and an EN/ES toggle — hand-built as a single page, which is why it opens instantly.',
      es: 'Menú completo en pesos colombianos, reservas por WhatsApp, Google Maps y selector EN/ES — hecho a mano en una sola página, por eso abre al instante.',
    },
    url: 'https://restaurantedemiguel.vercel.app',
    embed: true,
    status: 'live',
  },

  // ── Open slot 1 ────────────────────────────────────────────────────────────
  // TODO: replace with the next real build. Fill in every field and flip
  // status to 'live'. Set embed:true only after confirming the site can be
  // framed (no X-Frame-Options header).
  {
    id: 'slot-2',
    name: '',
    city: { en: '', es: '' },
    category: { en: '', es: '' },
    tier: 'orbit',
    result: { en: '', es: '' },
    url: null,
    embed: false,
    status: 'placeholder',
  },

  // ── Open slot 2 ────────────────────────────────────────────────────────────
  {
    id: 'slot-3',
    name: '',
    city: { en: '', es: '' },
    category: { en: '', es: '' },
    tier: 'liftoff',
    result: { en: '', es: '' },
    url: null,
    embed: false,
    status: 'placeholder',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   3 · TESTIMONIALS — real quotes only
   ═══════════════════════════════════════════════════════════════════════════
   Deliberately empty. The section does not render at all while this array is
   empty, so there is no gap in the page and nothing invented ships.

   Add one and it renders as a single large pull-quote. The component handles
   1–5. One real quote beats three fake ones.

   {
     id: 'demiguel',
     quote: { en: '…', es: '…' },   // if you only have it in one language,
     author: 'Michael deMiguel',    // put the original in both fields rather
     role: {                        // than inventing a translation
       en: 'Owner, deMiguel Modern Italian Grill',
       es: 'Propietario, deMiguel Modern Italian Grill',
     },
   }
   ═══════════════════════════════════════════════════════════════════════════ */

export type Testimonial = {
  id: string
  quote: Localized
  author: string
  role: Localized
}

export const testimonials: Testimonial[] = []

/* ═══════════════════════════════════════════════════════════════════════════
   3b · SCROLL SHOWCASE — the pinned deMiguel sequence
   ═══════════════════════════════════════════════════════════════════════════
   Geometry only; the callout wording lives in `copy.*.work.showcase.callouts`.

   `stops` and the anchor table below are in the DESKTOP image's pixel space
   (1200 × 14157). They were measured from the live DOM, not eyeballed — see
   public/work/README.md. If deMiguel's site changes, re-measure: these offsets
   are what keep each callout beside the thing it is describing.

     EN/ES toggle ........  37
     first COP price ..... 2284
     galería ............ 12195
     visítanos / WhatsApp 13251+
   ═══════════════════════════════════════════════════════════════════════════ */

export const showcase = {
  projectId: 'demiguel',

  desktop: { src: '/work/demiguel-scroll.webp', width: 1200, height: 14157 },
  /**
   * Not merely a bandwidth saving: the desktop image is 17 megapixels, roughly
   * 68 MB decoded to RGBA, which is at the limit of what older iPhones will
   * decode before Safari discards the image outright.
   */
  mobile: { src: '/work/demiguel-scroll-mobile.webp', width: 560, height: 6607 },

  /**
   * Scroll stops, in desktop-image pixels. Uneven by design — the menu runs for
   * ~10,000px, so a linear scrub would spend three-quarters of the sequence
   * grinding through a price list. These give each part of the page its own
   * dwell time.
   */
  stops: [0, 2284, 8000, 12195, 13800],
  /** Duration of each leg, as a fraction of the pinned timeline. */
  legs: [0.16, 0.26, 0.18, 0.12],

  /** Timeline position (0–1) each callout appears at, and the edge it flies from. */
  callouts: [
    { at: 0.15, side: 'left' as const },
    { at: 0.31, side: 'right' as const },
    { at: 0.52, side: 'left' as const },
    { at: 0.78, side: 'right' as const },
  ],
}

/** A row in the pricing comparison. `true` → check, `false` → dash, string → value. */
export type ComparisonRow = {
  label: string
  liftoff: boolean | string
  orbit: boolean | string
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 · COPY — every string, both languages
   ═══════════════════════════════════════════════════════════════════════════ */

const en = {
  meta: {
    title: 'Launchly — websites that work.',
    description:
      'Custom-built websites for local businesses. One flat price, no monthly fee, no templates.',
    ogImageAlt: 'Launchly — websites that work.',
  },

  a11y: {
    skipToContent: 'Skip to content',
    languageLabel: 'Language',
    switchToEnglish: 'Switch to English',
    switchToSpanish: 'Cambiar a español',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    scrollProgress: 'Reading progress',
    logoHome: 'Launchly — back to top',
    externalLink: 'opens in a new tab',
  },

  nav: {
    work: 'Work',
    pricing: 'Pricing',
    contact: 'Contact',
  },

  hero: {
    eyebrow: 'Est. 2025 — USA',
    /** Rendered as two lines; `headlineAccent` carries the green. */
    headlineLead: 'websites that',
    headlineAccent: 'work.',
    sub: 'Custom-built sites for local businesses. One flat price. No monthly fee. No templates.',
    ctaPrimary: 'Send a text',
    ctaSecondary: 'See the work',
    scroll: 'Scroll',
  },

  /*
   * The band that drifts between Work and Pricing. Purely decorative — it is
   * `aria-hidden`, because the same words are already the page's <h1> and no
   * screen reader should hear them repeated eight times.
   *
   * The separator is added in the component, not written here: one phrase per
   * language keeps the copy readable and the repetition a rendering concern.
   */
  marquee: 'USA · Websites that work',

  problem: {
    label: 'The problem',
    heading: 'Most local businesses are in one of three places online.',
    beats: [
      'No website. Customers look, find nothing, and call someone else.',
      'A Facebook page that last posted in 2019.',
      'A $30-a-month template that takes six seconds to load.',
    ],
  },

  process: {
    label: 'How it works',
    heading: 'Four steps, start to live.',
    stepLabel: 'Step',
    steps: [
      {
        title: 'We talk',
        body: 'Fifteen minutes on a call or by text. You tell me about the business. I tell you exactly what it costs — one number, no surprises.',
      },
      {
        title: 'I build it',
        body: 'You get a real, live link. Not a mockup, not a PDF. Open it on your phone and click through the whole thing.',
      },
      {
        title: 'You review',
        body: "Tell me what's wrong and what's missing. We adjust until it's right.",
      },
      {
        title: 'It goes live',
        body: 'On your own domain, hosting set up, ready for Google. Then it starts working for you.',
      },
    ],
  },

  work: {
    label: 'Work',
    heading: 'Sites you can open right now.',
    visitLive: 'Visit live site',
    frameHint: 'Live site',
    placeholderTitle: 'Your business here',
    placeholderBody: 'The next build goes in this slot.',
    placeholderCta: 'Start a project',
    showcase: {
      /*
       * Order matters — these map 1:1 onto `showcase.callouts`, which is ordered
       * by scroll position, so each label lands beside the part of the page it
       * describes.
       *
       * NOTE on "Loads in under a second": measured FCP on the live site is
       * 784–860ms, uncached, desktop, unthrottled. True in good conditions but
       * not on a phone over cellular. See the README before leaning on it.
       */
      callouts: [
        'Bilingual ES / EN',
        'Full menu · COP pricing',
        'Loads in under a second',
        'WhatsApp reservations',
      ],
      cta: 'View the live site',
      /** Screen-reader description of the scroll sequence. */
      description:
        'A scrolling preview of the deMiguel Modern Italian Grill homepage.',
    },
  },

  pricing: {
    label: 'Pricing',
    heading: 'One price. Paid once.',
    oneTime: 'one-time',
    includes: 'Includes',
    plus: 'Everything in Liftoff, plus',
    liveExample: 'Live example',
    note: 'Care & updates plan available separately.',
    /**
     * The hook of the entire page, in three parts so the last one can carry the
     * accent colour. `{price}` is filled from `config.pricing`.
     */
    hookLead: "You're looking at Orbit right now.",
    hookMid: "Everything you just scrolled through — that's what",
    hookAccent: '{price} builds.',
    scrollBackUp: 'Scroll back up',
    comparisonLabel: 'Side by side',
    liftoff: {
      name: 'Liftoff',
      pitch:
        'A complete, custom website. Everything a local business needs to get found and get calls.',
      cta: 'Start a Liftoff project',
      example: 'deMiguel Modern Italian Grill',
      features: [
        'Custom design — no templates',
        'Up to about 5 sections, single or small multi-page',
        'Mobile responsive',
        'Contact form, WhatsApp, or click-to-call',
        'Google Maps embed',
        'Basic SEO — meta tags, alt text, page speed',
        'Google review integration where available',
        'Bilingual EN/ES toggle available',
        'Free hosting setup and domain connection',
        '1 round of revisions',
      ],
    },
    orbit: {
      name: 'Orbit',
      pitch:
        'Everything in Liftoff, and then the site starts doing the selling for you.',
      cta: 'Start an Orbit project',
      example: 'This website.',
      features: [
        'Scroll-driven motion — elements build, reveal, pin, and transform',
        'Cinematic imagery — layered depth, pan and zoom, section blending',
        'Custom page transitions',
        'Optional 3D / WebGL element',
        'Unlimited sections',
        'Copywriting help',
        '3 rounds of revisions',
      ],
    },
    /*
     * Side-by-side rows. `true` draws a checkmark, a string prints that value,
     * `false` prints a dash — revisions differ by amount rather than presence,
     * so booleans alone can't express this table.
     */
    comparison: [
      { label: 'Custom design, no templates', liftoff: true, orbit: true },
      { label: 'Mobile responsive', liftoff: true, orbit: true },
      { label: 'WhatsApp, form, or click-to-call', liftoff: true, orbit: true },
      { label: 'Google Maps + review integration', liftoff: true, orbit: true },
      { label: 'Bilingual EN / ES toggle', liftoff: true, orbit: true },
      { label: 'Hosting setup + domain connection', liftoff: true, orbit: true },
      { label: 'Sections', liftoff: 'Up to 5', orbit: 'Unlimited' },
      { label: 'Scroll-driven motion design', liftoff: false, orbit: true },
      { label: 'Cinematic imagery treatment', liftoff: false, orbit: true },
      { label: 'Custom page transitions', liftoff: false, orbit: true },
      { label: 'Optional 3D / WebGL element', liftoff: false, orbit: true },
      { label: 'Copywriting help', liftoff: false, orbit: true },
      { label: 'Rounds of revisions', liftoff: '1', orbit: '3' },
    ] as ComparisonRow[],
  },

  testimonials: {
    label: 'Clients',
    heading: 'In their words.',
  },

  contact: {
    label: 'Contact',
    heading: "Let's talk about your business.",
    body: "Fifteen minutes, no pitch. Tell me what you sell and who you sell it to, and I'll tell you what the site should be.",
    messageCta: 'Text me',
    messageNote: 'Fastest way to reach me.',
    or: 'or',
    instagramCta: 'Follow on Instagram',
    form: {
      nameLabel: 'Name',
      namePlaceholder: 'Your name',
      businessLabel: 'Business',
      businessPlaceholder: 'Business name',
      needLabel: 'What do you need?',
      needPlaceholder: 'A few lines about the project',
      submit: 'Send',
      sending: 'Sending…',
      sent: "Got it. I'll reply within a day.",
      errors: {
        name: 'Please enter your name.',
        business: 'Please enter your business name.',
        need: 'Tell me a little about the project.',
        generic: 'Something went wrong. Text me instead.',
      },
    },
  },

  footer: {
    tagline: 'websites that work.',
    regions: 'USA',
    rights: 'All rights reserved.',
    smsLabel: 'Text',
  },
}

/** Shape derived from English. Spanish must match it exactly. */
export type Content = typeof en

const es: Content = {
  meta: {
    title: 'Launchly — sitios web que funcionan.',
    description:
      'Sitios web hechos a la medida para negocios locales. Un precio fijo, sin mensualidad, sin plantillas.',
    ogImageAlt: 'Launchly — sitios web que funcionan.',
  },

  a11y: {
    skipToContent: 'Ir al contenido',
    languageLabel: 'Idioma',
    switchToEnglish: 'Switch to English',
    switchToSpanish: 'Cambiar a español',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    scrollProgress: 'Progreso de lectura',
    logoHome: 'Launchly — volver arriba',
    externalLink: 'abre en una pestaña nueva',
  },

  nav: {
    work: 'Proyectos',
    pricing: 'Precios',
    contact: 'Contacto',
  },

  hero: {
    eyebrow: 'Est. 2025 — USA',
    headlineLead: 'sitios web que',
    headlineAccent: 'funcionan.',
    sub: 'Sitios hechos a la medida para negocios locales. Un precio fijo. Sin mensualidad. Sin plantillas.',
    ctaPrimary: 'Enviar un mensaje',
    ctaSecondary: 'Ver los proyectos',
    scroll: 'Scroll',
  },

  marquee: 'USA · Sitios web que funcionan',

  problem: {
    label: 'El problema',
    heading: 'Casi todos los negocios locales están en uno de tres lugares.',
    beats: [
      'Sin sitio web. El cliente busca, no encuentra nada y llama a otro.',
      'Una página de Facebook cuya última publicación es de 2019.',
      'Una plantilla de $30 al mes que tarda seis segundos en cargar.',
    ],
  },

  process: {
    label: 'Cómo funciona',
    heading: 'Cuatro pasos, de principio a fin.',
    stepLabel: 'Paso',
    steps: [
      {
        title: 'Hablamos',
        body: 'Quince minutos por llamada o mensaje de texto. Usted me cuenta del negocio. Yo le digo exactamente cuánto cuesta — un solo número, sin sorpresas.',
      },
      {
        title: 'Lo construyo',
        body: 'Recibe un enlace real, en vivo. No una maqueta, no un PDF. Ábralo en su celular y recórralo completo.',
      },
      {
        title: 'Usted revisa',
        body: 'Me dice qué está mal y qué falta. Ajustamos hasta que quede bien.',
      },
      {
        title: 'Sale en vivo',
        body: 'En su propio dominio, con el hosting listo y preparado para Google. Ahí empieza a trabajar para usted.',
      },
    ],
  },

  work: {
    label: 'Proyectos',
    heading: 'Sitios que puede abrir ahora mismo.',
    visitLive: 'Ver el sitio en vivo',
    frameHint: 'Sitio en vivo',
    placeholderTitle: 'Su negocio aquí',
    placeholderBody: 'El próximo proyecto va en este espacio.',
    placeholderCta: 'Empezar un proyecto',
    showcase: {
      callouts: [
        'Bilingüe ES / EN',
        'Menú completo · precios en COP',
        'Carga en menos de un segundo',
        'Reservas por WhatsApp',
      ],
      cta: 'Ver el sitio en vivo',
      description:
        'Vista del sitio de deMiguel Modern Italian Grill, desplazándose.',
    },
  },

  pricing: {
    label: 'Precios',
    heading: 'Un precio. Se paga una vez.',
    oneTime: 'pago único',
    includes: 'Incluye',
    plus: 'Todo lo de Liftoff, más',
    liveExample: 'Ejemplo en vivo',
    note: 'Plan de mantenimiento y actualizaciones disponible por separado.',
    hookLead: 'Está viendo Orbit en este momento.',
    hookMid: 'Todo lo que acaba de recorrer — eso es lo que',
    hookAccent: 'construyen {price}.',
    scrollBackUp: 'Volver arriba',
    comparisonLabel: 'Comparación',
    liftoff: {
      name: 'Liftoff',
      pitch:
        'Un sitio completo y a la medida. Todo lo que un negocio local necesita para que lo encuentren y lo llamen.',
      cta: 'Empezar con Liftoff',
      example: 'deMiguel Modern Italian Grill',
      features: [
        'Diseño a la medida — sin plantillas',
        'Hasta unas 5 secciones, una página o varias pequeñas',
        'Adaptado a celular',
        'Formulario de contacto, WhatsApp o llamada directa',
        'Mapa de Google integrado',
        'SEO básico — meta etiquetas, texto alternativo, velocidad',
        'Integración de reseñas de Google cuando estén disponibles',
        'Selector bilingüe EN/ES disponible',
        'Configuración de hosting y conexión del dominio, gratis',
        '1 ronda de ajustes',
      ],
    },
    orbit: {
      name: 'Orbit',
      pitch:
        'Todo lo de Liftoff, y además el sitio empieza a vender por usted.',
      cta: 'Empezar con Orbit',
      example: 'Este sitio web.',
      features: [
        'Animación por scroll — los elementos aparecen, se fijan y se transforman',
        'Imágenes cinematográficas — profundidad, paneo y zoom, mezcla entre secciones',
        'Transiciones a la medida entre secciones',
        'Elemento 3D / WebGL opcional',
        'Secciones ilimitadas',
        'Ayuda con los textos',
        '3 rondas de ajustes',
      ],
    },
    comparison: [
      { label: 'Diseño a la medida, sin plantillas', liftoff: true, orbit: true },
      { label: 'Adaptado a celular', liftoff: true, orbit: true },
      { label: 'WhatsApp, formulario o llamada directa', liftoff: true, orbit: true },
      { label: 'Google Maps + reseñas integradas', liftoff: true, orbit: true },
      { label: 'Selector bilingüe EN / ES', liftoff: true, orbit: true },
      { label: 'Hosting y conexión del dominio', liftoff: true, orbit: true },
      { label: 'Secciones', liftoff: 'Hasta 5', orbit: 'Ilimitadas' },
      { label: 'Animación dirigida por scroll', liftoff: false, orbit: true },
      { label: 'Tratamiento cinematográfico de imágenes', liftoff: false, orbit: true },
      { label: 'Transiciones a la medida', liftoff: false, orbit: true },
      { label: 'Elemento 3D / WebGL opcional', liftoff: false, orbit: true },
      { label: 'Ayuda con los textos', liftoff: false, orbit: true },
      { label: 'Rondas de ajustes', liftoff: '1', orbit: '3' },
    ] as ComparisonRow[],
  },

  testimonials: {
    label: 'Clientes',
    heading: 'En sus palabras.',
  },

  contact: {
    label: 'Contacto',
    heading: 'Hablemos de su negocio.',
    body: 'Quince minutos, sin discurso de ventas. Cuénteme qué vende y a quién, y le digo cómo debería ser el sitio.',
    messageCta: 'Enviarme un mensaje',
    messageNote: 'La forma más rápida de contactarme.',
    or: 'o',
    instagramCta: 'Seguir en Instagram',
    form: {
      nameLabel: 'Nombre',
      namePlaceholder: 'Su nombre',
      businessLabel: 'Negocio',
      businessPlaceholder: 'Nombre del negocio',
      needLabel: '¿Qué necesita?',
      needPlaceholder: 'Unas líneas sobre el proyecto',
      submit: 'Enviar',
      sending: 'Enviando…',
      sent: 'Listo. Le respondo en menos de un día.',
      errors: {
        name: 'Escriba su nombre.',
        business: 'Escriba el nombre del negocio.',
        need: 'Cuénteme un poco del proyecto.',
        generic: 'Algo salió mal. Mejor envíeme un mensaje de texto.',
      },
    },
  },

  footer: {
    tagline: 'sitios web que funcionan.',
    regions: 'USA',
    rights: 'Todos los derechos reservados.',
    smsLabel: 'Mensajes',
  },
}

export const copy: Record<Lang, Content> = { en, es }
