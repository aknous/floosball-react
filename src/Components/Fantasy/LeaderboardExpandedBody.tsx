import React, { useEffect, useState } from 'react'
import axios from 'axios'
import HoverTooltip from '@/Components/HoverTooltip'
import type { CardData } from '@/Components/Cards/TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface ExpandedPlayer {
  slot: string
  playerName: string
  teamAbbr?: string
  teamId?: number | null
  points: number
  isPrev?: boolean
}

interface EquippedCardEntry {
  slotNumber: number
  card: CardData
  isMatch: boolean
}

// Subset of CardBreakdownEntry fields we render in this view.
interface CardBreakdown {
  slotNumber?: number
  playerName?: string
  edition: string
  tier?: number
  effectName?: string
  displayName?: string
  detail?: string
  outputType?: string
  primaryFP?: number
  primaryMult?: number
  primaryFloobits?: number
  floobitsEarned?: number
  matchMultiplied?: boolean
  equation?: string
}

// Lineup slot display order (QB → RB → WR → TE → K → FLEX).
const SLOT_ORDER: Record<string, number> = { QB: 0, RB: 1, WR1: 2, WR2: 3, TE: 4, K: 5, FLEX: 6 }
const slotRank = (s: string) => (s in SLOT_ORDER ? SLOT_ORDER[s] : 99)
// EquippedCard.slot_number → slot label, for matching breakdowns/cards to a slot.
const SLOTNUM_LABEL: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR1', 4: 'WR2', 5: 'TE', 6: 'K', 7: 'FLEX' }

interface Props {
  userId: number
  season: number
  week: number
  players: ExpandedPlayer[]
  breakdowns?: CardBreakdown[]
  isMobile: boolean
}

const cardCache = new Map<string, EquippedCardEntry[]>()

const EDITION_SHORT: Record<string, string> = {
  base: 'BASE',
  holographic: 'HOLO',
  prismatic: 'PRSM',
  diamond: 'DMND',
}

const TIER_ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' }
// Small gold tier chip — only shown for upgraded cards (tier 2+).
const TierTag: React.FC<{ tier?: number }> = ({ tier }) => {
  if (!tier || tier < 2) return null
  return (
    <span style={{
      fontSize: '9px', fontWeight: 800, color: '#fbbf24',
      background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.35)',
      borderRadius: '3px', padding: '0 4px', flexShrink: 0, lineHeight: '14px',
    }}>{TIER_ROMAN[tier] ?? tier}</span>
  )
}

const EDITION_COLORS: Record<string, string> = {
  base: '#94a3b8',
  holographic: '#c4b5fd',
  prismatic: '#f472b6',
  diamond: '#67e8f9',
}

const TYPE_COLORS: Record<string, string> = {
  flat_fp: '#4ade80',
  multiplier: '#f472b6',
  floobits: '#eab308',
}

const teamAvatarSize = 16
const teamAvatarStyle: React.CSSProperties = {
  width: teamAvatarSize, height: teamAvatarSize, flexShrink: 0,
  borderRadius: '3px',
}
const teamAvatarPlaceholderStyle: React.CSSProperties = {
  width: teamAvatarSize, height: teamAvatarSize, flexShrink: 0,
}

interface BreakdownOutputPart { str: string; color: string }

function formatBreakdownOutput(b: CardBreakdown): BreakdownOutputPart[] {
  const fp = b.primaryFP ?? 0
  const mult = b.primaryMult ?? 1
  const floobits = b.floobitsEarned ?? b.primaryFloobits ?? 0
  // Multi-output cards (e.g. Believe pays FP per fav-team win AND floobits on
  // a fav-team win) need both numbers visible. Returns an array so the row
  // can render each part in its own color.
  const parts: BreakdownOutputPart[] = []
  if (mult > 1) {
    parts.push({ str: `+${(mult - 1).toFixed(2)} FPx`, color: TYPE_COLORS.multiplier })
  }
  if (fp > 0.05) {
    parts.push({ str: `+${fp.toFixed(1)} FP`, color: TYPE_COLORS.flat_fp })
  }
  if (floobits > 0) {
    parts.push({ str: `+${Math.round(floobits)}F`, color: TYPE_COLORS.floobits })
  }
  return parts
}

