import React, { useState } from 'react'
import { OffseasonPanel } from '@/Components/OffseasonPanel'
import { SeasonRecap } from './SeasonRecap'

type View = 'draft' | 'recap'

/** Main-body offseason container: toggles between the live Draft Board and the
 *  Season Recap. Replaces the bare <OffseasonPanel /> on the dashboard during
 *  the offseason. */
export const OffseasonMain: React.FC = () => {
  const [view, setView] = useState<View>('draft')

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {([['draft', 'Draft Board'], ['recap', 'Season Recap']] as [View, string][]).map(([key, label]) => {
          const on = view === key
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
                backgroundColor: on ? '#334155' : 'transparent',
                color: on ? '#e2e8f0' : '#94a3b8',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
      {view === 'draft' ? <OffseasonPanel /> : <SeasonRecap />}
    </div>
  )
}
