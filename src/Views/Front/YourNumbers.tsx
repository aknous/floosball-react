import React from 'react'
import { Link } from 'react-router-dom'
import { BG, BORDER, TEXT, TABULAR, font } from '@/Components/Shell/tokens'
import { SectionHeader } from './frontPieces'

export interface NumbersCell {
  key: string
  value: string
  suffix?: string
  valueColor?: string
  label: string
  note: string
  noteColor?: string
}

export interface NumbersAction {
  label: string
  to: string
  color: string
}

/**
 * The rail's read on the user's own participation: a 2x2 of the four numbers they own,
 * and an action strip underneath.
 *
 * The action buttons are CONDITIONAL. They render only when there is something to do,
 * and the strip drops entirely when neither applies — a permanently-present "claim 0
 * rewards" button trains people to ignore the strip.
 */
const YourNumbers: React.FC<{
  cells: NumbersCell[]
  actions: NumbersAction[]
}> = ({ cells, actions }) => (
  <div>
    <SectionHeader title="YOUR NUMBERS" link={{ to: '/fantasy', label: 'DETAIL →' }} rail />
    <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
        {cells.map((cell, i) => (
          <div
            key={cell.key}
            style={{
              padding: '13px 14px',
              borderRight: i % 2 === 0 ? `1px solid ${BORDER.hairline}` : 'none',
              borderBottom: i < 2 ? `1px solid ${BORDER.hairline}` : 'none',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
              <span style={{ ...font(800, 24), color: cell.valueColor || TEXT.primary, ...TABULAR }}>
                {cell.value}
              </span>
              {cell.suffix && (
                <span style={{ ...font(700, 12), color: TEXT.muted, ...TABULAR }}>{cell.suffix}</span>
              )}
            </div>
            <div style={{ ...font(700, 9, 1, '0.12em'), color: TEXT.muted, marginTop: '7px' }}>
              {cell.label}
            </div>
            <div style={{
              ...font(700, 10), color: cell.noteColor || TEXT.muted, marginTop: '6px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{cell.note}</div>
          </div>
        ))}
      </div>

      {actions.length > 0 && (
        <div style={{
          display: 'flex', gap: '6px', padding: '11px 12px',
          borderTop: `1px solid ${BORDER.hairline}`, background: BG.panel,
        }}>
          {actions.map(action => (
            <Link
              key={action.label}
              to={action.to}
              style={{
                flex: 1, textAlign: 'center', padding: '9px 0',
                ...font(700, 10, 1, '0.08em'),
                color: BG.shell, background: action.color, textDecoration: 'none',
              }}
            >{action.label}</Link>
          ))}
        </div>
      )}
    </div>
  </div>
)

export default YourNumbers
