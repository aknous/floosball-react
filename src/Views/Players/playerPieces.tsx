import React from 'react'
import { Link } from 'react-router-dom'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { attrBarColor, statRampColor } from '@/utils/ratingColors'

/** Every panel on the profile is the same flat plate. Radius 0, no shadow. */
export const PANEL: React.CSSProperties = {
  background: BG.card,
  border: `1px solid ${BORDER.hairline}`,
}

export const PanelHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => (
  <div style={{
    padding: '11px 14px', background: BG.panel,
    borderBottom: `1px solid ${BORDER.raised}`,
    display: 'flex', alignItems: 'center', gap: '10px',
  }}>
    <span style={{ ...font(800, 11, 1, '0.12em'), color: TEXT.strong }}>{title}</span>
    {right != null && <><span style={{ flex: 1 }} />{right}</>}
  </div>
)

// ── Icons ────────────────────────────────────────────────────────────────────
// Inline SVG throughout; the house rule is no emoji anywhere in UI strings.

export const BackArrow: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M12 4l-6 6 6 6" stroke={TEXT.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const BoltIcon: React.FC<{ size?: number; color?: string }> = ({ size = 13, color = '#fbbf24' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={color} style={{ display: 'block', flexShrink: 0 }}>
    <path d="M11 1L3 11h5l-1 8 8-10h-5l1-8z" />
  </svg>
)

export const SwordGlyph: React.FC<{ size?: number; color?: string }> = ({ size = 11, color = TEXT.muted }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={color} style={{ display: 'block', flexShrink: 0 }}>
    <path d="M17 2l1 1-9 9-1-1 9-9zM3 15l3 3-3 1v-4z" />
  </svg>
)

export const ShieldGlyph: React.FC<{ size?: number; color?: string }> = ({ size = 11, color = TEXT.muted }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={color} style={{ display: 'block', flexShrink: 0 }}>
    <path d="M10 2l7 3v6c0 4-3 6.5-7 7-4-.5-7-3-7-7V5l7-3z" />
  </svg>
)

const TrophyGlyph: React.FC<{ color: string }> = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill={color} style={{ display: 'block' }}>
    <path d="M5 2h10v3h3v3a4 4 0 01-3.2 3.9A5 5 0 0111 14.9V16h3v2H6v-2h3v-1.1a5 5 0 01-3.8-3A4 4 0 012 8V5h3V2zm0 5H4v1a2 2 0 001 1.7V7zm10 0v2.7A2 2 0 0016 8V7h-1z" />
  </svg>
)

const StarGlyph: React.FC<{ color: string }> = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill={color} style={{ display: 'block' }}>
    <path d="M10 1l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9L7.6 6 10 1z" />
  </svg>
)

const MedalGlyph: React.FC<{ color: string }> = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill={color} style={{ display: 'block' }}>
    <path d="M6 1h8l-2.2 5.4a5 5 0 11-3.6 0L6 1zm4 7a3 3 0 100 6 3 3 0 000-6z" />
  </svg>
)

const BookGlyph: React.FC<{ color: string }> = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 20 20" fill={color} style={{ display: 'block' }}>
    <path d="M3 3h14v9a5 5 0 01-5 5H8a5 5 0 01-5-5V3zm2 2v7a3 3 0 003 3h4a3 3 0 003-3V5H5z" />
  </svg>
)

// ── Trophy case ──────────────────────────────────────────────────────────────

export interface TrophyEntry {
  kind: 'mvp' | 'champion' | 'allpro' | 'record'
  caption: string
  seasons: string
}

const TROPHY_ART: Record<TrophyEntry['kind'], { glyph: React.FC<{ color: string }>; icon: string; caption: string; seasons: string }> = {
  mvp:       { glyph: MedalGlyph,  icon: '#fbbf24', caption: '#fbbf24', seasons: ACCENT.warning },
  champion:  { glyph: TrophyGlyph, icon: ACCENT.warning, caption: '#fbbf24', seasons: ACCENT.warning },
  allpro:    { glyph: StarGlyph,   icon: TEXT.secondary, caption: TEXT.secondary, seasons: TEXT.muted },
  record:    { glyph: BookGlyph,   icon: ACCENT.featured, caption: '#c4b5fd', seasons: ACCENT.featured },
}

/**
 * Columns across the rail, one per accolade the player actually has.
 *
 * Only the kinds present are rendered — an empty CHAMPION column reading "—" is
 * a trophy case advertising what someone never won.
 */
