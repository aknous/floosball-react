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
  /** Where this number's activity lives. A route, or an action for surfaces that are
      modals rather than pages (the Shop). A cell with neither stays inert. */
  to?: string
  onClick?: () => void
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
    {/* No DETAIL link. It went to /fantasy, which is right for one cell of four — now that
        each number is its own doorway, a single header link pointing at one of them is
        both redundant and wrong three times out of four. */}
    <SectionHeader title="YOUR NUMBERS" rail />
    <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
        {cells.map((cell, i) => {
          const cellStyle = {
            display: 'block', width: '100%', textAlign: 'left' as const,
            padding: '13px 14px',
            borderRight: i % 2 === 0 ? `1px solid ${BORDER.hairline}` : 'none',
            borderBottom: i < 2 ? `1px solid ${BORDER.hairline}` : 'none',
            borderTop: 'none', borderLeft: 'none',
            background: 'none', minWidth: 0,
            textDecoration: 'none',
            cursor: (cell.to || cell.onClick) ? 'pointer' : 'default',
          }
          // Each number is a doorway to the thing that produces it. The Shop is a modal
          // rather than a page, so that one dispatches instead of navigating.
          const Cell = ({ children }: { children: React.ReactNode }) =>
            cell.to
              ? <Link to={cell.to} className="row" style={cellStyle}>{children}</Link>
              : cell.onClick
                ? <button type="button" onClick={cell.onClick} className="row" style={cellStyle}>{children}</button>
                : <div style={cellStyle}>{children}</div>
          return (
          <Cell key={cell.key}>
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
          </Cell>
          )
        })}
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
