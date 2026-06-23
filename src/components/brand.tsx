import mark from '../assets/egroup-mark.png'
import { cn } from '../lib/utils'

/** E-Group ICT Software Zrt. official logo mark + wordmark. */
export function Logo({
  className,
  showWord = true,
  invert = false,
}: {
  className?: string
  showWord?: boolean
  invert?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src={mark}
        alt="E-Group ICT Software Zrt. logó"
        className="h-9 w-9 rounded-md shadow-sm"
        draggable={false}
      />
      {showWord && (
        <div className="leading-none">
          <div
            className={cn(
              'font-display text-base tracking-wide',
              invert ? 'text-white' : 'text-slate-900 dark:text-white',
            )}
          >
            E&#8209;Group
          </div>
          <div
            className={cn(
              'text-[10px] font-medium uppercase tracking-[0.18em]',
              invert ? 'text-white/70' : 'text-slate-500 dark:text-slate-400',
            )}
          >
            ICT Software Zrt.
          </div>
        </div>
      )}
    </div>
  )
}

/** A foosball (soccer) ball — optionally spinning. */
export function FoosballBall({
  className,
  spin = false,
}: {
  className?: string
  spin?: boolean
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn(spin && 'animate-spin-ball', className)}
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" fill="#fff" stroke="#0f172a" strokeWidth="2" />
      <path
        d="M24 9l8 5.8-3 9.4h-10l-3-9.4z"
        fill="#0f172a"
      />
      <path
        d="M24 9l-8 5.8M24 9l8 5.8M13 24.2L6.5 19M35 24.2l6.5-5.2M19 33.6L15 41m14-7.4l4 7.4"
        stroke="#0f172a"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  )
}

/** A foosball rod with two figures — the theme motif. */
export function FoosballRod({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 24" className={className} aria-hidden>
      <line x1="2" y1="6" x2="62" y2="6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {[18, 46].map((x) => (
        <g key={x} fill="currentColor">
          <rect x={x - 4} y="6" width="8" height="6" rx="2" />
          <path d={`M${x - 5} 12h10l-2 9h-6z`} />
        </g>
      ))}
    </svg>
  )
}
