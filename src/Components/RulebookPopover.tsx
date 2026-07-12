import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useRuleVote, fmtRuleValue } from '@/contexts/RuleVoteContext'
import { CoreIcon, coreColor } from '@/utils/coresVisual'
import { useCoresStatus } from '@/contexts/CoresStatusContext'

// During a Criticality the rulebook is UNREADABLE — every game is on its own secret
// randomized ruleset, so the values here scramble into glitch glyphs (flickering).
const GLITCH_GLYPHS = '█▓▒░╳╱╲▇▆※╬#@&%§¥'
const GLITCH_COLOR = '#c084fc'   // violet — the anomaly/criticality palette
const scramble = (n = 3): string =>
  Array.from({ length: n }, () => GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)]).join('')

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

// ─── Dormant structural rules — mechanics the Cores could switch on, currently off.
// Named (unlike the secret scoring models) so they read as an ominous roadmap of
// what the game could become. Design lives in docs/SIM_EVOLUTION.md.
// Each dormant mechanic + the GameRules enable-flag that switches it on (once its
// engine is built and votable). A row with a live `true` flag renders as Active.
const DORMANT_RULES: { name: string; field?: string }[] = [
  { name: 'Contested Scoring' },
  { name: 'Drive Clock', field: 'driveClockEnabled' },
  { name: 'Conversion Ladder', field: 'conversionLadderEnabled' },
  { name: 'Sideline Goals', field: 'sidelineGoalsEnabled' },
]

// When the Drive Clock is on, summarise its live mode for the active row.
function driveClockDetail(rules: any): string | undefined {
  if (!rules?.driveClockEnabled) return undefined
  const lim = rules.driveClockLimit
  const unit = rules.driveClockUnit === 'plays' ? (lim === 1 ? 'play' : 'plays') : 'sec'
  const reset = rules.driveClockReset === 'series' ? 'resets each 1st down' : 'whole drive'
  return `${lim} ${unit}, ${reset}`
}

const RuleRow: React.FC<{ meta: RuleMeta; value: any; def: any; changed: boolean; glitched?: boolean }> =
  ({ meta, value, def, changed, glitched }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: '8px 10px', borderRadius: '5px', backgroundColor: '#0f172a',
    border: `1px solid ${glitched ? '#4c1d95' : (changed ? '#78350f' : '#1e293b')}`,
  }}>
    <span style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 }}>
      {meta.label}
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
      {glitched ? (
        <span style={{ fontSize: '15px', fontWeight: 700, color: GLITCH_COLOR, letterSpacing: '0.05em' }}>
          {scramble()}
        </span>
      ) : (
        // Just the current value (amber when it's off its default). The old value
        // isn't repeated here — the "what changed" strip above shows the transition.
        <span style={{
          fontSize: '15px', fontWeight: 700,
          color: changed ? CHANGED_COLOR : VALUE_COLOR,
        }}>{meta.fmt(value)}</span>
      )}
    </span>
  </div>
)

const ScoringModelRow: React.FC<{ name: string; glitched?: boolean; changed?: boolean }> = ({ name, glitched, changed }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: '5px',
    backgroundColor: '#0f172a', border: `1px solid ${glitched ? '#4c1d95' : (changed ? '#78350f' : '#1e293b')}`,
  }}>
    <span style={{
      width: 7, height: 7, borderRadius: '50%',
      backgroundColor: glitched ? GLITCH_COLOR : (changed ? CHANGED_COLOR : LABEL_COLOR), flexShrink: 0,
    }} />
    <span style={{ minWidth: 0, flex: 1, fontSize: '15px', fontWeight: 700, color: glitched ? GLITCH_COLOR : (changed ? CHANGED_COLOR : '#cbd5e1'), letterSpacing: glitched ? '0.05em' : undefined }}>
      {glitched ? scramble(6) : name}
    </span>
    <span style={{
      fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0,
      textTransform: 'uppercase', color: LABEL_COLOR,
    }}>
      Live
    </span>
  </div>
)

