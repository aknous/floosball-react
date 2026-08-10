import React from 'react'
import HoverTooltip from '@/Components/HoverTooltip'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'

/**
 * The stats page is one table shell. The position filter and the side filter
 * change WHICH columns fill it, never the row height, the header, the number
 * style or the three column widths. That is the whole idea: the old page drew a
 * different table per position and read as four different pages.
 */

/** The column widths, and nothing else. */
export const W = {
  /** counts — GP, REC, TD, INT */
  count: 44,
  /** rates and ratings — RCV%, YPR, PERF */
  rate: 52,
  /** volume and totals — YDS, PTS */
  volume: 58,
  /**
   * A rate whose LABEL needs the extra room, not its value.
   *
   * ⚠️ Added for `WPA WINS`. The unit has to be in the header — the figure is
   * meaningless without it (see the wpa column) — and at `rate` the label ran into
   * PERF beside it and the two read as one word, "PERFWPA WINS".
   */
  wideRate: 68,
} as const

export interface Column<Row> {
  key: string
  label: string
  /**
   * What the header abbreviation MEANS, shown on hover.
   *
   * ⚠️ Optional, and a column with nothing worth saying must leave it out. The header
   * used to carry `title={col.label}`, so every column had a browser tooltip that
   * repeated the word already on screen — hovering told you "PTS" means "PTS". A
   * tooltip that says nothing is worse than none, because it costs a hover to find out.
   */
  help?: string
  width: number
  /** What the cell shows. */
  cell: (row: Row) => React.ReactNode
  /** What the column sorts on. Omit for a column that does not sort. */
  sort?: (row: Row) => number
  /** Lower is better — sorts ascending first (yards allowed, points against). */
  lowerIsBetter?: boolean
  /** Colour through a ramp instead of the flat body colour. */
  tint?: (row: Row) => string | undefined
  /** Grows to fill the row instead of taking a fixed width (the stat line). */
  flexible?: boolean
}

/** The page's ONE segmented control: mode, scope, and the teams rate toggle. */
export const Segmented = <T extends string>({ options, value, onChange }: {
  options: { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
  }) => (
  <div style={{ display: 'flex', background: BG.panel, border: `1px solid ${BORDER.hairline}` }}>
    {options.map((option, i) => {
      const active = option.key === value
      return (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          style={{
            ...font(active ? 800 : 500, 11, 1, '0.08em'),
            color: active ? BG.shell : TEXT.muted,
            background: active ? TEXT.secondary : 'transparent',
            border: 'none',
            borderLeft: i > 0 ? `1px solid ${BORDER.hairline}` : 'none',
            padding: '8px 13px', cursor: 'pointer', fontFamily: FONT,
          }}
        >{option.label}</button>
      )
    })}
  </div>
)

/** A filter pill. Same object for positions and for the teams SIDE. */
export const Pill: React.FC<{
  label: string
  active: boolean
  onClick: () => void
  count?: number
  disabled?: boolean
}> = ({ label, active, onClick, count, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      ...font(active ? 800 : 500, 11),
      color: active ? BG.shell : disabled ? BORDER.hover : TEXT.muted,
      background: active ? TEXT.secondary : BG.shell,
      border: `1px solid ${active ? TEXT.secondary : BORDER.hairline}`,
      padding: '6px 10px',
      cursor: disabled ? 'default' : 'pointer',
      fontFamily: FONT,
    }}
  >
    {label}
    {count != null && (
      <span style={{ ...font(500, 10), color: active ? BG.shell : TEXT.muted, ...TABULAR }}>{count}</span>
    )}
  </button>
)

/** A status chip: same pill, but selection reads in the selection blue. */
export const StatusChip: React.FC<{
  label: string
  count: number
  active: boolean
  onClick: () => void
}> = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      ...font(active ? 700 : 500, 11),
      color: active ? TEXT.body : TEXT.muted,
      background: active ? 'rgba(56,189,248,0.12)' : BG.shell,
      border: `1px solid ${active ? ACCENT.info : BORDER.hairline}`,
      padding: '6px 10px', cursor: 'pointer', fontFamily: FONT,
    }}
  >
    {label}
    <span style={{ ...font(500, 10), color: active ? '#7dd3fc' : TEXT.muted, ...TABULAR }}>{count}</span>
  </button>
)

export const FilterLabel: React.FC<{ children: React.ReactNode; width?: number }> = ({ children, width = 64 }) => (
  <span style={{ ...font(700, 9, 1, '0.14em'), color: TEXT.muted, width: `${width}px`, flexShrink: 0 }}>
    {children}
  </span>
)

export const Rule: React.FC = () => (
  <span style={{ width: '1px', height: '24px', background: BORDER.raised, flexShrink: 0 }} />
)