export const TrophyCase: React.FC<{ entries: TrophyEntry[]; seasonsLabel: string; note?: string | null }> = ({
  entries, seasonsLabel, note,
}) => (
  <div style={PANEL}>
    <PanelHeader
      title="TROPHY CASE"
      right={<span style={{ ...font(500, 11), color: TEXT.muted }}>{seasonsLabel}</span>}
    />
    <div style={{ padding: '14px', display: 'flex', gap: '14px' }}>
      {entries.map(entry => {
        const art = TROPHY_ART[entry.kind]
        const Glyph = art.glyph
        return (
          <div key={entry.kind} style={{
            flex: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
          }}>
            <Glyph color={art.icon} />
            <span style={{ ...font(700, 9, 1, '0.06em'), color: art.caption }}>{entry.caption}</span>
            <span style={{
              ...font(700, 10, 1.4), color: art.seasons, textAlign: 'center',
              overflowWrap: 'anywhere',
            }}>{entry.seasons}</span>
          </div>
        )
      })}
    </div>
    {note && (
      <div style={{ padding: '0 14px 13px' }}>
        <span style={{ ...font(400, 11, 1.5), color: TEXT.muted }}>{note}</span>
      </div>
    )}
  </div>
)

// ── Attribute bar ────────────────────────────────────────────────────────────

export const AttrBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
      <span style={{ flex: 1, minWidth: 0, ...font(400, 12), color: TEXT.muted }}>{label}</span>
      <span style={{ ...font(700, 15), color: TEXT.body, ...TABULAR }}>{value}</span>
    </div>
    <span style={{ height: '7px', background: BG.shell, display: 'flex' }}>
      <span style={{
        width: `${Math.max(0, Math.min(100, value))}%`,
        background: attrBarColor(value),
      }} />
    </span>
  </div>
)

// ── Career table ─────────────────────────────────────────────────────────────

export interface StatColumn {
  key: string
  label: string
  width: number
  /** The cell for one season. */
  cell: (row: any) => React.ReactNode
  /** The cell on the career row. Omit for a column that cannot be totalled. */
  total?: (career: any, rows: any[]) => React.ReactNode
  /** The headline number of the table — rendered brighter and bolder. */
  strong?: boolean
  /** Tints the value through the performance ramp. */
  ramp?: boolean
}

/** `—` for anything absent, so an empty cell never reads as a zero. */
export const num = (v: any, digits = 0): string => {
  if (v == null || v === '') return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return String(v)
  return digits > 0 ? n.toFixed(digits) : Math.round(n).toLocaleString()
}

export const pct = (v: any): string => (v == null || v === '' ? '—' : `${Number(v).toFixed(1)}`)

/** Sum one path across every season, for the columns the career blob does not carry. */
export const sumOver = (rows: any[], pick: (row: any) => number | undefined | null): number =>
  rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0)

const CELL_BASE: React.CSSProperties = {
  flexShrink: 0, textAlign: 'right', ...TABULAR,
}

/**
 * Seasons under one header, career totals ABOVE them.
 *
 * Totals on top rather than the conventional bottom: the career line is the
 * summary a reader wants first, and a table that grows a row a season would
 * otherwise push it further away every year.
 */
