import React, { useState } from 'react'
import TradingCard from '@/Components/Cards/TradingCard'
import CardPickerModal from '@/Components/Cards/CardPickerModal'
import { useLineup, BASE_SLOTS, FLEX_SLOT, LineupSlot, SLOT_POSITION, SLOT_ORDINAL, EquippedEntry } from '@/hooks/useLineup'
import { useFantasySnapshot, CardBreakdownEntry } from '@/hooks/useFantasySnapshot'
import { useAuth } from '@/contexts/AuthContext'

const EMPTY_ROSTER_IDS: Set<number> = new Set()

const OUTPUT_COLORS: Record<string, string> = {
  fp: '#4ade80', mult: '#f472b6', floobits: '#eab308',
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minHeight: 30, justifyContent: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#eaf1ff', fontVariantNumeric: 'tabular-nums' }}>
        {(weekFP ?? 0).toFixed(1)}<span style={{ color: '#94a3b8', fontSize: 8, marginLeft: 1 }}>FP</span>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700 }}>{bonusEl}</div>
    </div>
  )
}

const Lineup: React.FC = () => {
  const { user } = useAuth()
  const lineup = useLineup()
  const snap = useFantasySnapshot(user?.id)
  const myEntry = snap.myEntry
  const [pickerSlot, setPickerSlot] = useState<LineupSlot | null>(null)

  const slots: LineupSlot[] = [...BASE_SLOTS, ...(lineup.hasFlex ? [FLEX_SLOT] : [])]
  const equipped = Object.values(lineup.bySlot).filter((e): e is EquippedEntry => Boolean(e))

  // Scoring lookups from the snapshot.
  const weekFPBySlot: Record<string, number> = {}
  for (const p of myEntry?.players ?? []) weekFPBySlot[p.slot] = p.weekFP
  const bonusBySlotNumber: Record<number, CardBreakdownEntry> = {}
  for (const b of myEntry?.cardBreakdowns ?? []) bonusBySlotNumber[b.slotNumber] = b

  return (
    <div style={{ fontFamily: 'pressStart' }}>
      {/* Header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px',
        padding: '12px 4px', marginBottom: 6,
      }}>
        <div><div style={hdrK}>Week</div><div style={hdrV}>{snap.week || '—'}</div></div>
        {snap.modifier && (
          <div style={{
            fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', padding: '4px 9px',
            borderRadius: 999, border: '1px solid #233149', color: '#94a3b8', background: '#0e1826',
          }}>Modifier · {snap.modifier.displayName}</div>
        )}
        <div style={{ flex: 1 }} />
        {myEntry && (
          <>
            <div><div style={hdrK}>Rank</div><div style={hdrV}>{myEntry.rank}</div></div>
            <div><div style={hdrK}>Week total</div>
              <div style={{ ...hdrV, fontSize: 22, color: '#4ade80', fontWeight: 800 }}>
                {myEntry.weekTotal.toFixed(1)} FP
              </div>
            </div>
          </>
        )}
      </div>

      {lineup.error && (
        <div style={{ color: '#f87171', fontSize: 11, padding: '4px 4px 10px' }}>{lineup.error}</div>
      )}

      {/* Rail */}
      {lineup.loading ? (
        <div style={{ color: '#64748b', fontSize: 12, padding: 24, textAlign: 'center' }}>Loading your lineup…</div>
      ) : (
        <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap', justifyContent: 'center' }}>
          {slots.map(slot => {
            const entry = lineup.bySlot[slot]
            const canEdit = !lineup.gamesActive && !lineup.locked && !lineup.saving
            const bonus = entry ? bonusBySlotNumber[entry.slotNumber] : undefined
            const noEffect = entry?.card.edition === 'standard'
            return (
              <div key={slot} style={{ width: 116, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: '#94a3b8', display: 'flex', gap: 4 }}>
                  {slot}{slot === FLEX_SLOT && <span style={{ color: '#fbbf24' }}>◇</span>}
                </div>

                {entry ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{ cursor: canEdit ? 'pointer' : 'default' }}
                         onClick={() => canEdit && setPickerSlot(slot)}
                         title={canEdit ? 'Change card' : undefined}>
                      <TradingCard card={entry.card} size="xs" noHoverLift />
                    </div>
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
                    <div style={{ fontSize: 22, color: '#94a3b8', lineHeight: 1 }}>+</div>
                    <div style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94a3b8', marginTop: 6 }}>Add {slot}</div>
                  </button>
                )}

                <ScoreLine weekFP={weekFPBySlot[slot]} bonus={bonus} noEffect={noEffect} />
              </div>
            )
          })}
        </div>
      )}

      {lineup.locked && (
        <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', marginTop: 12 }}>
          Lineup is locked — cards lock when games start.
        </div>
      )}
      {!lineup.hasFlex && (
        <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', marginTop: 8 }}>
          Equip an MVP card or the Accession power-up to unlock the FLEX slot.
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

const hdrK: React.CSSProperties = { fontSize: 9, letterSpacing: '.13em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }
const hdrV: React.CSSProperties = { fontSize: 14, color: '#fff', fontVariantNumeric: 'tabular-nums' }
const clearBtn: React.CSSProperties = {
  position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%',
  border: '1px solid #475569', background: '#0f172a', color: '#cbd5e1', fontSize: 12, lineHeight: 1,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 4,
}
const emptyCard: React.CSSProperties = {
  width: 105, height: 178, borderRadius: 12, border: '2px dashed #33445c', background: '#0e1622',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
}

export default Lineup