export const LeaderboardExpandedBody: React.FC<Props> = ({ userId, season, week, players, breakdowns, isMobile }) => {
  // Only fetch the public equipped-cards endpoint when no breakdowns were
  // provided (e.g. an old historical week without saved breakdowns).
  // Breakdowns include the runtime output values, which the static card
  // payload doesn't.
  const cacheKey = `${userId}:${season}:${week}`
  const hasBreakdowns = (breakdowns?.length ?? 0) > 0
  const [cards, setCards] = useState<EquippedCardEntry[] | null>(
    hasBreakdowns ? null : (cardCache.get(cacheKey) ?? null),
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hasBreakdowns) return
    if (cards != null) return
    let cancelled = false
    setLoading(true)
    axios.get(`${API_BASE}/cards/equipped/public/${userId}`, { params: { season, week } })
      .then(res => {
        if (cancelled) return
        const list: EquippedCardEntry[] = res.data?.data?.equippedCards || res.data?.equippedCards || []
        cardCache.set(cacheKey, list)
        setCards(list)
      })
      .catch(() => { if (!cancelled) setCards([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cacheKey, cards, userId, season, week, hasBreakdowns])

  const sortedCards = cards ? [...cards].sort((a, b) => a.slotNumber - b.slotNumber) : []

  // Match each fielded player to their card's effect (by slot, falling back to
  // player name) so the player and its effect render on the same row.
  const breakdownBySlot = new Map<string, CardBreakdown>()
  const breakdownByName = new Map<string, CardBreakdown>()
  for (const b of breakdowns ?? []) {
    if (b.slotNumber != null && SLOTNUM_LABEL[b.slotNumber]) breakdownBySlot.set(SLOTNUM_LABEL[b.slotNumber], b)
    if (b.playerName) breakdownByName.set(b.playerName, b)
  }
  const cardBySlot = new Map<string, EquippedCardEntry>()
  const cardByName = new Map<string, EquippedCardEntry>()
  for (const c of sortedCards) {
    const label = SLOTNUM_LABEL[c.slotNumber]
    if (label) cardBySlot.set(label, c)
    if (c.card.playerName) cardByName.set(c.card.playerName, c)
  }

  // One row per lineup card: player (+FP) on the left, effect (+its output) on
  // the right. Ordered by slot (QB → RB → WR → TE → K → FLEX), not by score.
  const orderedPlayers = [...players]
    .filter(p => !p.isPrev)
    .sort((a, b) => slotRank(a.slot) - slotRank(b.slot))
  const prevPlayers = players.filter(p => p.isPrev)

  const renderRow = (
    key: React.Key,
    opts: {
      slot: string; teamId?: number | null; teamAbbr?: string;
      playerName: string; playerFP: number | null;
      edition?: string; effectLabel?: string; tier?: number; detail?: string;
      outputType?: string; matched?: boolean; outputParts?: BreakdownOutputPart[];
      hasEffectSource: boolean; muted?: boolean;
    },
  ) => {
    const effectColor = opts.muted ? '#64748b' : (TYPE_COLORS[opts.outputType ?? ''] ?? '#cbd5e1')
    const label = opts.effectLabel || ''
    const outputParts = opts.outputParts ?? []
    return (
      <div key={key} style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: isMobile ? '5px 0' : '6px 0', fontSize: isMobile ? '11px' : '12px',
        borderBottom: '1px solid rgba(51,65,85,0.4)',
      }}>
        {/* Left: slot · player · player FP */}
        <span style={{ width: isMobile ? 30 : 38, color: '#64748b', fontWeight: 700, fontSize: isMobile ? '10px' : '11px', flexShrink: 0 }}>
          {opts.slot}
        </span>
        {opts.teamId != null
          ? <img src={`/avatars/${opts.teamId}.png`} alt={opts.teamAbbr || ''} style={teamAvatarStyle} />
          : <span style={teamAvatarPlaceholderStyle} />}
        <span style={{
          flex: '1 1 0', minWidth: 0, color: opts.muted ? '#64748b' : '#e2e8f0', fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontStyle: opts.muted ? 'italic' : 'normal',
        }}>
          {opts.playerName}
        </span>
        <span style={{
          color: opts.muted ? '#64748b' : '#22c55e', fontWeight: 700,
          minWidth: isMobile ? 34 : 42, textAlign: 'right', flexShrink: 0,
          fontVariantNumeric: 'tabular-nums' as const,
        }}>
          {opts.playerFP != null ? `+${opts.playerFP.toFixed(0)}` : '—'}
        </span>

        {/* Divider */}
        <span style={{ width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(71,85,105,0.5)', flexShrink: 0, margin: '0 2px' }} />

        {/* Right: effect name · effect output */}
        {opts.hasEffectSource ? (
          <>
            {opts.edition && (
              <span style={{ color: EDITION_COLORS[opts.edition] ?? '#94a3b8', fontWeight: 700, fontSize: '10px', flexShrink: 0, minWidth: 32 }}>
                {EDITION_SHORT[opts.edition] ?? opts.edition}
              </span>
            )}
            <span style={{
              flex: '1 1 0', minWidth: 0, color: effectColor, fontWeight: opts.matched ? 700 : 400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {label ? (
                <HoverTooltip text={opts.detail || ''} color={effectColor}>
                  <span>{label}</span>
                </HoverTooltip>
              ) : <span style={{ color: '#64748b' }}>No effect</span>}
            </span>
            <TierTag tier={opts.tier} />
            {outputParts.length > 0 ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700,
                fontSize: isMobile ? '11px' : '12px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' as const,
              }}>
                {outputParts.map((p, i) => <span key={i} style={{ color: p.color }}>{p.str}</span>)}
              </span>
            ) : (
              <span style={{ color: '#64748b', fontSize: '10px', flexShrink: 0 }}>—</span>
            )}
          </>
        ) : (
          <span style={{ flex: '1 1 0', color: '#64748b', fontSize: '10px' }}>—</span>
        )}
      </div>
    )
  }

  const rows = orderedPlayers.map((p, i) => {
    const b = breakdownBySlot.get(p.slot) ?? (breakdownByName.get(p.playerName))
    const c = cardBySlot.get(p.slot) ?? cardByName.get(p.playerName)
    if (b) {
      return renderRow(p.slot + i, {
        slot: p.slot, teamId: p.teamId, teamAbbr: p.teamAbbr,
        playerName: p.playerName, playerFP: p.points,
        edition: b.edition, effectLabel: b.displayName || b.effectName || '',
        tier: b.tier, detail: b.detail, outputType: b.outputType, matched: b.matchMultiplied,
        outputParts: formatBreakdownOutput(b), hasEffectSource: true,
      })
    }
    if (c) {
      return renderRow(p.slot + i, {
        slot: p.slot, teamId: p.teamId, teamAbbr: p.teamAbbr,
        playerName: p.playerName, playerFP: p.points,
        edition: c.card.edition, effectLabel: c.card.displayName || c.card.effectName || '',
        tier: c.card.tier, detail: c.card.detail || c.card.tooltip, outputType: c.card.outputType,
        matched: c.isMatch, outputParts: [], hasEffectSource: true,
      })
    }
    return renderRow(p.slot + i, {
      slot: p.slot, teamId: p.teamId, teamAbbr: p.teamAbbr,
      playerName: p.playerName, playerFP: p.points, hasEffectSource: false,
    })
  })

  return (
    <div style={{ padding: isMobile ? '4px 8px 10px 12px' : '4px 16px 14px 16px' }}>
      {loading && !hasBreakdowns && (
        <div style={{ fontSize: '11px', color: '#64748b', padding: '4px 0' }}>Loading…</div>
      )}
      {rows}
      {prevPlayers.map((p, i) => renderRow('prev' + i, {
        slot: 'PREV', playerName: p.playerName, playerFP: p.points,
        hasEffectSource: false, muted: true,
      }))}
      {rows.length === 0 && !loading && (
        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
          No lineup for this week
        </div>
      )}
    </div>
  )
}
