import React, { useEffect, useState } from 'react'
import { useRuleVote } from '@/contexts/RuleVoteContext'
import { coreColor } from '@/utils/coresVisual'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * What the games on this board are actually being played under — a pill in the
 * header that opens the whole rulebook.
 *
 * The rules are MUTABLE (the Cores can change them), so a board showing sixteen
 * games without saying which ruleset they run on is hiding the most consequential
 * thing about them. But the previous inline strip spent a whole header row on it,
 * and on a standard rulebook that row said "nothing has changed" — a sentence
 * about an absence.
 *
 * The pill states the one thing worth knowing at a glance (standard, or how many
 * rules are off default) and the popover lists the rules that are actually IN
 * PLAY as things that could change — the ones the Cores can put to a vote.
 *
 * ⚠️ Scoped to `mutable` (owner). The full ruleset includes a dozen fields no
 * ballot can ever touch — extra-point value, kickoff spot, overtime length — and
 * listing them makes the popover a specification rather than a thing to watch.
 * The interesting question is "what could change under these games", so a rule
 * nobody can vote on is noise here.
 */

/** Ordered groups. Rules with no group fall into a final catch-all, so a new one
 *  added server-side still appears rather than silently vanishing from the list. */
const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Game', keys: ['gameFormat', 'scoringModel'] },
  { title: 'Downs', keys: ['downsPerSeries', 'firstDownDistance'] },
  { title: 'Scoring', keys: ['touchdownPoints', 'fieldGoalPoints', 'extraPointPoints', 'twoPointConversionPoints', 'safetyPoints'] },
  { title: 'Clock', keys: ['quarterLengthSeconds', 'overtimeLengthSeconds', 'clockStopsOnDeadBall'] },
  { title: 'Field', keys: ['kickoffPosition', 'twoPointConversionDistance', 'patSnapDistance'] },
  { title: 'Dormant mechanics', keys: ['conversionLadderEnabled', 'driveClockEnabled', 'sidelineGoalsEnabled', 'contestedScoringEnabled'] },
]

const LABELS: Record<string, string> = {
  gameFormat: 'Format',
  scoringModel: 'Scoring',
  downsPerSeries: 'Downs per series',
  firstDownDistance: 'Yards to gain',
  touchdownPoints: 'Touchdown',
  fieldGoalPoints: 'Field goal',
  extraPointPoints: 'Extra point',
  twoPointConversionPoints: 'Two-point conversion',
  safetyPoints: 'Safety',
  clockStopsOnDeadBall: 'Clock stops on dead balls',
  quarterLengthSeconds: 'Quarter length',
  overtimeLengthSeconds: 'Overtime length',
  kickoffPosition: 'Kickoff from',
  twoPointConversionDistance: 'Two-point distance',
  patSnapDistance: 'Extra-point snap',
  // Dormant mechanics — votable ON, so they belong in a list of what can change.
  conversionLadderEnabled: 'Conversion Ladder',
  driveClockEnabled: 'Drive Clock',
  sidelineGoalsEnabled: 'Sideline Goals',
  contestedScoringEnabled: 'Contested Scoring',
}

