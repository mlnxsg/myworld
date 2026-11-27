import type { ReactNode } from 'react'

export default function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-0.5 text-xs tabular-nums transition-colors ${
        active
          ? 'border-gold bg-gold text-white'
          : 'border-ink/15 text-ink/60 hover:border-gold hover:text-gold'
      }`}
    >
      {children}
    </button>
  )
}
