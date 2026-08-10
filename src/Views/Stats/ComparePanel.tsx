import React from 'react'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import type { Column } from './statsShell'

/**
 * Side-by-side comparison of the rows a reader ticked.
 *
 * ⚠️ The COMPARE button was a stub — `onClick={() => { /* comparison view is a
 * follow-up *\/ }}`. The checkboxes, the selection cap and the "n SELECTED" counter
 * were all wired and working; pressing the button did nothing at all.
 *
 * The table is TRANSPOSED against the one behind it: stats run down and the
 * selected subjects run across. That is the only way a comparison reads — the main
 * table puts subjects on rows so you can scan one stat down a column, and a
 * comparison wants the opposite.
 *
 * It reuses the SAME `Column` definitions as the table, so a stat added there shows
 * up here with its formatting, its tint and its lowerIsBetter sense already correct.
 * The alternative was a second list of stats to keep in step, which would drift the
 * first time anyone touched either.
 */

function bestIndex<Row>(col: Column<Row>, rows: Row[]): number | null {
  // Only a sortable column has a comparable number; a stat line has no "best".
  if (!col.sort || col.flexible) return null
  const values = rows.map(r => {
    const v = col.sort!(r)
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  })
  if (values.some(v => v == null)) return null
  const nums = values as number[]
  const target = col.lowerIsBetter ? Math.min(...nums) : Math.max(...nums)
  // A tie has no winner — highlighting every one of them says nothing.
  if (nums.filter(v => v === target).length !== 1) return null
  return nums.indexOf(target)
}

export function ComparePanel<Row extends { id: number }>({
  rows, columns, title, subject, onClose,
}: {
  rows: Row[]
  columns: Column<Row>[]
  /** What each column of the comparison is — a player's name, a club's name. */
  title: (row: Row) => React.ReactNode
  /** 'players' | 'clubs', for the heading. */
  subject: string
  onClose: () => void
}) {
  if (rows.length === 0) return null
  const stats = columns.filter(c => !c.flexible)

  return (
    <div style={{
      margin: '0 24px 18px', background: BG.panel,
      border: `1px solid ${BORDER.raised}`, fontFamily: FONT,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px', borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
        <span style={{ ...font(700, 11, 1, '0.1em'), color: TEXT.secondary }}>
          COMPARING {rows.length} {subject.toUpperCase()}
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            ...font(700, 10, 1, '0.08em'), color: TEXT.muted,
            background: 'transparent', border: `1px solid ${BORDER.raised}`,
            padding: '5px 9px', cursor: 'pointer', fontFamily: FONT,
          }}
        >CLOSE</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: `${170 + rows.length * 150}px` }}>
          {/* Heading row: the subjects. */}
          <div style={{
            display: 'flex', alignItems: 'center',
            borderBottom: `1px solid ${BORDER.raised}`,
          }}>
            <span style={{ width: '170px', flexShrink: 0, padding: '10px 16px' }} />
            {rows.map(row => (
              <span key={row.id} style={{
                flex: 1, minWidth: '150px', padding: '10px 12px',
                borderLeft: `1px solid ${BORDER.hairline}`,
              }}>{title(row)}</span>
            ))}
          </div>

          {stats.map((col, i) => (
            <div key={col.key} style={{
              display: 'flex', alignItems: 'center',
              borderBottom: i < stats.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
            }}>
              <span style={{
                width: '170px', flexShrink: 0, padding: '8px 16px',
                ...font(700, 10, 1, '0.1em'), color: TEXT.muted,
              }}>
                {col.label}
                {col.lowerIsBetter && (
                  <span style={{ ...font(400, 9), color: BORDER.raised }}> LOWER</span>
                )}
              </span>
              {(() => {
                const best = bestIndex(col, rows)
                return rows.map((row, j) => (
                  <span key={row.id} style={{
                    flex: 1, minWidth: '150px', padding: '8px 12px',
                    borderLeft: `1px solid ${BORDER.hairline}`,
                    ...font(best === j ? 800 : 500, 13), ...TABULAR,
                    color: best === j ? ACCENT.live : TEXT.secondary,
                    background: best === j ? 'rgba(74,222,128,0.06)' : undefined,
                  }}>{col.cell(row)}</span>
                ))
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ComparePanel
