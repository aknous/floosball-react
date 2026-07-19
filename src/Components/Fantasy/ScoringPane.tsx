import React, { useEffect } from 'react'
import { PointsBreakdownPanel } from '@/Components/Fantasy/FantasyRoster'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import { useLineup, BASE_SLOTS, FLEX_SLOT, LineupSlot, EquippedEntry } from '@/hooks/useLineup'
import { useCardProjection, CardProjection } from '@/hooks/useCardProjection'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const TYPE_COLORS = { fp: '#4ade80', mult: '#f472b6', floobits: '#eab308' }

// The always-on scoring pane. Once games are live it shows the full live
// breakdown; before kickoff it shows a projection that fills in dynamically as
// cards are equipped (each row is a fielded player + that card's effect).
// Wrapped in the same card shell as the leaderboard so the two panes match.
export const ScoringPane: React.FC = () => {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const snap = useFantasySnapshot(user?.id)
  const myEntry = snap.myEntry

  const hasScoring = snap.gamesActive
    || (myEntry?.weekTotal ?? 0) > 0
    || (myEntry?.cardBreakdowns?.length ?? 0) > 0

  const playerSummaries = (myEntry?.players ?? []).map(p => ({
    playerName: p.playerName,
    position: p.position || p.slot,
    weekFP: p.weekFP,
  }))

  return (
    <div style={cardStyleFn(isMobile)}>
      {/* Header — mirrors the leaderboard header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>Scoring</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            {hasScoring ? 'Live this week' : 'Projected this week'}
            {snap.week ? ` — Week ${snap.week}` : ''}
          </div>
        </div>
      </div>

      {hasScoring && myEntry ? (
        <PointsBreakdownPanel
          playerSummaries={playerSummaries}
          breakdowns={myEntry.cardBreakdowns}
          equationSummary={myEntry.equationSummary}
          weekPlayerFP={myEntry.weekPlayerFP}
          weekCardBonus={myEntry.weekCardBonus}
          seasonEarnedFP={myEntry.seasonEarnedFP}
          seasonCardBonus={myEntry.seasonCardBonus}
          seasonTotal={myEntry.seasonTotal}
          modifier={snap.modifier}
        />
      ) : (
        <LineupScoringPreview />
      )}
    </div>
  )
}

// Same shell the leaderboard uses (FantasyLeaderboard.cardStyleFn) so the two
// dashboard columns read as siblings.
const cardStyleFn = (mobile: boolean): React.CSSProperties => ({
  backgroundColor: '#1e293b',
  borderRadius: '14px',
  border: '1px solid #334155',
  padding: mobile ? '12px' : '24px',
})

// Pre-lock projection built from the live lineup + card projection. Updates the
// moment a card is equipped (both hooks refetch on the 'cards-equipped' event).
const LineupScoringPreview: React.FC = () => {
  const lineup = useLineup()
  const { equipped: proj, refetch: refetchProj } = useCardProjection(false)

  useEffect(() => {
    const h = () => refetchProj()
    window.addEventListener('cards-equipped', h)
    return () => window.removeEventListener('cards-equipped', h)
  }, [refetchProj])

  const projBySlot = new Map<number, CardProjection>()
  if (proj) for (const c of proj.cards) projBySlot.set(c.slotNumber, c)

  const slots: LineupSlot[] = [...BASE_SLOTS, ...(lineup.hasFlex ? [FLEX_SLOT] : [])]

  const effectChip = (entry: EquippedEntry | undefined): React.ReactNode => {
    if (!entry) return <span style={{ color: '#475569' }}>—</span>
    if (entry.card.edition === 'standard') return <span style={{ color: '#64748b' }}>No effect</span>
    const p = projBySlot.get(entry.slotNumber)
    if (p) {
      if (p.projectedFloobits > 0) return <span style={{ color: TYPE_COLORS.floobits }}>+{p.projectedFloobits} Floobits</span>
      if (p.projectedMult > 1) return <span style={{ color: TYPE_COLORS.mult }}>+{(p.projectedMult - 1).toFixed(2)} FPx</span>
      if (p.projectedFP > 0) return <span style={{ color: TYPE_COLORS.fp }}>+{p.projectedFP.toFixed(1)} FP</span>
    }
    // Effect card with no projected value yet — name the effect so it's not blank.
    return <span style={{ color: '#94a3b8' }}>{entry.card.displayName || entry.card.effectName || 'effect'}</span>
  }

  return (
    <div style={panel}>
      {/* One row per lineup slot — fills in as cards are equipped */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {slots.map(slot => {
          const entry = lineup.bySlot[slot]
          return (
            <div key={slot} style={rowStyle}>
              <span style={posTag}>{slot}{slot === FLEX_SLOT && <span style={{ color: '#fbbf24', marginLeft: 3 }}>◇</span>}</span>
              <span style={{
                flex: 1, minWidth: 0, color: entry ? '#e2e8f0' : '#64748b',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {entry ? entry.card.playerName : `Add a ${slot} card`}
              </span>
              <span style={{ flexShrink: 0, fontWeight: 700, fontSize: 12 }}>{effectChip(entry)}</span>
            </div>
          )
        })}
      </div>

      {/* Projected totals — how it adds up */}
      {proj && (
        <div style={{ marginTop: 8, borderTop: '1px solid #334155', paddingTop: 8 }}>
          <div style={totalRow}>
            <span style={{ color: '#94a3b8' }}>Roster FP</span>
            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{proj.projectedRosterFP.toFixed(1)}</span>
          </div>
          <div style={totalRow}>
            <span style={{ color: '#94a3b8' }}>Card Bonus</span>
            <span style={{ color: proj.totalBonusFP > 0 ? TYPE_COLORS.fp : '#94a3b8', fontWeight: 700 }}>
              {proj.totalBonusFP > 0 ? '+' : ''}{proj.totalBonusFP.toFixed(1)}
            </span>
          </div>
          <div style={{ ...totalRow, borderTop: '1px solid #253145', marginTop: 4, paddingTop: 6 }}>
            <span style={{ color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11 }}>
              Projected Total
            </span>
            <span style={{ color: '#60a5fa', fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
              {proj.projectedTotalFP.toFixed(1)} FP
              {proj.bestCaseTotalFP > proj.projectedTotalFP + 0.5 && (
                <span style={{ color: '#60a5fa', opacity: 0.7, fontSize: 11, fontWeight: 600, marginLeft: 6 }}>
                  up to {proj.bestCaseTotalFP.toFixed(1)}
                </span>
              )}
            </span>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
            Projected from season averages and ELO. Live scoring — with each card's exact effect — takes over once this week's games start.
          </div>
        </div>
      )}
    </div>
  )
}

const panel: React.CSSProperties = {
  backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px',
}
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: 10, padding: '5px 0', fontSize: 13,
  borderBottom: '1px solid rgba(51,65,85,0.4)',
}
const posTag: React.CSSProperties = {
  color: '#94a3b8', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
  width: 44, flexShrink: 0, textTransform: 'uppercase',
}
const totalRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0', fontSize: 13,
}

export default ScoringPane
