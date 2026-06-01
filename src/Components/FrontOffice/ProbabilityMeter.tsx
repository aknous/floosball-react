import React from 'react'

interface ProbabilityMeterProps {
  votes: number              // NET tally (votesFor - votesAgainst)
  threshold: number
  probability: number
  votesFor?: number
  votesAgainst?: number
  compact?: boolean
  accentColor?: string
}

const ProbabilityMeter: React.FC<ProbabilityMeterProps> = ({
  votes,
  threshold,
  probability,
  votesFor,
  votesAgainst,
  compact = false,
  accentColor,
}) => {
  // Bar fills toward the threshold with the NET tally; floored at empty when
  // opposition outweighs support (net <= 0). At/above threshold it passes.
  const pct = Math.max(0, Math.min(100, (votes / Math.max(threshold, 1)) * 100))
  const probPct = Math.round(probability * 100)
  const willPass = votes >= threshold

  const barColor = willPass ? '#22c55e' : (accentColor || '#ef4444')
  const labelColor = willPass ? '#22c55e' : '#94a3b8'
  const contested = (votesAgainst ?? 0) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '2px' : '4px', width: '100%' }}>
      <div style={{
        height: compact ? '4px' : '6px',
        backgroundColor: '#0f172a',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Fill bar — net progress toward the threshold */}
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: barColor,
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#94a3b8',
      }}>
        {contested ? (
          <span>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>{votesFor ?? 0}</span>
            <span style={{ color: '#94a3b8' }}> for · </span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>{votesAgainst}</span>
            <span style={{ color: '#94a3b8' }}> against</span>
          </span>
        ) : (
          <span>
            <span style={{ color: labelColor, fontWeight: '600' }}>{Math.max(0, votes)}</span>
            /{threshold} votes
          </span>
        )}
        {(votes > 0 || contested) && (
          <span style={{ color: labelColor }}>
            {willPass ? 'Will pass' : `${probPct}%`}
          </span>
        )}
      </div>
    </div>
  )
}

export default ProbabilityMeter
