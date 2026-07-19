import React from 'react'
import { PointsBreakdownPanel, ProjectedWeekSummary } from '@/Components/Fantasy/FantasyRoster'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import { useAuth } from '@/contexts/AuthContext'

// The always-on scoring pane: how this week's total FP is built (roster FP +
// each card's effect + the aggregate formula). Before games kick off it shows
// the projection; once games run it shows the live breakdown.
export const ScoringPane: React.FC = () => {
  const { user } = useAuth()
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
    <div>
      <div style={sectionTitle}>Scoring</div>
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
        <>
          <ProjectedWeekSummary />
          <div style={{
            fontSize: 11, color: '#64748b', lineHeight: 1.6, textAlign: 'center',
            padding: '14px 12px', border: '1px dashed #253145', borderRadius: 10,
            backgroundColor: '#0f172a',
          }}>
            Your live scoring breakdown — roster FP, each card's effect, and how your
            weekly total adds up — appears here once this week's games kick off.
          </div>
        </>
      )}
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#94a3b8', marginBottom: 8,
}

export default ScoringPane
