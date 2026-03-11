import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import TradingCard, { CardData } from './TradingCard'
import CardPickerModal from './CardPickerModal'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const OUTPUT_TYPE_COLORS: Record<string, string> = {
  fp: '#4ade80',       // green — FP output
  mult: '#a78bfa',     // purple — +FPx output
  xmult: '#f472b6',    // magenta — xFPx output
  floobits: '#eab308', // gold — floobits output
}

const EDITION_LABEL_COLORS: Record<string, string> = {
  base: '#94a3b8',
  chrome: '#f59e0b',
  holographic: '#ec4899',
  gold: '#eab308',
  prismatic: '#a78bfa',
  diamond: '#22d3ee',
}

const EDITION_MINI: Record<string, {
  border: string; bg: string; label: string; glow?: string
}> = {
  base: { border: '#475569', bg: 'linear-gradient(135deg, #1e293b, #1e293b)', label: 'Base' },
  chrome: { border: '#a1a1aa', bg: 'linear-gradient(135deg, #27272a, #3f3f46, #27272a)', label: 'Chrome', glow: 'rgba(161,161,170,0.2)' },
  holographic: { border: '#a78bfa', bg: 'linear-gradient(135deg, #1e1b4b, #312e81, #1e3a5f)', label: 'Holo', glow: 'rgba(167,139,250,0.25)' },
  gold: { border: '#eab308', bg: 'linear-gradient(135deg, #422006, #713f12, #422006)', label: 'Gold', glow: 'rgba(234,179,8,0.2)' },
  prismatic: { border: '#f472b6', bg: 'linear-gradient(135deg, #4c1d95, #831843, #1e3a5f)', label: 'Prismatic', glow: 'rgba(244,114,182,0.25)' },
  diamond: { border: '#67e8f9', bg: 'linear-gradient(135deg, #164e63, #1e1b4b, #831843, #164e63)', label: 'Diamond', glow: 'rgba(103,232,249,0.3)' },
}

interface EquippedSlot {
  slotNumber: number
  card: CardData
  isMatch: boolean
  locked: boolean
}

const HoverTooltip: React.FC<{ text: string; color?: string; children: React.ReactNode }> = ({ text, color = '#94a3b8', children }) => {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  const handleEnter = () => {
    if (!ref.current || !text) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShow(true)
  }

  return (
    <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} style={{ cursor: text ? 'help' : undefined }}>
      {children}
      {show && text && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', left: pos.x, top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#0f172a', border: `1px solid ${color}40`,
          borderRadius: '8px', padding: '8px 12px',
          fontSize: '10px', color: '#e2e8f0', lineHeight: '1.5',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 10010,
          pointerEvents: 'none', fontFamily: 'pressStart',
          maxWidth: '280px', textAlign: 'center',
        }}>
          {text}
        </div>,
        document.body
      )}
    </div>
  )
}

const EquippedCardSlot: React.FC<{
  slot: EquippedSlot
  slotNum: number
  canEdit: boolean
  onUnequip: (slotNum: number) => void
}> = ({ slot, slotNum, canEdit, onUnequip }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{
      position: 'relative',
      transition: 'transform 0.15s',
      transform: hovered ? 'translateY(-4px)' : 'none',
    }}>
      <TradingCard
        card={slot.card}
        size="sm"
        glowColor={slot.isMatch ? '#22c55e' : undefined}
        noHoverLift
        onHoverChange={setHovered}
      />

      {slot.isMatch && (
        <div style={{
          position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
          fontSize: '8px', color: '#22c55e', fontWeight: '700',
          backgroundColor: 'rgba(34,197,94,0.15)',
          padding: '2px 5px', borderRadius: '4px',
          border: '1px solid rgba(34,197,94,0.3)',
          pointerEvents: 'none',
        }}>
          MATCH
        </div>
      )}

      {canEdit && (
        <button
          onClick={() => onUnequip(slotNum)}
          style={{
            position: 'absolute', top: -6, right: -6,
            width: '22px', height: '22px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: '2px solid #1e293b',
            color: '#fff', fontSize: '11px', fontWeight: '700',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
        >
          x
        </button>
      )}
    </div>
  )
}

