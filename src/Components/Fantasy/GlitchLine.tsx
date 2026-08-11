import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useGlitchIntensity } from '@/hooks/useGlitchIntensity'

/**
 * The glitch line item in a card's score breakdown (docs/GLITCH_CARDS.md).
 *
 * A glitched card carries an extra payout that resolves at WEEK END — it cannot resolve
 * earlier, because the trigger odds depend on anomaly events that fire during the week's
 * games. So while the week is live this shows nothing but corrupted characters: the card
 * is visibly computing something it will not tell you yet.
 *
 * The scramble tracks the odds. Trigger chance genuinely climbs through the week as the
 * on-card player glitches, so a quiet week barely flickers and an agitated one churns.
 * That makes the line a live readout of pressure WITHOUT ever showing a number.
 *
 * Once resolved it shows the payout. The OUTCOME NAME stays corrupted unless the player is
 * awakened — a player in control produces a legible readout, a player cracking produces
 * noise. That is the arc paying off with no extra mechanic.
 */

const GLYPHS = '░▒▓█▌▐│┃▪◦◊◆▲△◢◣⌬⌭⌮╳╱╲※╬'

interface Props {
  /** 0-1. Higher odds churn faster and swap more characters. */
  chance: number
  resolved: boolean
  triggered: boolean
  /** Surge name. Only rendered in clear when `readable`. */
  outcome?: string | null
  /** True only when the on-card player is awakened. */
  readable?: boolean
  fp?: number
  multDelta?: number
}

function scramble(width: number, swaps: number): string {
  const out: string[] = []
  for (let i = 0; i < width; i += 1) {
    out.push(i < swaps ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : ' ')
  }
  // Shuffle so the corrupted characters are not all bunched at the left.
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join('')
}

const GlitchLine: React.FC<Props> = ({
  chance, resolved, triggered, outcome, readable, fp = 0, multDelta = 0,
}) => {
  const width = 11
  // Pace and density both ride the odds, so the line visibly gets more agitated as the
  // player's week goes on. Floor keeps a quiet card alive rather than frozen.
  const pct = Math.max(0, Math.min(1, chance))
  const intervalMs = Math.round(900 - 520 * pct)
  const swaps = Math.max(2, Math.round(2 + pct * (width - 3)))

  const [display, setDisplay] = useState(() => scramble(width, swaps))
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  // ⚠️ The corruption is the CONTENT here, not a corruption of real text — there is no
  // payout to reveal yet, which is the whole point of the line. So turning the effects down
  // cannot mean showing the number; it means the scramble stops CHURNING and holds still.
  // The line still reads as unresolved, nothing moves. Same rule as everywhere else: the
  // state stays marked once the motion is gone.
  const { intensity } = useGlitchIntensity()

  // A RESOLVED but unreadable outcome is a fixed record of what happened, so its
  // corruption is computed once. Re-scrambling it on every render would make a settled
  // week look like it was still deciding.
  const settledNoise = useMemo(() => scramble(width, Math.round(width * 0.7)),
                               [outcome, fp, multDelta])

  useEffect(() => {
    if (resolved || intensity !== 'full') return undefined
    timer.current = setInterval(() => setDisplay(scramble(width, swaps)), intervalMs)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [resolved, intervalMs, swaps, intensity])

  if (!resolved) {
    return (
      <div className="flex items-center justify-between text-[11px] py-0.5">
        <span className="text-violet-300/70 font-mono tracking-wider">{display}</span>
        <span className="text-violet-300/50 font-mono">--</span>
      </div>
    )
  }

  // ⚠️ A quiet week must still show the line. Returning null here made the line VANISH
  // once the week resolved without a trigger, so a glitched card became indistinguishable
  // from a clean one and there was no way to tell the card was still glitched. It reads
  // as the feature breaking rather than as the card being quiet.
  if (!triggered) {
    return (
      <div className="flex items-center justify-between text-[11px] py-0.5 opacity-40">
        <span className="text-violet-300 font-mono tracking-wider">{settledNoise}</span>
        <span className="text-violet-300 font-mono">--</span>
      </div>
    )
  }

  const amount = multDelta > 0
    ? `+${multDelta.toFixed(2)} FPx`
    : `+${fp.toFixed(1)} FP`

  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span
        className={readable
          ? 'awakened-power-name font-mono tracking-wider'
          : 'text-violet-300 font-mono tracking-wider'}
      >
        {readable && outcome ? outcome : settledNoise}
      </span>
      <span className={readable ? 'awakened-power-name font-mono' : 'text-violet-300 font-mono'}>
        {amount}
      </span>
    </div>
  )
}

export default GlitchLine
