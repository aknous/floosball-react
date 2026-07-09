import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useRuleVote, fmtRuleValue } from '@/contexts/RuleVoteContext'
import { CoreIcon, coreColor } from '@/utils/coresVisual'

// Anchored popover for the league Rulebook. Mirrors CoresPopover's shell (portal
// panel under a header button, Esc / outside-click dismiss, hover grace on the
// anchor) and its pressStart font. Shows ONLY the rules the Cores can already
// reach — the mutable set — as ominous foreshadowing of the mutation to come.

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const PANEL_WIDTH = 340
// The base ruleset is neutral slate — no accent. Amber is the ONLY color, and it
// appears ONLY on a rule the Cores have altered, so a mutated rule is the one
// thing that pops against an otherwise-quiet panel.
const CHANGED_COLOR = '#f59e0b'   // amber — a rule the Cores have altered
const VALUE_COLOR = '#e2e8f0'     // base rule value (neutral)
const LABEL_COLOR = '#94a3b8'     // section labels, status tags, live/dormant glyphs

interface LastChange {
  field: string
  label: string
  kind: 'change' | 'revert'
  core: string
  from: number | boolean
  to: number | boolean
}

interface RulesPayload {
  rules: Record<string, number | boolean>
  defaults: Record<string, number | boolean>
  mutable: string[]
  changed: string[]
  patchHistory: Array<Record<string, any>>
  lastChange?: LastChange | null
  changeCount?: number
}

// ─── Presentation metadata (frontend-owned; values come from the backend) ────
type Fmt = (v: any) => string
const ydsFmt: Fmt = v => `${v} yd${v === 1 ? '' : 's'}`
const ptsFmt: Fmt = v => `${v} pt${v === 1 ? '' : 's'}`
const boolFmt: Fmt = v => (v ? 'On' : 'Off')
const rawFmt: Fmt = v => `${v}`

interface RuleMeta { key: string; label: string; fmt: Fmt }
interface RuleGroup { title: string; rules: RuleMeta[] }

// Presentation metadata for the rules currently EXPOSED as changeable. The
// backend's `mutable` set (game_rules.RULEBOOK_EXPOSED_FIELDS) is authoritative
// — anything here not in it is filtered out at render.
const GROUPS: RuleGroup[] = [
  { title: 'Downs & Distance', rules: [
    { key: 'downsPerSeries', label: 'Downs per series', fmt: rawFmt },
    { key: 'firstDownDistance', label: 'Yards to gain', fmt: ydsFmt },
  ]},
  { title: 'Scoring', rules: [
    { key: 'touchdownPoints', label: 'Touchdown', fmt: ptsFmt },
    { key: 'fieldGoalPoints', label: 'Field goal', fmt: ptsFmt },
    { key: 'safetyPoints', label: 'Safety', fmt: ptsFmt },
  ]},
  { title: 'Clock Stoppage', rules: [
    { key: 'clockStopsOnIncompletePass', label: 'Incompletion', fmt: boolFmt },
    { key: 'clockStopsOnOutOfBounds', label: 'Out of bounds', fmt: boolFmt },
  ]},
]

// ─── Scoring-model tease (not wired — pure foreshadowing) ─────────────────────
// How score is KEPT is itself a rule. We show only the LIVE model — its presence
// as a listed rule is the tease that it could be something else (the alternatives
// stay unlisted). Design lives in docs/rule_mutation_future_ideas + SIM_EVOLUTION.
const ACTIVE_SCORING_MODEL = 'Additive'

// Dormant structural rules — mechanics the Cores could switch on, currently off.
// Named (unlike the secret scoring models) so they read as an ominous roadmap of
// what the game could become. Design lives in docs/SIM_EVOLUTION.md.
const DORMANT_RULES = ['Contested Scoring', 'Drive Clock', 'Conversion Ladder', 'Sideline Goals']

const RuleRow: React.FC<{ meta: RuleMeta; value: any; def: any; changed: boolean }> =
  ({ meta, value, def, changed }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: '8px 10px', borderRadius: '5px', backgroundColor: '#0f172a',
    border: `1px solid ${changed ? '#78350f' : '#1e293b'}`,
  }}>
    <span style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 }}>
      {meta.label}
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
      {changed && (
        <span style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'line-through' }}>{meta.fmt(def)}</span>
      )}
      <span style={{
        fontSize: '15px', fontWeight: 700,
        color: changed ? CHANGED_COLOR : VALUE_COLOR,
      }}>{meta.fmt(value)}</span>
    </span>
  </div>
)

const ScoringModelRow: React.FC<{ name: string }> = ({ name }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: '5px',
    backgroundColor: '#0f172a', border: '1px solid #1e293b',
  }}>
    <span style={{
      width: 7, height: 7, borderRadius: '50%', backgroundColor: LABEL_COLOR, flexShrink: 0,
    }} />
    <span style={{ minWidth: 0, flex: 1, fontSize: '15px', fontWeight: 700, color: '#cbd5e1' }}>
      {name}
    </span>
    <span style={{
      fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0,
      textTransform: 'uppercase', color: LABEL_COLOR,
    }}>
      Live
    </span>
  </div>
)