const formatValue = (key: string, value: any): string => {
  // The format and scoring model arrive as snake_case keys ('play_limit'); nobody wants
  // to read that on a board.
  if (key === 'gameFormat' || key === 'scoringModel') {
    return String(value).replace(/_/g, ' ').toUpperCase()
  }
  // A dormant MECHANIC is on or off, not yes or no — matching the valueLabels the
  // ballot itself uses for these fields.
  if (key.endsWith('Enabled')) return value ? 'On' : 'Off'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (key.endsWith('Seconds')) {
    const minutes = Math.floor(Number(value) / 60)
    const seconds = Number(value) % 60
    return seconds ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes} min`
  }
  if (key.endsWith('Points')) return `${value} pt${Number(value) === 1 ? '' : 's'}`
  if (key.endsWith('Distance') || key === 'kickoffPosition') return `${value} yd`
  return String(value)
}

interface RulesPayload {
  rules: Record<string, any>
  defaults: Record<string, any>
  /** Fields the Rulebook exposes as changeable — i.e. what a ballot can reach. */
  mutable: string[]
  changed: string[]
  lastChange?: { core: string; label: string; from?: any; to?: any; kind?: string } | null
  changeCount: number
}

const ActiveRulesStrip: React.FC = () => {
  const [data, setData] = useState<RulesPayload | null>(null)
  const [open, setOpen] = useState(false)
  // Hover opens it; a click PINS it so the list can be read without holding the
  // cursor still, and so it is reachable without a pointer at all.
  const [pinned, setPinned] = useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const ruleVote = useRuleVote()

  useEffect(() => {
    let cancelled = false
    const load = () => fetch(`${API_BASE}/rules`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setData(j?.data ?? null) })
      .catch(() => { /* the pill hides itself */ })
    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // A pinned popover closes on an outside click or Escape — without this it is a
  // panel you cannot dismiss, since leaving with the pointer no longer closes it.
  useEffect(() => {
    if (!pinned) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) { setPinned(false); setOpen(false) }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPinned(false); setOpen(false) }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  if (!data) return null

  // gameFormat and scoringModel are themselves mutable rules, so a non-standard one
  // already arrives in `changed` and renders like any other.
  const changed = (data.changed || []).filter(key => data.rules?.[key] !== undefined)
  const changedSet = new Set(changed)
  const rules = data.rules || {}

  // `mutable` is the server's own list of what the Rulebook exposes as changeable.
  // ⚠️ Not hardcoded here on purpose: the votable set is defined once server-side
  // (RULEBOOK_EXPOSED_FIELDS, intersected with the engine's mutable fields), and a
  // copy in this file would drift the first time a rule is added or withdrawn.
  const votable = new Set(data.mutable || [])
  // ⚠️ `mutable` is what the RULEBOOK exposes, which is one field wider than what a
  // BALLOT can reach: safetyPoints is deliberately excluded from RULE_VOTE_CANDIDATES
  // ("safeties are too infrequent for the option to feel worth it", owner 2026-07-12)
  // while still being a mutable field. It is the only place the two sets disagree.
  votable.delete('safetyPoints')

  // Grouped, with anything the server added but this file does not know about
  // collected at the end rather than dropped.
  const inPlay = (k: string) => votable.has(k) && rules[k] !== undefined
  const grouped = GROUPS
    .map(g => ({ title: g.title, keys: g.keys.filter(inPlay) }))
    .filter(g => g.keys.length > 0)
  // A newly-votable rule this file has no group for still shows up, rather than
  // being silently dropped from a list that claims to be what can change.
  const known = new Set(GROUPS.flatMap(g => g.keys))
  const extras = Object.keys(rules).filter(k => !known.has(k) && inPlay(k))
  if (extras.length) grouped.push({ title: 'Other', keys: extras })

  const accent = changed.length > 0 ? ACCENT.rules : TEXT.muted
  const show = open || pinned

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', flexShrink: 0, fontFamily: FONT }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!pinned) setOpen(false) }}
    >
      <button
        onClick={() => { setPinned(v => !v); setOpen(true) }}
        aria-expanded={show}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          background: show ? BG.panel : 'transparent',
          border: `1px solid ${show ? BORDER.raised : `${accent}40`}`,
          padding: '5px 9px', cursor: 'pointer', fontFamily: FONT,
          ...font(700, 10, 1, '0.1em'), color: accent, whiteSpace: 'nowrap',
        }}
      >
        RULES
        <span style={{ ...font(700, 10, 1, '0.06em'), color: accent, ...TABULAR }}>
          {changed.length === 0 ? 'STANDARD' : `${changed.length} CHANGED`}
        </span>
        {/* An open ballot is the one thing urgent enough to show without opening
            the popover — a rule is about to change under these games. */}
        {ruleVote.open && (
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: coreColor(ruleVote.core || undefined), flexShrink: 0,
          }} />
        )}
      </button>

      {show && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60,
          minWidth: '300px', maxHeight: '420px', overflowY: 'auto',
          background: BG.panel, border: `1px solid ${BORDER.raised}`,
          boxShadow: '0 12px 32px rgba(0,0,0,0.55)', padding: '4px 0',
        }}>
          {ruleVote.open && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 14px', borderBottom: `1px solid ${BORDER.hairline}`,
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: coreColor(ruleVote.core || undefined),
              }} />
              <span style={{ ...font(700, 10, 1, '0.08em'), color: coreColor(ruleVote.core || undefined) }}>
                A BALLOT IS OPEN
              </span>
            </div>
          )}

          {grouped.map(group => (
            <div key={group.title}>
              <div style={{
                ...font(700, 10, 1, '0.1em'), color: TEXT.muted,
                padding: '10px 14px 5px',
              }}>{group.title}</div>
              {group.keys.map(key => {
                const isChanged = changedSet.has(key)
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'baseline', gap: '12px',
                    padding: '5px 14px',
                    ...(isChanged ? { background: `${ACCENT.rules}12` } : {}),
                  }}>
                    <span style={{ ...font(500, 12), color: TEXT.secondary, flex: 1, minWidth: 0 }}>
                      {LABELS[key] || key}
                    </span>
                    {/* What it WAS, for anything off default — a changed rule is
                        only meaningful against the number it replaced. */}
                    {isChanged && data.defaults?.[key] !== undefined && (
                      <span style={{
                        ...font(400, 11), color: TEXT.muted, ...TABULAR,
                        textDecoration: 'line-through', whiteSpace: 'nowrap',
                      }}>{formatValue(key, data.defaults[key])}</span>
                    )}
                    <span style={{
                      ...font(700, 12), ...TABULAR, whiteSpace: 'nowrap',
                      color: isChanged ? ACCENT.rules : TEXT.primary,
                    }}>{formatValue(key, rules[key])}</span>
                  </div>
                )
              })}
            </div>
          ))}

          {data.lastChange && (
            <div style={{
              ...font(400, 11), color: TEXT.muted,
              padding: '10px 14px', borderTop: `1px solid ${BORDER.hairline}`, marginTop: '4px',
            }}>
              Last changed by{' '}
              <span style={{ color: coreColor(data.lastChange.core), fontWeight: 700 }}>
                {data.lastChange.core.charAt(0).toUpperCase() + data.lastChange.core.slice(1)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActiveRulesStrip
