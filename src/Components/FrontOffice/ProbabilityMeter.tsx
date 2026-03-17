import React from 'react'

interface ProbabilityMeterProps {
  votes: number
  threshold: number
  probability: number
  compact?: boolean
  accentColor?: string
}

const ProbabilityMeter: React.FC<ProbabilityMeterProps> = ({
  votes,
  threshold,
  probability,
  compact = false,
  accentColor,
}) => {
  const pct = Math.min(votes / Math.max(threshold, 1), 2) * 50 // 0–100 scale where threshold = 50%
  const probPct = Math.round(probability * 100)

  // Color: red below threshold, amber near, green above
  const barColor =
    votes >= threshold * 1.5 ? '#22c55e'
      : votes >= threshold ? '#f59e0b'
        : accentColor || '#ef4444'

  const labelColor = votes >= threshold ? '#22c55e' : '#94a3b8'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '2px' : '4px', width: '100%' }}>
      <div style={{
        height: compact ? '4px' : '6px',
        backgroundColor: '#0f172a',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Threshold marker */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: '#475569',
          zIndex: 1,
        }} />
        {/* Fill bar */}
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
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
        <span>
          <span style={{ color: labelColor, fontWeight: '600' }}>{votes}</span>
          /{threshold} votes
        </span>
        {votes > 0 && (
          <span style={{ color: labelColor }}>
            {probPct}% likelihood
          </span>
        )}
      </div>
    </div>
  )
}

export default ProbabilityMeter
