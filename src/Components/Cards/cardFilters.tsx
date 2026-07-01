import React from 'react'
import { CardData, getBehaviorTag } from './TradingCard'

/**
 * Shared card-filtering primitives for the equip-side surfaces (the slot
 * picker modal and the on-page Eligible Cards grid). One source of truth for
 * the filter constants, the client-side filter/sort math, and the control bar,
 * so the two surfaces stay in lockstep instead of each hand-rolling their own.
 *
 * The Cards-page collection (CardCollection) filters server-side and keeps its
 * own richer sort set, so it isn't driven by this module — but it shares the
 * same constant vocabulary via the *_OPTIONS exports.
 */

export type PositionFilter = 'all' | 1 | 2 | 3 | 4 | 5
export type EditionFilter = 'all' | 'base' | 'holographic' | 'prismatic' | 'diamond'
export type OutputFilter = 'all' | 'fp' | 'mult' | 'floobits'
export type ClassificationFilter = 'all' | 'mvp' | 'champion' | 'all_pro' | 'rookie'
// Effect behavior — mirrors the on-card badge from TradingCard's getBehaviorTag.
export type BehaviorFilter = 'all' | 'chance' | 'conditional' | 'streak'
export type CardSortMode = 'match' | 'rating' | 'edition'

export const POSITION_LABELS: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K' }
// Rarest → most common. Used for both sorting and the edition tiebreak.
export const EDITION_ORDER: Record<string, number> = { diamond: 0, prismatic: 1, holographic: 2, base: 3 }

export const POSITION_OPTIONS: { value: PositionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 1, label: 'QB' },
  { value: 2, label: 'RB' },
  { value: 3, label: 'WR' },
  { value: 4, label: 'TE' },
  { value: 5, label: 'K' },
]
export const EDITION_OPTIONS: { value: EditionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'base', label: 'Base' },
  { value: 'holographic', label: 'Holo' },
  { value: 'prismatic', label: 'Prism' },
  { value: 'diamond', label: 'Diamond' },
]
export const OUTPUT_OPTIONS: { value: OutputFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fp', label: 'FP' },
  { value: 'mult', label: 'FPx' },
  { value: 'floobits', label: 'Floobits' },
]
export const CLASSIFICATION_OPTIONS: { value: ClassificationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mvp', label: 'MVP' },
  { value: 'champion', label: 'Champion' },
  { value: 'all_pro', label: 'All-Pro' },
  { value: 'rookie', label: 'Rookie' },
]
export const BEHAVIOR_OPTIONS: { value: BehaviorFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'chance', label: 'Chance' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'streak', label: 'Streak' },
]

export interface CardFilterState {
  search: string
  position: PositionFilter
  edition: EditionFilter
  output: OutputFilter
  classification: ClassificationFilter
  behavior: BehaviorFilter
  matchOnly: boolean
  sort: CardSortMode
}

export const defaultCardFilterState: CardFilterState = {
  search: '', position: 'all', edition: 'all', output: 'all',
  classification: 'all', behavior: 'all', matchOnly: false, sort: 'match',
}

/** Does a card pass the current filter state? (Sort is applied separately.) */
export function cardMatchesFilters(card: CardData, f: CardFilterState, rosterIds: Set<number>): boolean {
  const q = f.search.trim().toLowerCase()
  if (q) {
    const hit = card.playerName.toLowerCase().includes(q)
      || (card.displayName || '').toLowerCase().includes(q)
      || (card.effectName || '').toLowerCase().includes(q)
    if (!hit) return false
  }
  if (f.position !== 'all' && card.position !== f.position) return false
  if (f.edition !== 'all' && card.edition !== f.edition) return false
  if (f.output !== 'all' && card.outputType !== f.output) return false
  if (f.classification !== 'all') {
    const cls = (card.classification || '').toLowerCase()
    if (f.classification === 'rookie') {
      if (!(cls.includes('rookie') || card.isRookie)) return false
    } else if (!cls.includes(f.classification)) return false
  }
  if (f.behavior !== 'all' && getBehaviorTag(card) !== f.behavior) return false
  if (f.matchOnly && !rosterIds.has(card.playerId)) return false
  return true
}

/** Filter + sort a card list against the filter state. */
export function applyCardFilters(cards: CardData[], f: CardFilterState, rosterIds: Set<number>): CardData[] {
  const filtered = cards.filter(c => cardMatchesFilters(c, f, rosterIds))
  const byEdition = (a: CardData, b: CardData) => {
    const ea = EDITION_ORDER[a.edition] ?? 99
    const eb = EDITION_ORDER[b.edition] ?? 99
    if (ea !== eb) return ea - eb
    return b.playerRating - a.playerRating
  }
  const sorted = [...filtered]
  switch (f.sort) {
    case 'rating':
      sorted.sort((a, b) => b.playerRating - a.playerRating)
      break
    case 'edition':
      sorted.sort(byEdition)
      break
    case 'match':
    default:
      sorted.sort((a, b) => {
        const am = rosterIds.has(a.playerId) ? 0 : 1
        const bm = rosterIds.has(b.playerId) ? 0 : 1
        if (am !== bm) return am - bm
        return byEdition(a, b)
      })
  }
  return sorted
}

