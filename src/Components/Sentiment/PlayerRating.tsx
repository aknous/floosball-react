import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * The 1-5 fan rating — signal 1 of the sentiment layer.
 *
 * Used for BOTH players and GMs: they're rated on the same scale, so they share
 * one control rather than two near-identical ones that drift apart.
 *
 * This is the QUIET half: a standing stance a fan holds and rarely changes, as
 * opposed to the loud, decaying post feed. So it's deliberately restrained —
 * no confetti, no shouting. The chevron fills with a short spring and settles.
 *
 * Backend: GET/POST/DELETE /api/players/{id}/rating.
 */

export interface PlayerRatingData {
  myRating: number | null
  average: number | null      // withheld until the rater floor is met
  raters: number
  ratersNeeded: number
  sentiment?: number | null
}

const PLAYER_LABELS = ['', 'Run them out of town', 'Not good enough', 'Fine', 'Real asset', 'Franchise cornerstone']
const GM_LABELS = ['', 'Fire them', 'Out of their depth', 'Fine', 'Knows the job', 'Best in the league']

// Warm at the top, cold at the bottom — reads instantly without a legend.
const TIER_COLOR = ['#94a3b8', '#f87171', '#fb923c', '#cbd5e1', '#a3e635', '#4ade80']

interface Props {
  /** Player id, or team id when rating that team's GM. */
  playerId: number
  /** 'gm' swaps the endpoint and the wording; the scale is identical. */
  subject?: 'player' | 'gm'
  compact?: boolean
  /** You only get a say about your OWN team's players. Elsewhere the control
   *  still SHOWS the standing, but can't be used. */
  canRate?: boolean
  onChange?: (data: PlayerRatingData) => void
  /** Fill the pips from the FANBASE AVERAGE rather than from your own rating,
   *  whenever you haven't rated and aren't hovering. Without this the pips read
   *  empty to a visitor who can't rate, which wastes the one place on the team
   *  page where a player's standing with the fans is visible. Your own rating
   *  still wins the moment you have one — this only fills the blank. */
  averageFill?: boolean
  /** Pip edge length in px. Overrides the compact/full default. */
  pipSize?: number
  /** Appended after the rater count ("34" → "34 fans"). */
  countSuffix?: string
  /** 'column' drops the average onto its own line under the pips, for narrow
   *  fixed-width columns (the team page's roster plates) where the inline
   *  average would push the pips out of their 150px cell. */
  layout?: 'inline' | 'column'
}

// The average is an aggregate, not a stance — amber and half-washed so it never
// reads as "you rated this".
const AVG_BORDER = '#f59e0b'
const AVG_FILL = 'rgba(245,158,11,0.5)'

const Pip: React.FC<{
  index: number
  active: boolean
  color: string
  /** Fill, when it differs from the border. The average-fill mode washes the
   *  pip at 50% so a computed aggregate never looks like a stance you took. */
  fill?: string
  onClick: () => void
  onHover: (n: number) => void
  size: number
  interactive: boolean
}> = ({ index, active, color, fill, onClick, onHover, size, interactive }) => (
  <button
    type="button"
    aria-label={`Rate ${index} of 5`}
    onClick={onClick}
    onMouseEnter={() => onHover(index)}
    disabled={!interactive}
    style={{
      width: size, height: size,
      padding: 0,
      border: `1px solid ${active ? color : '#334155'}`,
      borderRadius: '3px',
      backgroundColor: active ? (fill || color) : 'transparent',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'background-color 120ms ease, border-color 120ms ease, transform 120ms ease',
      transform: active && !fill ? 'translateY(-1px)' : 'none',
    }}
  />
)

export const PlayerRating: React.FC<Props> = ({
  playerId, subject = 'player', compact = false, canRate = true, onChange,
  averageFill = false, pipSize, countSuffix = '', layout = 'inline',
}) => {
  const endpoint = subject === 'gm'
    ? `${API_BASE}/teams/${playerId}/gm-vote`
    : `${API_BASE}/players/${playerId}/rating`
  const LABELS = subject === 'gm' ? GM_LABELS : PLAYER_LABELS
  const { getToken, user } = useAuth()
  const isSignedIn = !!user
  const interactive = isSignedIn && canRate
  const [data, setData] = useState<PlayerRatingData | null>(null)
  const [hover, setHover] = useState(0)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const token = isSignedIn ? await getToken() : null
      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const body = await res.json()
      if (body?.data) setData(body.data)
    } catch {
      /* a rating widget must never take the page down */
    }
  }, [endpoint, getToken, isSignedIn])

  useEffect(() => { load() }, [load])

  const submit = async (value: number) => {
    if (!interactive || busy) return
    setBusy(true)
    // Clicking your current rating withdraws it — no separate clear button.
    const withdrawing = data?.myRating === value
    try {
      const token = await getToken()
      const res = await fetch(endpoint, {
        method: withdrawing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: withdrawing ? undefined : JSON.stringify({ rating: value }),
      })
      if (res.ok) {
        await load()
        if (onChange && data) onChange(data)
      }
    } finally {
      setBusy(false)
    }
  }

  const mine = hover || data?.myRating || 0
  // Your own rating (or a hover) always wins; the average only fills the blank.
  const showingAverage = averageFill && !mine && data?.average != null
  const shown = showingAverage ? Math.round(data!.average!) : mine
  const size = pipSize ?? (compact ? 12 : 16)
  const settled = data?.average != null
  const stacked = layout === 'column'

  const averageLine = settled ? (
    <span style={{
      marginLeft: stacked ? 0 : '6px',
      fontSize: stacked || compact ? '11px' : '12px',
      color: '#cbd5e1', fontVariantNumeric: 'tabular-nums',
    }}>
      {data!.average!.toFixed(1)}
      <span style={{ color: '#94a3b8' }}> · {data!.raters}{countSuffix}</span>
    </span>
  ) : null

  return (
    <div
      onMouseLeave={() => setHover(0)}
      style={{ display: 'flex', flexDirection: 'column', gap: stacked ? '5px' : '4px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <Pip
            key={n}
            index={n}
            size={size}
            active={n <= shown}
            color={showingAverage ? AVG_BORDER : (TIER_COLOR[shown] || '#94a3b8')}
            fill={showingAverage ? AVG_FILL : undefined}
            onClick={() => submit(n)}
            onHover={interactive ? setHover : () => {}}
            interactive={interactive}
          />
        ))}
        {!stacked && averageLine}
      </div>

      {stacked && averageLine}

      {(!compact || stacked) && (
        <div style={{
          fontSize: '11px', color: '#94a3b8',
          minHeight: stacked ? 0 : '15px',
        }}>
          {!isSignedIn
            ? 'Sign in to rate'
            : !canRate
              // You follow one team — you don't get a vote on someone else's.
              ? null
            // `mine`, not `shown` — in average-fill mode `shown` is the
            // fanbase's number, and labelling it would put words in your mouth.
            : mine
              ? LABELS[mine]
              : data?.ratersNeeded
                // Honest about the gate rather than showing a number that
                // one or two people control.
                ? `${data.ratersNeeded} more rating${data.ratersNeeded === 1 ? '' : 's'} until this counts`
                : subject === 'gm' ? 'Rate the GM' : 'Rate this player'}
        </div>
      )}
    </div>
  )
}

export default PlayerRating
