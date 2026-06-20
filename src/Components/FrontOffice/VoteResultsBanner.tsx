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

// Produces a human-readable target clause shown after the vote type.
// cut_player / resign_player / hire_coach → single name.
// fire_coach → no specific target (it targets whoever the head coach was).
// (sign_fa is rendered separately as a ranked priority list — see below.)
function targetText(r: GmVoteResult): string | null {
  return r.targetName || null
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
        const typeLabel = VOTE_TYPE_LABELS[r.voteType] ?? r.voteType

        // FA Requisition is a ranked-choice "who do the fans want" vote — there's
        // no pass/fail threshold. Render it as the team's FA targets in priority
        // order (no RATIFIED / votes-tally), the order they'll be pursued.
        if (r.voteType === 'sign_fa') {
          const targets = r.directiveNames ?? []
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 10px', borderRadius: '4px',
              backgroundColor: 'rgba(45,212,191,0.10)',
              border: '1px solid rgba(45,212,191,0.20)',
            }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#2dd4bf', letterSpacing: '0.04em', minWidth: '120px' }}>
                FA TARGETS
              </span>
              <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '120px', flexShrink: 0 }}>
                {typeLabel}
              </span>
              {targets.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#64748b', flex: 1 }}>No targets identified</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', flex: 1, minWidth: 0 }}>
                  {targets.map((name, i) => (
                    <span key={i} style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
                      <span style={{ color: '#2dd4bf', fontWeight: 700 }}>{i + 1}.</span> {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        }

        const style = OUTCOME_STYLES[r.outcome] ?? OUTCOME_STYLES.ineligible
        const target = targetText(r)

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
            <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '120px', flexShrink: 0 }}>
              {typeLabel}
            </span>
            {target && (
              <span style={{
                fontSize: '12px',
                color: '#e2e8f0',
                fontWeight: 600,
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {target}
              </span>
            )}
            <span style={{
              fontSize: '11px',
              color: '#94a3b8',
              marginLeft: 'auto',
              flexShrink: 0,
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
