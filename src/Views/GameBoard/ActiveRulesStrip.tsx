import React, { useEffect, useState } from 'react'
import { useRuleVote } from '@/contexts/RuleVoteContext'
import { coreColor } from '@/utils/coresVisual'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * What the games on this board are actually being played under.
 *
 * The rules are MUTABLE — the Cores can change them — so a board showing sixteen games
 * without saying which ruleset they run on is hiding the most consequential thing about
 * them. The header's Rulebook glyph could only ever be a colour and a dot; here there is
 * room to name the rules that are not at their default value, which is the only part a
 * user needs to hold in their head.
 *
 * Shows the CHANGED rules by name. When nothing has been changed it says so in one line
 * rather than listing a dozen defaults nobody is reading.
 */

const LABELS: Record<string, string> = {
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
}

const formatValue = (key: string, value: any): string => {
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
  changed: string[]
  lastChange?: { core: string; label: string; from?: any; to?: any; kind?: string } | null
  changeCount: number
}

const ActiveRulesStrip: React.FC = () => {
  const [data, setData] = useState<RulesPayload | null>(null)
  const ruleVote = useRuleVote()

  useEffect(() => {
    let cancelled = false
    const load = () => fetch(`${API_BASE}/rules`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setData(j?.data ?? null) })
      .catch(() => { /* strip hides itself */ })
    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (!data) return null

  const changed = (data.changed || []).filter(key => data.rules?.[key] !== undefined)
  const format = data.rules?.gameFormat
  const scoringModel = data.rules?.scoringModel

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '11px 16px', background: BG.panel, border: `1px solid ${BORDER.hairline}`,
      fontFamily: FONT, flexWrap: 'wrap',
    }}>
      <span style={{ ...font(600, 11, 1, '0.12em'), color: TEXT.muted, flexShrink: 0 }}>RULES</span>

      {changed.length === 0 ? (
        <span style={{ ...font(400, 12), color: TEXT.muted }}>
          Standard rulebook. Nothing has been changed this season.
        </span>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {changed.map(key => (
            <span
              key={key}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                border: `1px solid ${ACCENT.rules}59`, padding: '4px 7px',
              }}
            >
              <span style={{ ...font(600, 10, 1, '0.08em'), color: TEXT.muted }}>
                {LABELS[key] || key}
              </span>
              <span style={{ ...font(700, 11), color: ACCENT.rules, ...TABULAR }}>
                {formatValue(key, data.rules[key])}
              </span>
            </span>
          ))}
        </span>
      )}

      {/* A non-standard format or scoring model changes what a score even MEANS, so it
          gets said plainly rather than being left to the changed-rules list. */}
      {format && format !== 'standard' && (
        <span style={{ ...font(700, 10, 1, '0.08em'), color: ACCENT.anomaly }}>
          {String(format).toUpperCase()} FORMAT
        </span>
      )}
      {scoringModel && scoringModel !== 'additive' && (
        <span style={{ ...font(700, 10, 1, '0.08em'), color: ACCENT.anomaly }}>
          {String(scoringModel).toUpperCase()} SCORING
        </span>
      )}

      <span style={{ flex: 1 }} />

      {ruleVote.open ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: coreColor(ruleVote.core || undefined),
          }} />
          <span style={{ ...font(700, 10, 1, '0.08em'), color: coreColor(ruleVote.core || undefined) }}>
            A BALLOT IS OPEN
          </span>
        </span>
      ) : data.lastChange ? (
        <span style={{ ...font(400, 11), color: TEXT.muted, flexShrink: 0 }}>
          Last changed by{' '}
          <span style={{ color: coreColor(data.lastChange.core), fontWeight: 700 }}>
            {data.lastChange.core.charAt(0).toUpperCase() + data.lastChange.core.slice(1)}
          </span>
        </span>
      ) : null}
    </div>
  )
}

export default ActiveRulesStrip
