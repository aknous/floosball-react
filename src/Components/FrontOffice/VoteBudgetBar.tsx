import React from 'react'
import { GM_VOTES_PER_SEASON } from '@/types/gm'

interface VoteBudgetBarProps {
  totalVotes: number
  floobits: number
}

const VoteBudgetBar: React.FC<VoteBudgetBarProps> = ({ totalVotes, floobits }) => {
  const remaining = GM_VOTES_PER_SEASON - totalVotes

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 14px',
      backgroundColor: '#0f172a',
      borderBottom: '1px solid #1e293b',
      fontSize: '11px',
    }}>
      <span style={{ color: '#94a3b8' }}>
        Directorial Allowance:{' '}
        <span style={{ color: remaining > 0 ? '#e2e8f0' : '#ef4444', fontWeight: '600' }}>
          {remaining}
        </span>
        <span style={{ color: '#94a3b8' }}> of {GM_VOTES_PER_SEASON} directives remaining</span>
      </span>
      <span style={{ color: '#f59e0b', fontWeight: '600' }}>
        {floobits} Floobits
      </span>
    </div>
  )
}

export default VoteBudgetBar
