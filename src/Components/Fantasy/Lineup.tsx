import React, { useState, useEffect, useCallback } from 'react'
import TradingCard, { CardData } from '@/Components/Cards/TradingCard'
import { useLineup, BASE_SLOTS, FLEX_SLOT, LineupSlot } from '@/hooks/useLineup'
import { useFantasySnapshot, CardBreakdownEntry } from '@/hooks/useFantasySnapshot'
import { useAuth } from '@/contexts/AuthContext'

const OUTPUT_COLORS: Record<string, string> = {
  fp: '#4ade80', mult: '#f472b6', floobits: '#eab308',
}
const SLOT_ACCEPTS: Record<string, string> = {
  QB: 'a QB', RB: 'an RB', WR1: 'a WR', WR2: 'a WR', TE: 'a TE', K: 'a K', FLEX: 'any position',
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

      {pickerSlot && (
        <CardPicker
          slot={pickerSlot}
          fetchCandidates={lineup.fetchCandidates}
          equippedPlayerIds={new Set(Object.values(lineup.bySlot).filter(Boolean).map(e => e!.playerId))}
          equippedEffects={new Set(Object.values(lineup.bySlot).filter(Boolean)
            .map(e => e!.card.effectName).filter((n): n is string => !!n && n !== 'none'))}
          onSelect={async (cardId) => { const ok = await lineup.equip(pickerSlot, cardId); if (ok) setPickerSlot(null) }}
          onClose={() => setPickerSlot(null)}
        />
      )}
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

// ── Position-filtered card picker modal ──
const CardPicker: React.FC<{
  slot: LineupSlot
  fetchCandidates: (slot: LineupSlot) => Promise<CardData[]>
  equippedPlayerIds: Set<number>
  equippedEffects: Set<string>
  onSelect: (cardId: number) => void
  onClose: () => void
}> = ({ slot, fetchCandidates, equippedPlayerIds, equippedEffects, onSelect, onClose }) => {
  const [cards, setCards] = useState<CardData[] | null>(null)

  const load = useCallback(async () => { setCards(await fetchCandidates(slot)) }, [fetchCandidates, slot])
  useEffect(() => { load() }, [load])

  // A card is un-pickable if its player is already fielded or its effect is already used.
  const ineligible = (c: CardData): string | null => {
    if (equippedPlayerIds.has(c.playerId)) return 'Player already in your lineup'
    if (c.effectName && c.effectName !== 'none' && equippedEffects.has(c.effectName)) return 'Effect already equipped'
    return null
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(3,7,13,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0d1420', border: '1px solid #233149', borderRadius: 14, padding: 18,
        maxWidth: 900, maxHeight: '86vh', overflow: 'auto', fontFamily: 'pressStart',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
            Fill {slot} <span style={{ color: '#64748b', fontWeight: 600 }}>· {SLOT_ACCEPTS[slot]}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        {cards === null ? (
          <div style={{ color: '#64748b', fontSize: 12, padding: 24, textAlign: 'center' }}>Loading cards…</div>
        ) : cards.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 12, padding: 24, textAlign: 'center' }}>
            You don't own any eligible cards for this slot yet. Open a pack to find one.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {cards.map(c => {
              const blocked = ineligible(c)
              return (
                <div key={c.id} style={{ opacity: blocked ? 0.4 : 1, position: 'relative' }}
                     title={blocked || 'Equip'}>
                  <div style={{ cursor: blocked ? 'not-allowed' : 'pointer' }}
                       onClick={() => !blocked && onSelect(c.id)}>
                    <TradingCard card={c} size="xs" noHoverLift />
                  </div>
                  {blocked && (
                    <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, fontSize: 7.5,
                      textAlign: 'center', color: '#f87171', background: 'rgba(3,7,13,0.85)', borderRadius: 4, padding: '2px 3px' }}>
                      {blocked}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Lineup
