import React from 'react'
import type { GmVoteResult } from '@/types/gm'

interface VoteResultsBannerProps {
  results: GmVoteResult[]
  teamColor: string
}

const OUTCOME_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  success:         { label: 'RATIFIED',              color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  failed_roll:     { label: 'MOTION DENIED',         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  below_threshold: { label: 'INSUFFICIENT QUORUM',   color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  ineligible:      { label: 'INELIGIBLE',            color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
}

const VOTE_TYPE_LABELS: Record<string, string> = {
  fire_coach: 'Grievance',
  hire_coach: 'Appointment',
  cut_player: 'Release Notice',
  resign_player: 'Renewal Endorsement',
  sign_fa: 'FA Requisition',
}

const VoteResultsBanner: React.FC<VoteResultsBannerProps> = ({ results, teamColor }) => {
  if (results.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{
        fontSize: '11px',
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '4px',
      }}>
        Board Resolutions
      </div>

      {results.map(r => {
        const style = OUTCOME_STYLES[r.outcome] ?? OUTCOME_STYLES.ineligible
        const typeLabel = VOTE_TYPE_LABELS[r.voteType] ?? r.voteType

        return (
          <div key={r.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '4px',
            backgroundColor: style.bg,
            border: `1px solid ${style.color}20`,
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              color: style.color,
              letterSpacing: '0.04em',
              minWidth: '120px',
            }}>
              {style.label}
            </span>
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
              {typeLabel}
            </span>
            <span style={{
              fontSize: '11px',
              color: '#94a3b8',
              marginLeft: 'auto',
            }}>
              {r.totalVotes}/{r.threshold} votes · {Math.round(r.probability * 100)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default VoteResultsBanner
