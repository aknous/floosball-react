import React from 'react'
import { PlayInsights } from '@/types/websocket'

interface PlayInsightsPanelProps {
  insights: PlayInsights
}

// ── Shared visual helpers ──

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    fontSize: '12px',
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '6px',
    paddingBottom: '3px',
    borderBottom: '1px solid #1e293b',
  }}>
    {label}
  </div>
)

const Row: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0' }}>
    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</span>
    <span style={{ fontSize: '12px', color: color ?? '#e2e8f0', fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
)

/** Horizontal fill bar, 0–100. */
const FillBar: React.FC<{ value: number; max?: number; color: string; width?: number; height?: number }> = ({
  value, max = 100, color, width = 80, height = 6,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div style={{ width, height, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3, transition: 'width 0.2s' }} />
    </div>
  )
}

/** FillBar + contextual label, consistently sized for alignment. */
const Gauge: React.FC<{ value: number; max?: number; color: string; text: string }> = ({ value, max = 100, color, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <FillBar value={value} max={max} color={color} width={60} />
    <span style={{ fontSize: '12px', color, fontWeight: '500', minWidth: 70, textAlign: 'right' }}>{text}</span>
  </div>
)

/** Centered differential bar: positive (green, right), negative (red, left). */
const DiffBar: React.FC<{ value: number; max?: number; width?: number; label?: string }> = ({
  value, max = 30, width = 60, label,
}) => {
  const clamped = Math.max(-max, Math.min(max, value))
  const pct = Math.abs(clamped) / max * 50
  const isPositive = clamped >= 0
  const color = isPositive ? '#22c55e' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: 16 }}>
      <div style={{ position: 'relative', width, height: 8, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
        {/* Center line */}
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', backgroundColor: '#334155' }} />
        {/* Fill bar from center */}
        <div style={{
          position: 'absolute',
          left: isPositive ? '50%' : `${50 - pct}%`,
          width: `${pct}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: 3,
          transition: 'all 0.2s',
        }} />
      </div>
      <span style={{ fontSize: '12px', color, fontWeight: '600', minWidth: 70, textAlign: 'right', lineHeight: 1 }}>
        {label ?? fmtMod(value)}
      </span>
    </div>
  )
}

/** Color from quality rating (0-100). */
function qualityColor(v: number): string {
  if (v >= 65) return '#22c55e'
  if (v >= 40) return '#eab308'
  return '#ef4444'
}

/** Color for player attributes (60-100 range). */
function attrColor(v: number): string {
  if (v >= 80) return '#22c55e'
  if (v >= 70) return '#eab308'
  return '#ef4444'
}

/** Contextual label for quality ratings (0-100, thresholds 65/40). */
function qualityText(v: number, labels: [string, string, string]): string {
  if (v >= 65) return labels[0]
  if (v >= 40) return labels[1]
  return labels[2]
}

/** Contextual label for player attributes (60-100, thresholds 80/70). */
function attrText(v: number, labels: [string, string, string]): string {
  if (v >= 80) return labels[0]
  if (v >= 70) return labels[1]
  return labels[2]
}

/** Format a number as +/- sign. */
function fmtMod(v: number): string {
  if (v === 0) return '0'
  return (v > 0 ? '+' : '') + v.toFixed(1)
}

/** Stacked weight bar showing run/short/medium/long distribution. */
const WeightBar: React.FC<{ weights: { run: number; short: number; medium: number; long: number } }> = ({ weights }) => {
  const colors: Record<string, string> = { run: '#f59e0b', short: '#22c55e', medium: '#3b82f6', long: '#a855f7' }
  const total = weights.run + weights.short + weights.medium + weights.long
  if (total === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ display: 'flex', height: '8px', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
        {(['run', 'short', 'medium', 'long'] as const).map(k => {
          const pct = (weights[k] / total) * 100
          if (pct < 1) return null
          return <div key={k} style={{ width: `${pct}%`, backgroundColor: colors[k], transition: 'width 0.2s' }} />
        })}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['run', 'short', 'medium', 'long'] as const).map(k => (
          <span key={k} style={{ fontSize: '12px', color: colors[k], fontWeight: '500' }}>
            {k.charAt(0).toUpperCase() + k.slice(1)} {((weights[k] / total) * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Section renderers ──

const SituationSection: React.FC<{ data: NonNullable<PlayInsights['situation']> }> = ({ data }) => (
  <div>
    <SectionLabel label="Situation" />
    <Row label="Game Pressure" value={
      <Gauge
        value={data.gamePressure}
        color={data.gamePressure >= 75 ? '#ef4444' : data.gamePressure >= 50 ? '#f97316' : data.gamePressure >= 25 ? '#eab308' : '#22c55e'}
        text={data.gamePressure >= 75 ? 'Very High' : data.gamePressure >= 50 ? 'High' : data.gamePressure >= 25 ? 'Medium' : 'Low'}
      />
    } />
    <Row label="Momentum" value={
      <DiffBar
        value={data.momentumTeam ? (data.momentumTeam === data.offenseAbbr ? Math.abs(data.momentum) : -Math.abs(data.momentum)) : 0}
        max={50}
        label={data.momentumTeam ? data.momentumTeam : 'Neutral'}
      />
    } />
  </div>
)

const playCallColors: Record<string, string> = { run: '#f59e0b', short: '#22c55e', medium: '#3b82f6', long: '#a855f7' }

/** Describe the offensive gameplan philosophy from runPassRatio. */
function gameplanDescriptor(ratio: number): { label: string; color: string } {
  if (ratio >= 0.65) return { label: 'Ground Dominant', color: '#f59e0b' }
  if (ratio >= 0.55) return { label: 'Run First', color: '#f59e0b' }
  if (ratio > 0.45) return { label: 'Balanced', color: '#94a3b8' }
  if (ratio > 0.35) return { label: 'Pass First', color: '#3b82f6' }
  return { label: 'Air Raid', color: '#a855f7' }
}

/** Describe the opponent's defensive posture. */
function defensePostureDescriptor(runFocus: number, blitz: number): { label: string; color: string } {
  if (blitz >= 0.35) return { label: 'Blitz Heavy', color: '#ef4444' }
  if (runFocus >= 0.65) return { label: 'Stacking the Box', color: '#f59e0b' }
  if (runFocus <= 0.35) return { label: 'Pass Coverage', color: '#3b82f6' }
  return { label: 'Balanced', color: '#94a3b8' }
}

/** Find the dominant gap from distribution. */
function gapEmphasis(dist: Record<string, number>): { gap: string; pct: number } | null {
  const entries = Object.entries(dist)
  if (entries.length === 0) return null
  const sorted = entries.sort((a, b) => b[1] - a[1])
  return { gap: sorted[0][0], pct: sorted[0][1] }
}

/** Describe coach mind rating as a one-word label. */
function coachMindLabel(v: number | null): string {
  if (v == null) return '—'
  if (v >= 90) return 'Elite'
  if (v >= 80) return 'Sharp'
  if (v >= 70) return 'Capable'
  return 'Limited'
}

const CoachSection: React.FC<{ data: NonNullable<PlayInsights['coach']>; playCall?: string }> = ({ data, playCall }) => {
  const callLabels: Record<string, string> = { run: 'Run', short: 'Short Pass', medium: 'Medium Pass', long: 'Long Pass' }
  const gp = data.gameplan
  const def = data.oppDefense
  const offLabel = data.offenseAbbr ?? 'OFF'
  const defLabel = data.defenseAbbr ?? 'DEF'
  const adjusted = data.isSecondHalf
    ? <span style={{ color: '#eab308', fontSize: '10px', marginLeft: '5px' }}>Adjusted</span>
    : null

  return (
    <div>
      <SectionLabel label="Stratagem" />
      {playCall && (
        <Row label="Play Call" value={callLabels[playCall] ?? playCall} color={playCallColors[playCall] ?? '#e2e8f0'} />
      )}

      {/* ── Offensive coach's gameplan ── */}
      {gp && (() => {
        const plan = gameplanDescriptor(gp.runPassRatio)
        const emphasis = gapEmphasis(gp.gapDistribution)
        return (
          <div style={{ borderLeft: '2px solid #3b82f6', paddingLeft: '8px', marginTop: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {offLabel} OFFENSE
            </div>
            <Row label="Gameplan" value={
              <span style={{ color: plan.color, fontWeight: '500' }}>{plan.label}{adjusted}</span>
            } />
            <Row label="Run / Pass" value={`${Math.round(gp.runPassRatio * 100)}% / ${Math.round((1 - gp.runPassRatio) * 100)}%`} />
            {emphasis && emphasis.pct >= 40 && (
              <Row label="Gap Emphasis" value={emphasis.gap} color="#cbd5e1" />
            )}
            <Row label="Offensive Mind" value={coachMindLabel(data.coachOffMind)} color={data.coachOffMind != null ? attrColor(data.coachOffMind) : '#94a3b8'} />
            <Row label="Adaptability" value={coachMindLabel(data.coachAdapt)} color={data.coachAdapt != null ? attrColor(data.coachAdapt) : '#94a3b8'} />
          </div>
        )
      })()}

      {/* ── Defensive coach's gameplan ── */}
      {def && (() => {
        const posture = defensePostureDescriptor(def.runStopFocus, def.blitzFrequency)
        return (
          <div style={{ borderLeft: '2px solid #ef4444', paddingLeft: '8px', marginTop: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {defLabel} DEFENSE
            </div>
            <Row label="Posture" value={
              <span style={{ color: posture.color, fontWeight: '500' }}>{posture.label}{adjusted}</span>
            } />
            <Row label="Run Focus" value={`${Math.round(def.runStopFocus * 100)}%`} />
            <Row label="Blitz Rate" value={`${Math.round(def.blitzFrequency * 100)}%`} />
            <Row label="Defensive Mind" value={coachMindLabel(def.coachDefMind)} color={def.coachDefMind != null ? attrColor(def.coachDefMind) : '#94a3b8'} />
            <Row label="Adaptability" value={coachMindLabel(def.coachAdapt)} color={def.coachAdapt != null ? attrColor(def.coachAdapt) : '#94a3b8'} />
          </div>
        )
      })()}

      {data.targetSideline && (
        <div style={{ marginTop: '4px' }}>
          <Row label="Targeting Sideline" value="Yes" color="#eab308" />
        </div>
      )}
    </div>
  )
}

const FourthDownSection: React.FC<{ data: NonNullable<PlayInsights['fourthDown']> }> = ({ data }) => {
  const decisionLabels: Record<string, string> = {
    punt: 'Punt',
    fieldGoal: 'Field Goal',
    goForIt: 'Go For It',
  }
  return (
    <div>
      <SectionLabel label="Fourth Down" />
      <Row label="Decision" value={decisionLabels[data.decision] ?? data.decision} color={data.decision === 'goForIt' ? '#eab308' : '#e2e8f0'} />
      {data.inFgRange && (
        <Row label="FG Probability" value={
          <Gauge value={data.fgProbability} color={data.fgProbability >= 50 ? '#22c55e' : '#ef4444'} text={`${data.fgProbability.toFixed(0)}%`} />
        } />
      )}
    </div>
  )
}

const RunSection: React.FC<{ data: NonNullable<PlayInsights['run']> }> = ({ data }) => {
  const gapEntries = Object.entries(data.gapQualities)

  return (
    <div>
      <SectionLabel label="Execution" />
      <Row label="Runner" value={
        <Gauge value={data.runnerRating} color={attrColor(data.runnerRating)} text={attrText(data.runnerRating, ['Powerful', 'Capable', 'Weak'])} />
      } />
      {data.blockerName && (
        <Row label="TE Blocking" value={
          <Gauge value={data.blockerRating} color={attrColor(data.blockerRating)} text={attrText(data.blockerRating, ['Dominant', 'Solid', 'Weak'])} />
        } />
      )}
      <div style={{ marginTop: '4px', marginBottom: '4px' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '3px' }}>Gap Qualities</div>
        {gapEntries.map(([gapKey, quality]) => {
          const isSelected = data.selectedGap === gapKey
          const label = gapKey.charAt(0).toUpperCase() + gapKey.slice(1)
          const barColor = isSelected ? qualityColor(quality) : '#475569'
          return (
            <div key={gapKey} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 4px',
              borderRadius: 3,
              backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}>
              <span style={{
                fontSize: '12px', width: '50px', color: isSelected ? '#e2e8f0' : '#94a3b8',
                fontWeight: isSelected ? '700' : '400'
              }}>
                {label}{isSelected ? ' *' : ''}
              </span>
              <FillBar value={quality} max={100} color={barColor} width={60} />
              <span style={{ fontSize: '12px', color: isSelected ? qualityColor(quality) : '#94a3b8', fontWeight: isSelected ? '600' : '400', minWidth: 70, textAlign: 'right' }}>
                {qualityText(quality, ['Open', 'Tight', 'Stuffed'])}
              </span>
            </div>
          )
        })}
      </div>
      <Row label="Off vs Def" value={
        <DiffBar value={data.offenseVsDefense} label={
          data.offenseVsDefense > 15 ? 'Dominant' : data.offenseVsDefense > 5 ? 'Favorable'
          : data.offenseVsDefense >= -5 ? 'Even'
          : data.offenseVsDefense >= -15 ? 'Outmatched' : 'Overwhelmed'
        } />
      } />
      {data.fumbleRisk > 0 && (
        <Row label="Fumble Risk" value={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FillBar value={data.fumbleRisk} color={data.isFumble ? '#ef4444' : '#475569'} width={60} />
            <span style={{ fontSize: '12px', color: data.isFumble ? '#ef4444' : '#94a3b8', fontWeight: data.isFumble ? '600' : '400', minWidth: 70, textAlign: 'right' }}>
              {data.fumbleRisk}%{data.isFumble ? ' — Fumble' : ''}
            </span>
          </div>
        } />
      )}
    </div>
  )
}

const PassSection: React.FC<{ data: NonNullable<PlayInsights['pass']> }> = ({ data }) => (
  <div>
    <SectionLabel label="Execution" />

    {/* ── Quarterback ── */}
    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '3px' }}>Quarterback</div>
    <Row label="Pass Rush" value={
      <DiffBar value={data.protectionDiff} label={data.wasSacked ? 'Sacked' : data.protectionDiff >= 0 ? 'Protected' : 'Pressured'} />
    } />
    {data.qbVision != null && (
      <Row label="Vision" value={
        <Gauge value={data.qbVision} color={attrColor(data.qbVision)} text={attrText(data.qbVision, ['Keen', 'Steady', 'Narrow'])} />
      } />
    )}
    {data.throwQuality != null && (
      <Row label="Throw Quality" value={
        <Gauge value={data.throwQuality} color={qualityColor(data.throwQuality)} text={qualityText(data.throwQuality, ['Sharp', 'Decent', 'Errant'])} />
      } />
    )}
    {data.throwAway && <Row label="Outcome" value="Throw Away" color="#eab308" />}

    {/* ── Receiver ── */}
    {data.targets && data.targets.length > 0 && (() => {
      const selected = data.targets.find(t => t.isSelected)
      const isThrowAway = !!data.throwAway
      return (
        <div style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '3px' }}>Receiver</div>
          {isThrowAway ? (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px', marginBottom: '2px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', flex: 1 }}>Target</span>
              <span style={{ fontSize: '12px', color: '#64748b', width: 60, textAlign: 'center' }}>Route</span>
              <span style={{ fontSize: '12px', color: '#64748b', width: 60, textAlign: 'center' }}>Separation</span>
              <span style={{ width: 70 }} />
            </div>
            {data.targets.map((t, i) => {
              const barColor = qualityColor(t.openness)
              const routeColor = t.routeQuality != null ? attrColor(t.routeQuality) : '#64748b'
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 4px',
                  borderRadius: 3,
                }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.position} {t.name}
                  </span>
                  {t.routeQuality != null && (
                    <span style={{ fontSize: '11px', color: routeColor, width: 60, textAlign: 'center' }}>{attrText(t.routeQuality, ['Crisp', 'Solid', 'Sloppy'])}</span>
                  )}
                  <FillBar value={t.openness} max={100} color={barColor} width={60} />
                  <span style={{ fontSize: '12px', color: barColor, fontWeight: '500', minWidth: 70, textAlign: 'right' }}>{qualityText(t.openness, ['Open', 'Contested', 'Covered'])}</span>
                </div>
              )
            })}
          </>) : selected && (
            <>
              <Row label="Target" value={`${selected.name} (${selected.position})`} />
              <Row label="Separation" value={
                <Gauge value={selected.openness} color={qualityColor(selected.openness)} text={qualityText(selected.openness, ['Open', 'Contested', 'Covered'])} />
              } />
              {data.rcvHands != null && (
                <Row label="Hands" value={
                  <Gauge value={data.rcvHands} color={attrColor(data.rcvHands)} text={attrText(data.rcvHands, ['Sure', 'Reliable', 'Shaky'])} />
                } />
              )}
              {data.rcvReach != null && (
                <Row label="Reach" value={
                  <Gauge value={data.rcvReach} color={attrColor(data.rcvReach)} text={attrText(data.rcvReach, ['Long', 'Average', 'Short'])} />
                } />
              )}
              {data.rcvRouteRunning != null && (
                <Row label="Route" value={
                  <Gauge value={data.rcvRouteRunning} color={attrColor(data.rcvRouteRunning)} text={attrText(data.rcvRouteRunning, ['Crisp', 'Solid', 'Sloppy'])} />
                } />
              )}
            </>
          )}
        </div>
      )
    })()}

    {/* ── Outcome ── */}
    {data.catchProbability != null && (
      <div style={{ marginTop: '6px' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '3px' }}>Outcome</div>
        <ProbabilityBar
          catchPct={data.catchProbability}
          intPct={data.intProbability ?? 0}
          dropPct={data.dropProbability ?? 0}
          outcomeRoll={data.outcomeRoll}
        />
      </div>
    )}

    {data.airYards != null && <Row label="Air Yards" value={data.airYards} />}
    {data.yac != null && <Row label="YAC" value={data.yac} />}
  </div>
)

/** Stacked probability bar matching backend zone order: INT | Catch | Drop | Incomplete. */
const ProbabilityBar: React.FC<{
  catchPct: number; intPct: number; dropPct: number; outcomeRoll?: number
}> = ({ catchPct, intPct, dropPct, outcomeRoll }) => {
  const incompletePct = Math.max(0, 100 - catchPct - intPct - dropPct)
  // Backend roll order: INT → Catch → Drop → Incomplete
  const zones = [
    { label: 'INT', pct: intPct, color: '#ef4444' },
    { label: 'Catch', pct: catchPct, color: '#22c55e' },
    { label: 'Drop', pct: dropPct, color: '#eab308' },
    { label: 'Incomplete', pct: incompletePct, color: '#475569' },
  ].filter(z => z.pct > 0)

  // Determine which zone the outcome landed in (matches backend order)
  let outcomeLabel: string | null = null
  if (outcomeRoll != null) {
    if (outcomeRoll <= intPct) outcomeLabel = 'INT'
    else if (outcomeRoll <= intPct + catchPct) outcomeLabel = 'Catch'
    else if (outcomeRoll <= intPct + catchPct + dropPct) outcomeLabel = 'Drop'
    else outcomeLabel = 'Incomplete'
  }

  return (
    <div>
      <div style={{ position: 'relative', height: '10px', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
        {zones.map((z, i) => (
          <div key={i} style={{ width: `${z.pct}%`, height: '100%', backgroundColor: z.color }} />
        ))}
        {outcomeRoll != null && (
          <div style={{
            position: 'absolute', left: `${outcomeRoll}%`, top: -2, width: '2px', height: 14,
            backgroundColor: '#fff', transform: 'translateX(-1px)',
            boxShadow: '0 0 3px rgba(0,0,0,0.5)',
          }} />
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap', alignItems: 'center' }}>
        {zones.map((z, i) => (
          <span key={i} style={{ fontSize: '12px', color: z.color, fontWeight: '500' }}>
            {z.label} {z.pct.toFixed(0)}%
          </span>
        ))}
        {outcomeLabel && (
          <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '600', marginLeft: 'auto' }}>
            {outcomeLabel}
          </span>
        )}
      </div>
    </div>
  )
}

const FgSection: React.FC<{ data: NonNullable<PlayInsights['fg']> }> = ({ data }) => (
  <div>
    <SectionLabel label="Execution" />
    <Row label="Distance" value={`${data.distance} yds`} />
    <Row label="Make Probability" value={
      <Gauge value={data.finalProbability} color={data.finalProbability >= 50 ? '#22c55e' : '#ef4444'} text={`${data.finalProbability}%`} />
    } />
    <Row label="Kicker" value={`${data.kickerName} (${data.kickerRating})`} />
    <Row label="Result" value={data.isGood ? 'Good' : 'No Good'} color={data.isGood ? '#22c55e' : '#ef4444'} />
  </div>
)

/**
 * Derive a mental state descriptor from combined drift.
 * Drift is the in-game movement from pre-game baseline (typically ±0.01 to ±0.30).
 * At 25x amplification in the engine, even small drift has real gameplay impact.
 */
function mentalStateDescriptor(confDrift: number, detDrift: number, pressureMod: number = 0): { label: string; color: string } {
  // Drift captures in-game momentum; pressureMod captures how the player handles game pressure
  // pressureMod is typically -5 to +5; normalize to roughly same scale as drift (~±0.25)
  const pressureEffect = pressureMod * 0.04
  const total = confDrift + detDrift + pressureEffect
  if (total >= 0.25)  return { label: 'Locked In',   color: '#22c55e' }
  if (total >= 0.12)  return { label: 'In Rhythm',   color: '#4ade80' }
  if (total >= 0.04)  return { label: 'Warming Up',  color: '#86efac' }
  if (total > -0.04)  return { label: 'Composed',    color: '#94a3b8' }
  if (total > -0.12)  return { label: 'Unsettled',   color: '#fca5a5' }
  if (total > -0.25)  return { label: 'Frustrated',  color: '#f87171' }
  return                       { label: 'Rattled',     color: '#ef4444' }
}

/** Small arrow showing per-play change direction */
const ChangeArrow: React.FC<{ confChange: number; detChange: number }> = ({ confChange, detChange }) => {
  const total = confChange + detChange
  if (Math.abs(total) < 0.002) return null
  const color = total > 0 ? '#4ade80' : '#f87171'
  const arrow = total > 0 ? '\u25B2' : '\u25BC'
  return <span style={{ fontSize: '10px', color, marginLeft: '4px' }}>{arrow}</span>
}

const PlayersSection: React.FC<{ data: NonNullable<PlayInsights['players']> }> = ({ data }) => (
  <div>
    <SectionLabel label="Composure" />
    {data.map((p, i) => {
      const hasDrift = p.confidenceDrift != null && p.determinationDrift != null
      const state = hasDrift
        ? mentalStateDescriptor(p.confidenceDrift!, p.determinationDrift!, p.pressureMod ?? 0)
        : null
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.position ? `${p.position} ` : ''}{p.name}
          </span>
          {state && (
            <span style={{ fontSize: '12px', color: state.color, fontWeight: '600', minWidth: 70, textAlign: 'right' }}>
              {state.label}
              <ChangeArrow confChange={p.confidenceChange} detChange={p.determinationChange} />
            </span>
          )}
        </div>
      )
    })}
  </div>
)

const ClockMgmtSection: React.FC<{ data: NonNullable<PlayInsights['clockMgmt']> }> = ({ data }) => {
  const decisionLabels: Record<string, string> = {
    kneel: 'Kneel',
    spike: 'Spike',
    timeout: 'Timeout',
    desperationFG: 'Desperation FG',
  }
  return (
    <div>
      <SectionLabel label="Clock Management" />
      <Row label="Decision" value={decisionLabels[data.decision] ?? data.decision} />
      <Row label="Rationale" value={data.reason} />
    </div>
  )
}

// ── Main component ──

export const PlayInsightsPanel: React.FC<PlayInsightsPanelProps> = ({ insights }) => {
  // Left column: context sections (short)
  const leftSections: React.ReactNode[] = []
  // Right column: execution section (tall)
  const rightSections: React.ReactNode[] = []

  if (insights.situation) leftSections.push(<SituationSection key="sit" data={insights.situation} />)
  if (insights.coach) leftSections.push(<CoachSection key="coach" data={insights.coach} playCall={insights.playCall} />)
  if (insights.fourthDown) leftSections.push(<FourthDownSection key="4th" data={insights.fourthDown} />)
  if (insights.clockMgmt) leftSections.push(<ClockMgmtSection key="clk" data={insights.clockMgmt} />)

  if (insights.players) rightSections.push(<PlayersSection key="plyr" data={insights.players} />)
  if (insights.run) rightSections.push(<RunSection key="run" data={insights.run} />)
  if (insights.pass) rightSections.push(<PassSection key="pass" data={insights.pass} />)
  if (insights.fg) rightSections.push(<FgSection key="fg" data={insights.fg} />)

  if (leftSections.length === 0 && rightSections.length === 0) return null

  return (
    <div style={{
      backgroundColor: '#0f172a',
      borderTop: '1px solid #1e293b',
      padding: '10px 12px',
      display: 'flex',
      gap: '24px',
    }}>
      <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: 280, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {leftSections}
      </div>
      {rightSections.length > 0 && (
        <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: 280, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rightSections}
        </div>
      )}
    </div>
  )
}

export default PlayInsightsPanel
