import type { Score } from '@/types'

const SCORES: Score[] = [1, 2, 3, 4, 5]

export default function ScorePicker({
  value,
  onChange,
}: {
  value: Score | null
  onChange: (score: Score) => void
}) {
  return (
    <div role="group" aria-label="工作量" className="flex items-center gap-1">
      {SCORES.map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          aria-label={`${score} 分`}
          aria-pressed={value === score}
          className={`size-6 rounded-full border text-xs transition-colors ${
            value === score
              ? 'border-gold bg-gold text-white'
              : 'border-ink/15 text-ink/60 hover:border-gold hover:text-gold'
          }`}
        >
          {score}
        </button>
      ))}
    </div>
  )
}