// ---- Presentational controls ----

export const filterPillStyle = (active: boolean): React.CSSProperties => ({
  padding: '3px 10px',
  fontSize: '10px',
  fontWeight: 700,
  fontFamily: 'inherit',
  border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
  backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
  color: active ? '#60a5fa' : '#94a3b8',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.1s',
})

/** A group of mutually-exclusive filter pills (unlabeled; delimit groups with
 * FilterDivider so several fit on one line, like the Cards-page filters). */
export function PillGroup<T extends string | number>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <>
      {options.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          style={filterPillStyle(opt.value === value)}
        >
          {opt.label}
        </button>
      ))}
    </>
  )
}

/** Thin vertical separator between inline filter groups. */
export const FilterDivider: React.FC = () => (
  <span style={{ width: '1px', height: '20px', backgroundColor: '#334155', margin: '0 4px' }} />
)

/** Search input with a clear button, styled for the dark card surfaces. */
export const CardSearchInput: React.FC<{
  value: string
  onChange: (v: string) => void
  placeholder?: string
  style?: React.CSSProperties
}> = ({ value, onChange, placeholder = 'Search player or effect...', style }) => (
  <div style={{ position: 'relative', ...style }}>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 28px 8px 10px', fontSize: '12px',
        fontFamily: 'inherit', backgroundColor: '#0f172a', color: '#e2e8f0',
        border: '1px solid #334155', borderRadius: '6px', outline: 'none',
        boxSizing: 'border-box',
      }}
    />
    {value && (
      <button
        onClick={() => onChange('')}
        aria-label="Clear search"
        style={{
          position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
          fontSize: '14px', padding: '2px 6px', lineHeight: 1,
        }}
      >x</button>
    )}
  </div>
)

/**
 * The full equip-side filter bar, laid out compactly to mirror the Cards-page
 * filters: several pill groups share a line, delimited by separators, so the
 * bar takes 3 lines instead of one labeled row per group. Driven by a single
 * CardFilterState; the parent owns the state and calls applyCardFilters().
 */
export const CardFilterControls: React.FC<{
  state: CardFilterState
  onPatch: (patch: Partial<CardFilterState>) => void
  showSearch?: boolean
  showMatchToggle?: boolean
}> = ({ state, onPatch, showSearch = true, showMatchToggle = true }) => {
  const rowStyle: React.CSSProperties = {
    display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Line 1: edition pills + inline search (right) */}
      <div style={rowStyle}>
        <PillGroup options={EDITION_OPTIONS} value={state.edition} onChange={v => onPatch({ edition: v })} />
        {showSearch && (
          <>
            <span style={{ flex: 1, minWidth: '12px' }} />
            <CardSearchInput
              value={state.search}
              onChange={v => onPatch({ search: v })}
              style={{ flex: '0 1 240px', minWidth: '160px' }}
            />
          </>
        )}
      </div>
      {/* Line 2: output | behavior */}
      <div style={rowStyle}>
        <PillGroup options={OUTPUT_OPTIONS} value={state.output} onChange={v => onPatch({ output: v })} />
        <FilterDivider />
        <PillGroup options={BEHAVIOR_OPTIONS} value={state.behavior} onChange={v => onPatch({ behavior: v })} />
      </div>
      {/* Line 3: class | position */}
      <div style={rowStyle}>
        <PillGroup options={CLASSIFICATION_OPTIONS} value={state.classification} onChange={v => onPatch({ classification: v })} />
        <FilterDivider />
        <PillGroup options={POSITION_OPTIONS} value={state.position} onChange={v => onPatch({ position: v })} />
      </div>
      {/* Line 4: match toggle + sort (right) */}
      <div style={rowStyle}>
        {showMatchToggle && (
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', color: state.matchOnly ? '#60a5fa' : '#94a3b8', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={state.matchOnly}
              onChange={e => onPatch({ matchOnly: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            Match roster only
          </label>
        )}
        <span style={{ flex: 1, minWidth: '12px' }} />
        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Sort
        </span>
        <select
          value={state.sort}
          onChange={e => onPatch({ sort: e.target.value as CardSortMode })}
          style={{
            padding: '4px 8px', fontSize: '11px', fontFamily: 'inherit',
            backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid #334155',
            borderRadius: '4px', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="match">Match first</option>
          <option value="rating">Highest rated</option>
          <option value="edition">Rarest first</option>
        </select>
      </div>
    </div>
  )
}
