/** The Launchly mark: dark pill badge, green circular arrow, wordmark. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-full border border-border bg-surface pl-2 pr-4 py-1.5 ${className}`}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" className="size-6 shrink-0">
        {/*
          Two nested groups, one transform each.

          The outer one carries a slow continuous idle rotation as a CSS
          animation — that runs on the compositor and costs nothing, whereas a
          per-frame ticker callback would burn main-thread work for the entire
          session just to keep something turning.

          The inner one is GSAP's, driven by scroll velocity, and only does work
          while the page is actually moving. Splitting them is what lets both
          exist: one element with two things writing `transform` means one of
          them silently loses.

          The origin has to be given explicitly (`transform-box: view-box` in CSS,
          `svgOrigin: '32 32'` in JS) — the group's bounding box is skewed by the
          arrowhead poking out at the top right, so `center` would wobble rather
          than turn.
        */}
        <g className="logo-idle">
          <g data-logo-arrow>
            <path
              d="M32 13a19 19 0 1 0 19 19"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              className="text-accent"
            />
            <path
              d="M40 6.5 53.5 14 40 21.5z"
              fill="currentColor"
              className="text-accent"
            />
          </g>
        </g>
      </svg>
      <span className="text-[0.9375rem] font-semibold tracking-tight">
        Launchly
      </span>
    </span>
  )
}
