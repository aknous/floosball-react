import React from 'react'
import { PickEmProvider } from '@/contexts/PickEmContext'
import { PickEmPanel } from '@/Components/PickEm/PickEmPanel'
import { BG, BORDER, TEXT, FONT, font } from '@/Components/Shell/tokens'

/**
 * Prognostications gets its own route because the redesigned nav gives it one — it used
 * to be a tab inside the dashboard's right rail, which no longer exists.
 *
 * This is deliberately a thin frame around the existing `PickEmPanel` rather than a
 * redesign of it: pick-em was not part of the three design handoffs, and rebuilding it
 * on spec I don't have would be guessing.
 */
const PrognosticationsPage: React.FC = () => (
  <>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '15px 28px', background: BG.shell,
      borderBottom: `1px solid ${BORDER.hairline}`, fontFamily: FONT,
    }}>
      <h1 style={{ ...font(800, 22, 1, '-0.03em'), color: TEXT.primary, margin: 0 }}>Prognostications</h1>
      <span style={{ width: '1px', height: '24px', background: BORDER.hairline }} />
      <span style={{ ...font(400, 12), color: TEXT.muted }}>
        Call every game of the day. A pick locks when its game goes final.
      </span>
    </div>

    <div style={{ padding: '18px 28px 28px', fontFamily: FONT }}>
      <div style={{ maxWidth: '760px' }}>
        <PickEmProvider>
          <PickEmPanel />
        </PickEmProvider>
      </div>
    </div>
  </>
)

export default PrognosticationsPage