const DormantRuleRow: React.FC<{ name: string }> = ({ name }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: '5px',
    backgroundColor: '#0f172a', border: '1px solid #1e293b', opacity: 0.62,
  }}>
    <svg width="12" height="12" viewBox="0 0 20 20" fill="#94a3b8" style={{ flexShrink: 0 }}>
      <path d="M6 8V6a4 4 0 118 0v2h1a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1h1zm2 0h4V6a2 2 0 10-4 0v2z" />
    </svg>
    <span style={{ minWidth: 0, flex: 1, fontSize: '15px', fontWeight: 700, color: '#cbd5e1' }}>
      {name}
    </span>
    <span style={{
      fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0,
      textTransform: 'uppercase', color: '#94a3b8',
    }}>
      Sealed
    </span>
  </div>
)

interface RulebookPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  pinned?: boolean
  onPanelEnter?: () => void
  onPanelLeave?: () => void
}

const RulebookPopover: React.FC<RulebookPopoverProps> = ({
  anchorRef, onClose, pinned = false, onPanelEnter, onPanelLeave,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [data, setData] = useState<RulesPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rv = useRuleVote()

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/rules`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setData(j?.data ?? null) })
      .catch(() => { if (!cancelled) setError('Could not load the rulebook.') })
    return () => { cancelled = true }
  }, [])

  // Position under the anchor, right-aligned, clamped to the viewport.
  useEffect(() => {
    const place = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const left = Math.max(8, Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8))
      setPos({ top: r.bottom + 8, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchorRef])

  // Dismiss on Esc / click outside (the anchor toggles itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [anchorRef, onClose])

  const mutable = new Set(data?.mutable ?? [])
  const changed = new Set(data?.changed ?? [])
  // Only the rules the backend still counts as mutable, grouped; empty groups drop.
  const groups = GROUPS
    .map(g => ({ title: g.title, rules: g.rules.filter(m => mutable.has(m.key) && data?.rules[m.key] !== undefined) }))
    .filter(g => g.rules.length > 0)

  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Current Ruleset"
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, width: PANEL_WIDTH,
        maxWidth: 'calc(100vw - 16px)', maxHeight: 'min(72vh, 580px)',
        backgroundColor: '#0b1220', border: '1px solid #334155',
        borderRadius: '10px', boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
        zIndex: 10010, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: 'pressStart, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px', backgroundColor: 'rgba(148,163,184,0.04)', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.04em', flex: 1 }}>
            Current Ruleset
          </span>
          {pinned && (
            <button onClick={onClose} aria-label="Close" style={{
              width: '22px', height: '22px', borderRadius: '5px', flexShrink: 0,
              background: 'transparent', border: '1px solid #334155', color: '#cbd5e1',
              cursor: 'pointer', fontSize: '13px', lineHeight: 1,
            }}>×</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px' }}>
        {error && <div style={{ fontSize: 14, color: '#f87171', lineHeight: 1.6 }}>{error}</div>}
        {!data && !error && (
          <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>Reading the rulebook...</div>
        )}

        {/* A live rule vote — call to action, colored by the Core running it */}
        {rv.open && (
          <button
            onClick={() => { rv.openModal(); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '10px 12px', marginBottom: 14, borderRadius: 7, cursor: 'pointer',
              background: `${coreColor(rv.core || undefined)}1c`,
              border: `1px solid ${coreColor(rv.core || undefined)}`,
              textAlign: 'left',
            }}
          >
            <CoreIcon core={rv.core || undefined} color={coreColor(rv.core || undefined)} size={15} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: coreColor(rv.core || undefined) }}>
              {rv.coreDisplayName || 'The Cores'} {rv.kind === 'revert' ? 'wants to restore a rule' : 'wants to change a rule'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Vote</span>
          </button>
        )}

        {/* Most recent Cores-vote change */}
        {data?.lastChange && (
          <div style={{
            padding: '9px 11px', marginBottom: 14, borderRadius: 7,
            background: 'rgba(245,158,11,0.08)', borderLeft: `3px solid ${coreColor(data.lastChange.core)}`,
          }}>
            <span style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
              <span style={{ color: coreColor(data.lastChange.core), fontWeight: 700 }}>
                {data.lastChange.core.charAt(0).toUpperCase() + data.lastChange.core.slice(1)}
              </span>{' '}
              {data.lastChange.kind === 'revert' ? 'restored' : 'changed'} {data.lastChange.label}:{' '}
              <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>{fmtRuleValue(data.lastChange.from)}</span>{' → '}
              <span style={{ color: CHANGED_COLOR, fontWeight: 700 }}>{fmtRuleValue(data.lastChange.to)}</span>
            </span>
          </div>
        )}
        {data && groups.map(group => (
          <div key={group.title} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: LABEL_COLOR, marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85,
            }}>{group.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {group.rules.map(meta => (
                <RuleRow
                  key={meta.key}
                  meta={meta}
                  value={data.rules[meta.key]}
                  def={data.defaults[meta.key]}
                  changed={changed.has(meta.key)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Scoring-model tease — the bigger lever: how score is KEPT is a rule too */}
        {data && (
          <div style={{ marginTop: 4, marginBottom: 18, paddingTop: 14, borderTop: '1px dashed #1e293b' }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: LABEL_COLOR, marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85,
            }}>Scoring Model</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <ScoringModelRow name={ACTIVE_SCORING_MODEL} />
            </div>
          </div>
        )}

        {/* Dormant rules — structural mechanics the Cores could switch on */}
        {data && (
          <div style={{ marginBottom: 4, paddingTop: 14, borderTop: '1px dashed #1e293b' }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: LABEL_COLOR, marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85,
            }}>Dormant Rules</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {DORMANT_RULES.map(name => <DormantRuleRow key={name} name={name} />)}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default RulebookPopover
