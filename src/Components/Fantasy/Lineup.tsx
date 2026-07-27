import React, { useState } from 'react'
import TradingCard from '@/Components/Cards/TradingCard'
import CardPickerModal from '@/Components/Cards/CardPickerModal'
import { useLineup, BASE_SLOTS, FLEX_SLOT, LineupSlot, SLOT_POSITION, SLOT_ORDINAL, EquippedEntry } from '@/hooks/useLineup'
import { useFantasySnapshot, CardBreakdownEntry } from '@/hooks/useFantasySnapshot'
import { useAuth } from '@/contexts/AuthContext'
import HoverTooltip from '@/Components/HoverTooltip'
import { gateTooltipText, gateFill, gateBarColor } from './gateMeter'
import { positionColor } from '@/Components/Cards/positionColors'

const EMPTY_ROSTER_IDS: Set<number> = new Set()

const OUTPUT_COLORS: Record<string, string> = {
  fp: '#4ade80', mult: '#f472b6', floobits: '#eab308',
}


// The per-slot performance block: the fielded player's week FP with a thin gate bar
// (its COLOR is the on/off signal — no text label), and the effect result on one line
// (the gated-off state folds into it). Fixed height so all slots line up.
const PerfBlock: React.FC<{
  weekFP?: number
  gate?: { threshold?: number; inverse?: boolean }
  bonus?: CardBreakdownEntry
  noEffect: boolean
}> = ({ weekFP, gate, bonus, noEffect }) => {
  const fp = weekFP ?? 0
  const thr = gate?.threshold ?? 0
  const isChance = Boolean(bonus?.isChanceEffect)
  // Chance cards show a probability bar (fill = trigger odds) instead of an on/off gate.
  const gated = thr > 0 || isChance
  const meterOpts = {
    playerFP: fp, threshold: thr, active: gate?.inverse ? fp < thr : fp >= thr, inverse: gate?.inverse,
    isChance, chancePct: bonus?.chanceThreshold, chanceTriggered: bonus?.chanceTriggered,
  }
  // The FP number always counts (base pays regardless); the bar carries the on/off or odds signal.
  const on = isChance ? true : meterOpts.active
  const pct = gateFill(meterOpts) * 100
  const barColor = gateBarColor(meterOpts)

  // Result line: the card's effect output this week. FPx cards show their multiplier
  // delta, FP/Floobits cards their flat add. No-effect (standard) cards show nothing;
  // anything that produced no output (incl. gated off) shows a muted "—".
  let result: React.ReactNode = null
  if (noEffect) {
    result = null
  } else if (bonus && bonus.floobitsEarned > 0) {
    result = <span style={{ color: OUTPUT_COLORS.floobits }}>+{bonus.floobitsEarned} Floobits</span>
  } else if (bonus && bonus.primaryMult > 1) {
    result = <span style={{ color: OUTPUT_COLORS.mult }}>+{(bonus.primaryMult - 1).toFixed(2)} FPx</span>
  } else if (bonus && bonus.totalFP > 0) {
    result = <span style={{ color: OUTPUT_COLORS.fp }}>+{bonus.totalFP.toFixed(1)} FP</span>
  } else {
    result = <span style={{ color: '#64748b' }}>—</span>
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontSize: 19, fontWeight: 800, color: on ? '#eaf1ff' : '#93a1b8', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {fp.toFixed(1)}<span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 3 }}>FP</span>
      </div>
      {/* Gate / chance bar — reserved height (even with no bar) keeps slots aligned. */}
      <div style={{ height: 9, width: '80%', display: 'flex', alignItems: 'center' }}>
        {gated && (
          <HoverTooltip
            text={gateTooltipText(meterOpts)}
            color={barColor}
            style={{ display: 'block', width: '100%' }}
          >
            <div style={{ width: '100%', height: 9, backgroundColor: 'rgba(148,163,184,0.22)', borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.15)', cursor: 'help' }}>
              <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: 5, transition: 'width 0.2s' }} />
            </div>
          </HoverTooltip>
        )}
      </div>
      {/* Reserved height so no-effect slots (empty here) still line up. */}
      <div style={{ fontSize: 12, fontWeight: 700, minHeight: 15 }}>{result}</div>
    </div>
  )
}

