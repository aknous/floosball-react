import React, { useState } from 'react'
import TradingCard from '@/Components/Cards/TradingCard'
import CardPickerModal from '@/Components/Cards/CardPickerModal'
import { useLineup, BASE_SLOTS, FLEX_SLOT, LineupSlot, SLOT_POSITION, SLOT_ORDINAL, EquippedEntry } from '@/hooks/useLineup'
import { useFantasySnapshot, CardBreakdownEntry, PlayerGameStats } from '@/hooks/useFantasySnapshot'
import { useAuth } from '@/contexts/AuthContext'

const EMPTY_ROSTER_IDS: Set<number> = new Set()

const OUTPUT_COLORS: Record<string, string> = {
  fp: '#4ade80', mult: '#f472b6', floobits: '#eab308',
}

// CardTemplate.position (1-based) → position label.
const POSITION_LABEL: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K' }

// This week's game line as one compact, glanceable string per position.
function compactStatLine(stats: PlayerGameStats | null | undefined, pos: string): string | null {
  if (!stats) return null
  if (pos === 'QB') {
    const p = stats.passing ?? {}
    const base = `${p.comp ?? 0}/${p.att ?? 0} · ${p.yards ?? 0} yd · ${p.tds ?? 0} TD`
    return (p.ints ?? 0) ? `${base} · ${p.ints} INT` : base
  }
  if (pos === 'RB') {
    const r = stats.rushing ?? {}
    return `${r.carries ?? 0} car · ${r.yards ?? 0} yd · ${r.tds ?? 0} TD`
  }
  if (pos === 'WR' || pos === 'TE') {
    const rc = stats.receiving ?? {}
    return `${rc.receptions ?? 0}/${rc.targets ?? 0} rec · ${rc.yards ?? 0} yd · ${rc.tds ?? 0} TD`
  }
  if (pos === 'K') {
    const k = stats.kicking ?? {}
    return `${k.fgs ?? 0}/${k.fgAtt ?? 0} FG · ${k.longest ?? 0} yd`
  }
  return null
}

// The per-slot scoring line: the fielded player's week FP + that card's effect result.
const ScoreLine: React.FC<{ weekFP?: number; bonus?: CardBreakdownEntry; noEffect: boolean }>
  = ({ weekFP, bonus, noEffect }) => {
  let bonusEl: React.ReactNode = <span style={{ color: '#64748b' }}>no effect</span>
  if (!noEffect && bonus) {
    if (bonus.floobitsEarned > 0) {
      bonusEl = <span style={{ color: OUTPUT_COLORS.floobits }}>+{bonus.floobitsEarned} Floobits</span>
    } else if (bonus.totalFP > 0) {
      const c = OUTPUT_COLORS[bonus.outputType] || OUTPUT_COLORS.fp
      bonusEl = <span style={{ color: c }}>+{bonus.totalFP.toFixed(1)} {bonus.outputType === 'mult' ? 'FPx' : 'FP'}</span>
    } else {
      bonusEl = <span style={{ color: '#64748b' }}>—</span>
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minHeight: 32, justifyContent: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#eaf1ff', fontVariantNumeric: 'tabular-nums' }}>
        {(weekFP ?? 0).toFixed(1)}<span style={{ color: '#94a3b8', fontSize: 9, marginLeft: 2 }}>FP</span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700 }}>{bonusEl}</div>
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
            const noEffect = entry?.card.edition === 'standard'
            return (
              <div key={slot} data-tour={slot === 'QB' ? 'fantasy-card-read' : undefined}
                   style={{ width: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: '#94a3b8', display: 'flex', gap: 4 }}>
                  {slot}{slot === FLEX_SLOT && <span style={{ color: '#fbbf24' }}>◇</span>}
                </div>

                {entry ? (
                  <div style={{ position: 'relative' }}>
                    {/* Card click flips it (front/back). Equipping is a separate control. */}
                    <TradingCard card={entry.card} size="sm" noHoverLift />
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
                    style={{ ...emptyCard, cursor: canEdit ? 'pointer' : 'default' }}>
                    <div style={{ fontSize: 30, color: '#94a3b8', lineHeight: 1 }}>+</div>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94a3b8', marginTop: 8 }}>Add {slot}</div>
                  </button>
                )}

                {entry && canEdit && (
                  <button onClick={() => setPickerSlot(slot)} style={changeBtn}>Change</button>
                )}

                <ScoreLine weekFP={weekFPBySlot[slot]} bonus={bonus} noEffect={noEffect} />

                {/* This week's game line, always at a glance once the player has played */}
                {entry && (() => {
                  const line = compactStatLine(
                    myEntry?.playerGameStats?.[entry.playerId],
                    POSITION_LABEL[entry.card.position] ?? '',
                  )
                  return line ? <div style={statLineStyle}>{line}</div> : null
                })()}
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

const statLineStyle: React.CSSProperties = {
  fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.35,
  maxWidth: 156, fontVariantNumeric: 'tabular-nums', marginTop: -2,
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