// A dormant mechanic row. Once a mechanic is switched on (a Cores vote flips its
// enable flag) it reads ACTIVE — an open lock, full opacity, amber label — instead
// of the dimmed "Sealed".
const DormantRuleRow: React.FC<{ name: string; active?: boolean; detail?: string }> = ({ name, active, detail }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: '5px',
    backgroundColor: '#0f172a',
    border: `1px solid ${active ? '#78350f' : '#1e293b'}`, opacity: active ? 1 : 0.62,
  }}>
    {active ? (
      <svg width="12" height="12" viewBox="0 0 20 20" fill={CHANGED_COLOR} style={{ flexShrink: 0 }}>
        <path d="M10 2a4 4 0 00-4 4v2H5a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V9a1 1 0 00-1-1H8V6a2 2 0 114 0 1 1 0 102 0 4 4 0 00-4-4z" />
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 20 20" fill="#94a3b8" style={{ flexShrink: 0 }}>
        <path d="M6 8V6a4 4 0 118 0v2h1a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1h1zm2 0h4V6a2 2 0 10-4 0v2z" />
      </svg>
    )}
    <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '15px', fontWeight: 700, color: active ? CHANGED_COLOR : '#cbd5e1' }}>
        {name}
      </span>
      {active && detail && (
        <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: 1 }}>{detail}</span>
      )}
    </span>
    <span style={{
      fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0,
      textTransform: 'uppercase', color: active ? CHANGED_COLOR : '#94a3b8',
    }}>
      {active ? 'Active' : 'Sealed'}
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
  const { status } = useCoresStatus()
  const glitched = !!status.criticalityActive
    || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('criticality') === '1')
  // Flicker: re-render a few times a second so the scrambled values keep churning.
  const [, setGlitchTick] = useState(0)
  useEffect(() => {
    if (!glitched) return
    const id = setInterval(() => setGlitchTick(t => t + 1), 350)
    return () => clearInterval(id)
  }, [glitched])

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
        {/* ── Order: most significant / structural first, granular values last ── */}

        {/* Game format — the win condition / how the game is played (most significant) */}
        {data && (
          <div style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: LABEL_COLOR, marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85,
            }}>Game Format</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(() => {
                const fmt = String(data.rules?.gameFormat ?? 'standard')
                const ccMin = Math.round(Number(data.rules?.offenseClockBudgetSeconds ?? 1080) / 60)
                const name = fmt === 'target' ? `First to ${data.rules?.targetScore ?? 30}`
                  : fmt === 'play_limit' ? `${data.rules?.playsPerQuarter ?? 30} Plays a Quarter`
                  : fmt === 'chess_clock' ? `Chess Clock (${ccMin}:00 each)`
                  : fmt === 'innings' ? `Innings (${data.rules?.inningsPerGame ?? 3}, try-driven)`
                  : fmt === 'frames' ? `Frames (${data.rules?.framesPerGame ?? 6}, match play)`
                  : 'Standard'
                return <ScoringModelRow name={name} glitched={glitched} changed={fmt !== 'standard'} />
              })()}
            </div>
          </div>
        )}

        {/* Dormant rules — structural mechanics the Cores could switch on */}
        {data && (
          <div style={{ marginBottom: 18, paddingTop: 14, borderTop: '1px dashed #1e293b' }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: LABEL_COLOR, marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85,
            }}>Dormant Rules</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {DORMANT_RULES.map(r => {
                const active = !!(r.field && data.rules?.[r.field])
                const detail = r.name === 'Drive Clock' ? driveClockDetail(data.rules) : undefined
                return <DormantRuleRow key={r.name} name={r.name} active={active} detail={detail} />
              })}
            </div>
          </div>
        )}

        {/* Scoring model — how the running score is shown */}
        {data && (
          <div style={{ marginBottom: 18, paddingTop: 14, borderTop: '1px dashed #1e293b' }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: LABEL_COLOR, marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85,
            }}>Scoring Model</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(() => {
                const model = String(data.rules?.scoringModel ?? 'additive')
                const name = model.charAt(0).toUpperCase() + model.slice(1)
                return <ScoringModelRow name={name} glitched={glitched} changed={model !== 'additive'} />
              })()}
            </div>
          </div>
        )}

        {/* Scalar rule values (downs, scoring values, clock) — the granular tunables */}
        {data && (
          <div style={{ paddingTop: 14, borderTop: '1px dashed #1e293b' }}>
            {groups.map(group => (
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
                      glitched={glitched}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default RulebookPopover