// The position-locked lineup rail: all slots (QB/RB/WR1/WR2/TE/K + optional FLEX)
// in one row, each card showing the fielded player's week FP + its card bonus.
const Lineup: React.FC = () => {
  const { user } = useAuth()
  const lineup = useLineup()
  const snap = useFantasySnapshot(user?.id)
  const myEntry = snap.myEntry
  const [pickerSlot, setPickerSlot] = useState<LineupSlot | null>(null)

  const slots: LineupSlot[] = [...BASE_SLOTS, ...(lineup.hasFlex ? [FLEX_SLOT] : [])]
  const equipped = Object.values(lineup.bySlot).filter((e): e is EquippedEntry => Boolean(e))

  const weekFPBySlot: Record<string, number> = {}
  for (const p of myEntry?.players ?? []) weekFPBySlot[p.slot] = p.weekFP
  const bonusBySlotNumber: Record<number, CardBreakdownEntry> = {}
  for (const b of myEntry?.cardBreakdowns ?? []) bonusBySlotNumber[b.slotNumber] = b

  // Same-team stacks: when 2+ equipped cards depict players from the same real team, they
  // glow in that team's color (the fusion successor to the old match-bonus glow, and the
  // visual cue for the team-stacking FPx synergy).
  const teamCounts: Record<number, number> = {}
  for (const e of equipped) {
    const t = e.card.teamId
    if (t != null) teamCounts[t] = (teamCounts[t] || 0) + 1
  }

  return (
    <div style={{ fontFamily: 'pressStart' }}>
      {lineup.error && (
        <div style={{ color: '#f87171', fontSize: 11, padding: '4px 4px 10px' }}>{lineup.error}</div>
      )}

      {lineup.loading ? (
        <div style={{ color: '#64748b', fontSize: 12, padding: 24, textAlign: 'center' }}>Loading your lineup…</div>
      ) : (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {slots.map(slot => {
            const entry = lineup.bySlot[slot]
            const canEdit = !lineup.gamesActive && !lineup.locked && !lineup.saving
            const bonus = entry ? bonusBySlotNumber[entry.slotNumber] : undefined
            const noEffect = entry?.card.edition === 'base'
            const stackTeamId = entry?.card.teamId
            const stackGlow = stackTeamId != null && teamCounts[stackTeamId] >= 2
              ? (entry!.card.teamColor ?? undefined) : undefined
            const slotColor = slot === FLEX_SLOT ? '#fbbf24' : positionColor(SLOT_POSITION[slot])
            return (
              <div key={slot} data-tour={slot === 'QB' ? 'fantasy-card-read' : undefined}
                   style={{ width: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: slotColor, textShadow: `0 0 10px ${slotColor}55`, display: 'flex', gap: 4 }}>
                  {slot}{slot === FLEX_SLOT && <span style={{ color: '#fbbf24' }}>◇</span>}
                </div>

                {entry ? (
                  <div style={{ position: 'relative' }}>
                    {/* Card click flips it (front/back). Equipping is a separate control.
                        gateFP = the depicted player's week FP, driving the live power bar. */}
                    <TradingCard card={entry.card} size="sm" noHoverLift gateFP={weekFPBySlot[slot]} glowColor={stackGlow} />
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); lineup.unequip(slot) }}
                        aria-label={`Clear ${slot}`}
                        style={clearBtn}>×</button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => canEdit && setPickerSlot(slot)}
                    disabled={!canEdit}
                    style={{ ...emptyCard, borderColor: `${slotColor}66`, cursor: canEdit ? 'pointer' : 'default' }}>
                    <div style={{ fontSize: 30, color: slotColor, lineHeight: 1 }}>+</div>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: slotColor, marginTop: 8 }}>Add {slot}</div>
                  </button>
                )}

                {entry && canEdit && (
                  <button onClick={() => setPickerSlot(slot)} style={changeBtn}>Change</button>
                )}

                <PerfBlock weekFP={weekFPBySlot[slot]} gate={entry?.card.effectConfig?.gate} bonus={bonus} noEffect={noEffect} />
              </div>
            )
          })}
        </div>
      )}

      <CardPickerModal
        visible={!!pickerSlot}
        onClose={() => setPickerSlot(null)}
        onSelect={async (card) => {
          if (!pickerSlot) return
          const ok = await lineup.equip(pickerSlot, card.id)
          if (ok) setPickerSlot(null)
        }}
        excludeCardIds={equipped.map(e => e.card.id)}
        excludeEffectNames={equipped.map(e => e.card.effectName || '').filter(n => n && n !== 'none')}
        excludePlayerIds={equipped.map(e => e.playerId)}
        rosterPlayerIds={EMPTY_ROSTER_IDS}
        position={pickerSlot ? SLOT_POSITION[pickerSlot] : null}
        slotLabel={pickerSlot ?? undefined}
        slotScoped
        targetSlot={pickerSlot ? SLOT_ORDINAL[pickerSlot] : null}
      />
    </div>
  )
}

const changeBtn: React.CSSProperties = {
  padding: '4px 14px', borderRadius: 6, border: '1px solid #3b4d68',
  background: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'pressStart',
}
const clearBtn: React.CSSProperties = {
  position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
  border: '1px solid #475569', background: '#0f172a', color: '#cbd5e1', fontSize: 13, lineHeight: 1,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 4,
}
const emptyCard: React.CSSProperties = {
  width: 160, height: 270, borderRadius: 12, border: '2px dashed #33445c', background: '#0e1622',
  boxSizing: 'border-box',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
}

export default Lineup