const CardEquipment: React.FC = () => {
  const { getToken, fantasyPlayerIds } = useAuth()
  const { event: wsEvent } = useSeasonWebSocket()
  const isMobile = useIsMobile()

  const rosterLocked = fantasyPlayerIds.size > 0

  const NUM_SLOTS = 5
  const [slots, setSlots] = useState<(EquippedSlot | null)[]>(Array(NUM_SLOTS).fill(null))
  const [loading, setLoading] = useState(true)
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [gamesActive, setGamesActive] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Draft mode: when games are active and cards aren't locked yet,
  // changes are local-only until the user confirms
  const [draftSlots, setDraftSlots] = useState<(EquippedSlot | null)[] | null>(null)
  const isLocked = slots.some(s => s?.locked)
  const isDraftMode = gamesActive && !isLocked
  const displaySlots = isDraftMode && draftSlots ? draftSlots : slots
  const hasDraftChanges = isDraftMode && draftSlots !== null

  const fetchEquipped = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/equipped`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      const equipped: EquippedSlot[] = json.data?.equippedCards ?? []
      setGamesActive(json.data?.gamesActive ?? false)

      const newSlots: (EquippedSlot | null)[] = Array(NUM_SLOTS).fill(null)
      for (const eq of equipped) {
        if (eq.slotNumber >= 1 && eq.slotNumber <= NUM_SLOTS) {
          newSlots[eq.slotNumber - 1] = eq
        }
      }
      setSlots(newSlots)
      setDraftSlots(null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    if (rosterLocked) fetchEquipped()
    else setLoading(false)
  }, [rosterLocked, fetchEquipped])

  useEffect(() => {
    if (!wsEvent) return
    if (wsEvent.event === 'week_start' || wsEvent.event === 'week_end' || wsEvent.event === 'game_start') {
      fetchEquipped()
    }
  }, [wsEvent, fetchEquipped])

  const handleEquip = async (card: CardData, slotNumber: number) => {
    if (isDraftMode) {
      // Draft mode: update local state only
      const base = draftSlots ?? [...slots]
      const newDraft = [...base]
      newDraft[slotNumber - 1] = {
        slotNumber,
        card,
        isMatch: fantasyPlayerIds.has(card.playerId),
        locked: false,
      }
      setDraftSlots(newDraft)
      setPickerSlot(null)
      return
    }

    const tok = await getToken()
    if (!tok) return
    setSaving(true)
    try {
      const equipCards: { slotNumber: number; userCardId: number }[] = []
      for (let i = 0; i < NUM_SLOTS; i++) {
        const sn = i + 1
        if (sn === slotNumber) {
          equipCards.push({ slotNumber: sn, userCardId: card.id })
        } else if (slots[i]) {
          equipCards.push({ slotNumber: sn, userCardId: slots[i]!.card.id })
        }
      }

      const res = await fetch(`${API_BASE}/cards/equipped`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ cards: equipCards }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to equip card' }))
        alert(err.detail || 'Failed to equip card')
        return
      }
      await fetchEquipped()
      window.dispatchEvent(new Event('cards-equipped'))
    } catch {
      alert('Failed to equip card')
    } finally {
      setSaving(false)
      setPickerSlot(null)
    }
  }

  const handleUnequip = (slotNumber: number) => {
    if (isDraftMode) {
      const base = draftSlots ?? [...slots]
      const newDraft = [...base]
      newDraft[slotNumber - 1] = null
      setDraftSlots(newDraft)
      return
    }

    // Normal mode: send to server
    ;(async () => {
      const tok = await getToken()
      if (!tok) return
      setSaving(true)
      try {
        const equipCards: { slotNumber: number; userCardId: number }[] = []
        for (let i = 0; i < NUM_SLOTS; i++) {
          const sn = i + 1
          if (sn !== slotNumber && slots[i]) {
            equipCards.push({ slotNumber: sn, userCardId: slots[i]!.card.id })
          }
        }

        const res = await fetch(`${API_BASE}/cards/equipped`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify({ cards: equipCards }),
        })
        if (res.ok) {
          await fetchEquipped()
          window.dispatchEvent(new Event('cards-equipped'))
        }
      } catch {
        // silent
      } finally {
        setSaving(false)
      }
    })()
  }

  const handleConfirmLock = async () => {
    const tok = await getToken()
    if (!tok) return
    setSaving(true)
    try {
      const slotsToSend = draftSlots ?? slots
      const equipCards: { slotNumber: number; userCardId: number }[] = []
      for (let i = 0; i < NUM_SLOTS; i++) {
        const slot = slotsToSend[i]
        if (slot) {
          equipCards.push({ slotNumber: i + 1, userCardId: slot.card.id })
        }
      }

      const res = await fetch(`${API_BASE}/cards/equipped?confirm=true`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ cards: equipCards }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to lock cards' }))
        alert(err.detail || 'Failed to lock cards')
        return
      }
      await fetchEquipped()
      window.dispatchEvent(new Event('cards-locked'))
    } catch {
      alert('Failed to lock cards')
    } finally {
      setSaving(false)
    }
  }

  if (!rosterLocked) return null

  const equippedCardIds = displaySlots.filter(Boolean).map(s => s!.card.id)
  const canEdit = !isLocked && !saving

  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderRadius: '14px',
      border: '1px solid #334155',
      padding: isMobile ? '12px' : '14px 16px',
    }}>
      {/* Header — clickable to toggle collapse */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: expanded || loading ? '10px' : '0px',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '16px', color: '#94a3b8', fontFamily: 'monospace', width: '18px', textAlign: 'center', lineHeight: 1 }}>{expanded ? '\u2212' : '+'}</span>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
          Card Slots
        </h3>
        {isLocked && (
          <span style={{
            fontSize: '10px', fontWeight: '700', color: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.15)',
            padding: '3px 8px', borderRadius: '6px',
            border: '1px solid rgba(245,158,11,0.3)',
          }}>
            LOCKED
          </span>
        )}
      </div>

      {/* Collapsed mini-cards */}
      {!expanded && !loading && (
        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'center',
          flexWrap: 'wrap', marginTop: '8px',
        }}>
          {Array.from({ length: NUM_SLOTS }, (_, i) => i + 1).map(slotNum => {
            const slot = displaySlots[slotNum - 1]
            if (!slot) {
              return (
                <button
                  key={slotNum}
                  onClick={(e) => { e.stopPropagation(); canEdit && setPickerSlot(slotNum) }}
                  disabled={!canEdit}
                  style={{
                    width: isMobile ? '100%' : 160, height: 50,
                    borderRadius: '8px',
                    border: '2px dashed #334155', backgroundColor: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#64748b', fontSize: '18px', fontFamily: 'pressStart',
                    cursor: canEdit ? 'pointer' : 'not-allowed',
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  +
                </button>
              )
            }
            const edition = slot.card.edition || 'base'
            const ed = EDITION_MINI[edition] ?? EDITION_MINI.base
            const edLabelColor = EDITION_LABEL_COLORS[edition] ?? '#94a3b8'
            const effectName = slot.card.displayName || slot.card.effectConfig?.displayName || ''
            const tooltip = slot.card.tooltip || slot.card.effectConfig?.tooltip || ''
            const outputType = slot.card.outputType || slot.card.effectConfig?.outputType || ''
            const outputColor = OUTPUT_TYPE_COLORS[outputType] || '#94a3b8'
            return (
              <div
                key={slotNum}
                style={{
                  flex: isMobile ? '1 1 100%' : '1 1 0',
                  minWidth: isMobile ? undefined : 150,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: ed.bg,
                  border: slot.isMatch
                    ? `1.5px solid #22c55e`
                    : `1.5px solid ${ed.border}`,
                  boxShadow: slot.isMatch
                    ? '0 0 8px rgba(34,197,94,0.25)'
                    : ed.glow ? `0 0 8px ${ed.glow}` : 'none',
                  position: 'relative',
                }}
              >
                {/* Top row: edition label + match badge + unequip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: '700', color: edLabelColor,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {ed.label}
                  </span>
                  {slot.isMatch && (
                    <span style={{
                      fontSize: '9px', color: '#22c55e', fontWeight: '700',
                      backgroundColor: 'rgba(34,197,94,0.15)',
                      padding: '1px 5px', borderRadius: '3px',
                    }}>MATCH</span>
                  )}
                  {canEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnequip(slotNum) }}
                      style={{
                        marginLeft: 'auto', border: 'none', background: 'none',
                        color: '#ef4444', fontSize: '11px', fontWeight: '700',
                        cursor: 'pointer', padding: 0, fontFamily: 'pressStart', lineHeight: 1,
                      }}
                    >x</button>
                  )}
                </div>
                {/* Player name — tinted by card category */}
                <div style={{ fontSize: '13px', fontWeight: '600', color: outputColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {slot.card.playerName}
                </div>
                {/* Effect name — hover for tooltip */}
                {effectName && (
                  <HoverTooltip text={tooltip} color={outputColor}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: outputColor, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {effectName}
                    </div>
                  </HoverTooltip>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Card slots — full view (expanded only) */}
      {!expanded ? null : loading ? (
        <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
          Loading card slots...
        </div>
      ) : (
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
          {Array.from({ length: NUM_SLOTS }, (_, i) => i + 1).map(slotNum => {
            const slot = displaySlots[slotNum - 1]

            if (slot) {
              return (
                <EquippedCardSlot
                  key={slotNum}
                  slot={slot}
                  slotNum={slotNum}
                  canEdit={canEdit}
                  onUnequip={handleUnequip}
                />
              )
            }

            return (
              <button
                key={slotNum}
                onClick={() => canEdit && setPickerSlot(slotNum)}
                disabled={!canEdit}
                style={{
                  width: isMobile ? '100%' : 160, height: 80,
                  borderRadius: '10px',
                  border: '2px dashed #334155',
                  backgroundColor: 'rgba(30,41,59,0.5)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '4px',
                  cursor: !canEdit ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  fontFamily: 'pressStart',
                  opacity: isLocked ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: '24px', color: '#64748b' }}>+</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Slot {slotNum}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Draft mode confirmation banner */}
      {isDraftMode && !loading && (
        <div style={{
          marginTop: '10px',
          padding: '8px 14px',
          borderRadius: '10px',
          backgroundColor: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', lineHeight: 1.5 }}>
            Games are active. Cards will be locked until next week once confirmed.
          </div>
          <button
            onClick={handleConfirmLock}
            disabled={saving || !displaySlots.some(Boolean)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: saving ? '#64748b' : '#f59e0b',
              color: '#0f172a',
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: 'pressStart',
              cursor: saving || !displaySlots.some(Boolean) ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {saving ? 'Locking...' : 'Lock Cards'}
          </button>
        </div>
      )}

      <CardPickerModal
        visible={pickerSlot !== null}
        onClose={() => setPickerSlot(null)}
        onSelect={(card) => pickerSlot && handleEquip(card, pickerSlot)}
        excludeCardIds={equippedCardIds}
        rosterPlayerIds={fantasyPlayerIds}
      />
    </div>
  )
}

export default CardEquipment