export const SearchBox: React.FC<{
  value: string
  onChange: (v: string) => void
  placeholder: string
}> = ({ value, onChange, placeholder }) => (
  <label style={{
    display: 'flex', alignItems: 'center', gap: '8px',
    background: BG.shell, border: `1px solid ${BORDER.hairline}`,
    padding: '7px 10px', width: '220px', flexShrink: 0,
  }}>
    <svg width="12" height="12" viewBox="0 0 20 20" fill={TEXT.muted} style={{ flexShrink: 0 }}>
      <path d="M8 3a5 5 0 013.9 8.1l4 4-1.4 1.4-4-4A5 5 0 118 3zm0 2a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
        ...font(400, 11), color: TEXT.body, fontFamily: FONT,
      }}
    />
  </label>
)

export const Checkbox: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({
  checked, onChange, disabled,
}) => (
  <button
    onClick={e => { e.stopPropagation(); onChange() }}
    disabled={disabled}
    aria-pressed={checked}
    style={{
      width: '12px', height: '12px', boxSizing: 'border-box', flexShrink: 0,
      background: checked ? ACCENT.info : 'transparent',
      border: `1px solid ${checked ? ACCENT.info : BORDER.hover}`,
      cursor: disabled && !checked ? 'default' : 'pointer',
      padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: disabled && !checked ? 0.4 : 1,
    }}
  >
    {checked && (
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5l2.5 2.5L8.5 2.5" stroke={BG.shell} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button>
)

export const CompareButton: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => {
  const armed = count > 0
  return (
    <button
      onClick={onClick}
      disabled={!armed}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        background: armed ? 'rgba(56,189,248,0.12)' : BG.shell,
        border: `1px solid ${armed ? ACCENT.info : BORDER.raised}`,
        padding: '7px 13px', cursor: armed ? 'pointer' : 'default', fontFamily: FONT,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 20 20" fill={armed ? ACCENT.info : TEXT.muted} style={{ flexShrink: 0 }}>
        <path d="M3 3h6v14H3V3zm8 0h6v9h-6V3z" />
      </svg>
      <span style={{ ...font(800, 11, 1, '0.08em'), color: armed ? '#7dd3fc' : TEXT.muted }}>COMPARE</span>
    </button>
  )
}

const Chevron: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 20 20" fill={TEXT.muted} style={{ flexShrink: 0 }}>
    <path d="M5 7l5 6 5-6H5z" />
  </svg>
)

/** SEASON plate. Disabled in career scope, where a season means nothing. */
export const SeasonPicker: React.FC<{
  season: number
  seasons: number[]
  disabled: boolean
  onChange: (season: number) => void
}> = ({ season, seasons, disabled, onChange }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        className={disabled ? undefined : 'plate'}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: BG.card, border: `1px solid ${BORDER.raised}`,
          padding: '8px 12px', cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.45 : 1, fontFamily: FONT,
        }}
      >
        <span style={{ ...font(700, 11, 1, '0.08em'), color: TEXT.muted }}>SEASON</span>
        <span style={{ ...font(800, 13), color: TEXT.body, ...TABULAR }}>{season}</span>
        <Chevron />
      </button>
      {open && !disabled && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 41,
            background: BG.card, border: `1px solid ${BORDER.raised}`,
            maxHeight: '280px', overflowY: 'auto', minWidth: '120px',
          }}>
            {seasons.map(s => (
              <button
                key={s}
                className="row"
                onClick={() => { onChange(s); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '8px 14px', fontFamily: FONT,
                  ...font(s === season ? 800 : 500, 12),
                  color: s === season ? TEXT.strong : TEXT.secondary,
                }}
              >Season {s}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── The table ────────────────────────────────────────────────────────────────

export interface LeadCell<Row> {
  width: number
  render: (row: Row) => React.ReactNode
  header: string
}

/**
 * One header, one row height, one number style — for players and for teams.
 *
 * The lead cells (checkbox, rank, name, team) are passed in because they are the
 * only part that genuinely differs between the two modes; everything to the
 * right of the spacer is the same machine.
 */
export function StatsTable<Row extends { id: number }>({
  rows, columns, leads, sortKey, sortAsc, onSort, selected, onToggle, selectionFull, emptyMessage,
}: {
  rows: Row[]
  columns: Column<Row>[]
  leads: LeadCell<Row>[]
  sortKey: string
  sortAsc: boolean
  onSort: (key: string) => void
  selected: Set<number>
  onToggle: (id: number) => void
  selectionFull: boolean
  emptyMessage: string
}) {
  const fixedWidth = columns.filter(c => !c.flexible).reduce((w, c) => w + c.width, 0)
  const leadWidth = leads.reduce((w, l) => w + l.width, 0)
  const minWidth = 24 + leadWidth + 120 + fixedWidth + 48

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: `${minWidth}px` }}>

        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 24px',
          background: BG.panel, borderBottom: `1px solid ${BORDER.raised}`,
        }}>
          <span style={{ width: '24px', flexShrink: 0 }} />
          {leads.map(lead => (
            <span key={lead.header} style={{
              width: `${lead.width}px`, flexShrink: 0,
              ...font(700, 11, 1, '0.1em'), color: TEXT.muted, padding: '10px 0',
            }}>{lead.header}</span>
          ))}
          <span style={{ flex: 1, minWidth: '60px' }} />
          {columns.map(col => {
            const sorted = col.sort && sortKey === col.key
            return (
              <button
                key={col.key}
                onClick={() => col.sort && onSort(col.key)}
                style={{
                  width: col.flexible ? undefined : `${col.width}px`,
                  // ⚠️ basis 0, NOT auto. With `1 1 auto` a flexible column sizes to
                  // ITS OWN TEXT plus a share of the slack — and the header's text
                  // ("STAT LINE") is far shorter than a body cell's ("21/22 rec · 215
                  // yd · 3 TD"). The two rows therefore computed different widths for
                  // the same column, and every fixed column to its left was pushed out
                  // of line by the difference (measured: 48px). Basis 0 makes the split
                  // depend only on the row width, which header and body share.
                  flex: col.flexible ? '1 1 0' : undefined,
                  minWidth: col.flexible ? 0 : undefined,
                  flexShrink: 0,
                  textAlign: col.flexible ? 'left' : 'right',
                  background: 'transparent', border: 'none',
                  // A flexible column sits immediately right of a right-aligned
                  // number, so without the inset the two strings touch. It must
                  // come AFTER the shorthand or the shorthand resets it.
                  padding: `10px 0 10px ${col.flexible ? 16 : 0}px`,
                  cursor: col.sort ? 'pointer' : 'default', fontFamily: FONT,
                  ...font(sorted ? 800 : 700, 11, 1, '0.1em'),
                  color: sorted ? TEXT.body : TEXT.muted,
                  whiteSpace: 'nowrap', overflow: 'hidden',
                }}
              >{col.help
                ? (
                  <HoverTooltip text={col.help}>
                    {col.label}{sorted ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </HoverTooltip>
                )
                : <>{col.label}{sorted ? (sortAsc ? ' ▲' : ' ▼') : ''}</>}</button>
            )
          })}
        </div>

        {rows.map(row => {
          const isSelected = selected.has(row.id)
          return (
            <div
              key={row.id}
              className="row"
              style={{
                display: 'flex', alignItems: 'center', padding: '0 24px',
                borderBottom: `1px solid ${BORDER.subtle}`,
                ...(isSelected ? {
                  background: 'rgba(56,189,248,0.07)',
                  boxShadow: `inset 3px 0 0 ${ACCENT.info}`,
                } : {}),
              }}
            >
              <span style={{ width: '24px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggle(row.id)}
                  disabled={selectionFull && !isSelected}
                />
              </span>
              {leads.map(lead => (
                <span key={lead.header} style={{
                  width: `${lead.width}px`, flexShrink: 0, minWidth: 0,
                  display: 'flex', alignItems: 'center', padding: '7px 0',
                }}>{lead.render(row)}</span>
              ))}
              <span style={{ flex: 1, minWidth: '60px' }} />
              {columns.map(col => {
                const sorted = col.sort && sortKey === col.key
                const tint = col.tint?.(row)
                return (
                  <span key={col.key} style={{
                    width: col.flexible ? undefined : `${col.width}px`,
                    // Must match the header exactly — see the note there.
                    flex: col.flexible ? '1 1 0' : undefined,
                    minWidth: col.flexible ? 0 : undefined,
                    flexShrink: 0,
                    textAlign: col.flexible ? 'left' : 'right',
                    paddingLeft: col.flexible ? '16px' : undefined,
                    ...font(sorted ? 700 : 500, 13),
                    color: tint || (sorted ? TEXT.strong : TEXT.secondary),
                    ...TABULAR,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{col.cell(row)}</span>
                )
              })}
            </div>
          )
        })}

        {rows.length === 0 && (
          <div style={{ padding: '46px 24px', textAlign: 'center', ...font(400, 13), color: TEXT.secondary }}>
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  )
}

/** Fourteen rows at the real row height — the layout must not collapse while loading. */
export const TableSkeleton: React.FC = () => (
  <div>
    {Array.from({ length: 14 }, (_, i) => (
      <div key={i} style={{
        height: '31px', borderBottom: `1px solid ${BORDER.subtle}`,
        margin: '0 24px',
        background: i % 2 ? 'transparent' : 'rgba(255,255,255,0.015)',
      }} />
    ))}
  </div>
)