export const CareerTable: React.FC<{
  title: string
  columns: StatColumn[]
  rows: any[]
  career: any
  right?: React.ReactNode
}> = ({ title, columns, rows, career, right }) => (
  <div style={PANEL}>
    <div style={{
      padding: '12px 16px', background: BG.panel,
      borderBottom: `1px solid ${BORDER.raised}`,
      display: 'flex', alignItems: 'center', gap: '11px',
    }}>
      <span style={{ ...font(800, 12, 1, '0.1em'), color: TEXT.strong }}>{title}</span>
      <span style={{ flex: 1 }} />
      {right}
    </div>

    <div style={{ overflowX: 'auto' }}>
      {/* 174 = the season and team columns (56 + 86) plus the row's own 32px of
          padding. Reserving more than that pushed the last column off the right
          edge at 1400px instead of letting the row breathe. */}
      <div style={{ minWidth: `${174 + columns.reduce((w, c) => w + c.width, 0)}px` }}>
        {/* Column header */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 16px',
          background: BG.panel, borderBottom: `1px solid ${BORDER.raised}`,
        }}>
          <span style={{ width: '56px', flexShrink: 0, ...font(700, 10, 1, '0.1em'), color: TEXT.muted, padding: '10px 0' }}>SEASON</span>
          <span style={{ width: '86px', flexShrink: 0, ...font(700, 10, 1, '0.1em'), color: TEXT.muted, padding: '10px 0' }}>TEAM</span>
          <span style={{ flex: 1, minWidth: 0 }} />
          {columns.map(col => (
            <span key={col.key} style={{
              width: `${col.width}px`, ...CELL_BASE,
              ...font(700, 10, 1, '0.1em'), color: TEXT.muted, padding: '10px 0',
            }}>{col.label}</span>
          ))}
        </div>

        {/* Career totals */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 16px',
          background: BG.panel, borderBottom: `1px solid ${BORDER.raised}`,
        }}>
          <span style={{ width: '56px', flexShrink: 0, ...font(800, 12, 1, '0.06em'), color: TEXT.strong, padding: '10px 0' }}>CAREER</span>
          {/* Counts the ROWS, not the player's completed seasons — the two differ
              mid-season and the label sits directly above the rows it describes. */}
          <span style={{ width: '86px', flexShrink: 0, ...font(500, 10), color: TEXT.muted }}>
            {rows.length} season{rows.length === 1 ? '' : 's'}
          </span>
          <span style={{ flex: 1, minWidth: 0 }} />
          {columns.map(col => (
            <span key={col.key} style={{
              width: `${col.width}px`, ...CELL_BASE,
              ...font(col.strong ? 800 : 700, 12),
              color: col.strong ? TEXT.primary : TEXT.body,
            }}>{col.total ? col.total(career, rows) : '—'}</span>
          ))}
        </div>

        {/* Seasons, newest first */}
        {rows.map((row, i) => (
          <div
            key={`${row.season}-${i}`}
            className="row"
            style={{
              display: 'flex', alignItems: 'center', padding: '0 16px',
              borderBottom: `1px solid ${BORDER.subtle}`,
            }}
          >
            <span style={{ width: '56px', flexShrink: 0, ...font(700, 12), color: TEXT.body, padding: '8px 0', ...TABULAR }}>
              S{row.season}
            </span>
            <span style={{ width: '86px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
              {row.teamId ? <Crest teamId={row.teamId} size={16} /> : null}
              <span style={{
                ...font(600, 10, 1, '0.04em'), color: TEXT.muted,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{row.teamAbbr || row.team || 'FA'}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }} />
            {columns.map(col => {
              const value = col.cell(row)
              const rampValue = col.ramp && typeof value === 'string' ? Number(value) : NaN
              return (
                <span key={col.key} style={{
                  width: `${col.width}px`, ...CELL_BASE,
                  ...font(col.strong ? 700 : col.ramp ? 600 : 500, 12),
                  color: col.strong
                    ? TEXT.strong
                    : Number.isFinite(rampValue) ? statRampColor(rampValue) : TEXT.secondary,
                }}>{value}</span>
              )
            })}
          </div>
        ))}

        {rows.length === 0 && (
          <div style={{ padding: '26px 16px', textAlign: 'center', ...font(400, 12), color: TEXT.muted }}>
            No seasons played yet.
          </div>
        )}
      </div>
    </div>
  </div>
)

/** The `RECEIVING / DEFENSE` switch in a table header. */
export const SegmentedControl: React.FC<{
  options: { key: string; label: string }[]
  value: string
  onChange: (key: string) => void
}> = ({ options, value, onChange }) => (
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
            padding: '7px 13px', cursor: 'pointer', fontFamily: FONT,
          }}
        >{option.label}</button>
      )
    })}
  </div>
)

/** A tab in a panel header: active carries the green underline. */
export const PanelTab: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      ...font(active ? 800 : 600, 12, 1, '0.1em'),
      color: active ? TEXT.strong : TEXT.muted,
      background: 'transparent', border: 'none', cursor: 'pointer',
      fontFamily: FONT, padding: '0 0 3px',
      borderBottom: `2px solid ${active ? ACCENT.live : 'transparent'}`,
    }}
  >{label}</button>
)

/** A plate that navigates — the back link and the follow control. */
export const Plate: React.FC<{
  to?: string
  onClick?: () => void
  children: React.ReactNode
  active?: boolean
}> = ({ to, onClick, children, active = false }) => {
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: active ? 'rgba(56,189,248,0.10)' : BG.card,
    border: `1px solid ${active ? 'rgba(56,189,248,0.45)' : BORDER.raised}`,
    padding: '8px 12px', cursor: 'pointer', textDecoration: 'none',
    fontFamily: FONT,
  }
  if (to) return <Link className="plate" to={to} style={style}>{children}</Link>
  return <button className="plate" onClick={onClick} style={style}>{children}</button>
}
