import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import TradingCard, { CardData } from './TradingCard'
import CardPickerModal from './CardPickerModal'
import HoverTooltip from '@/Components/HoverTooltip'
import { useAuth } from '@/contexts/AuthContext'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useCardProjection, CardProjection, projectionPillStyle } from '@/hooks/useCardProjection'
import { createAvatar } from '@dicebear/core'
import { openPeeps } from '@dicebear/collection'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Inject match glow pulse animation once
if (typeof document !== 'undefined' && !document.getElementById('match-glow-keyframes')) {
  const style = document.createElement('style')
  style.id = 'match-glow-keyframes'
  style.textContent = `
    @keyframes matchGlowPulse {
      0%, 100% { box-shadow: 0 0 8px var(--glow-color), 0 0 18px var(--glow-color-soft); }
      50% { box-shadow: 0 0 14px var(--glow-color-bright), 0 0 28px var(--glow-color); }
    }
  `
  document.head.appendChild(style)
}

/** Convert hex color to rgba string */
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const OUTPUT_TYPE_COLORS: Record<string, string> = {
  fp: '#4ade80',       // green — FP output
  mult: '#f472b6',     // pink — FPx output
  floobits: '#eab308', // gold — floobits output
}

const EDITION_LABEL_COLORS: Record<string, string> = {
  base: '#94a3b8',
  holographic: '#c4b5fd',
  prismatic: '#f472b6',
  diamond: '#a5f3fc',
}

const EDITION_MINI: Record<string, {
  border: string; bg: string; label: string; glow?: string
}> = {
  base: { border: '#475569', bg: 'linear-gradient(135deg, #334155, #283548, #334155)', label: 'Base' },
  holographic: { border: '#a78bfa', bg: 'linear-gradient(135deg, #1e1b4b, #2e1065, #1e1b4b)', label: 'Holo', glow: 'rgba(167,139,250,0.2)' },
  prismatic: { border: '#db2777', bg: 'linear-gradient(135deg, #2e1065, #701a3e, #1e3a5f, #064e3b)', label: 'Prismatic', glow: 'rgba(219,39,119,0.25)' },
  diamond: { border: '#67e8f9', bg: 'linear-gradient(135deg, #0c4a6e, #155e75, #1e3a5f, #0e7490)', label: 'Diamond', glow: 'rgba(103,232,249,0.3)' },
}

interface EquippedSlot {
  slotNumber: number
  card: CardData
  isMatch: boolean
  locked: boolean
}

// Sample card shown during tutorial when user has no equipped cards
const MOCK_CARD: CardData = {
  id: -1,
  templateId: -1,
  playerId: -1,
  playerName: 'Grunge McBlaze',
  teamId: null,
  teamColor: '#22c55e',
  playerRating: 82,
  position: 1,
  edition: 'base',
  seasonCreated: 1,
  isRookie: false,
  effectName: 'Surplus',
  displayName: 'Surplus',
  category: 'flat',
  outputType: 'fp',
  tagline: 'Consistent flat bonus',
  detail: '+3 FP per player above 5 FP',
  tooltip: 'Adds +3 FP for each roster player that scores above 5 fantasy points this week.',
  sellValue: 10,
  isActive: true,
  acquiredAt: null,
  acquiredVia: 'tutorial',
  effectConfig: {
    displayName: 'Surplus',
    tagline: 'Consistent flat bonus',
    detail: '+3 FP per player above 5 FP',
    tooltip: 'Adds +3 FP for each roster player that scores above 5 fantasy points this week.',
    category: 'flat',
    outputType: 'fp',
  },
}

const EquippedCardSlot: React.FC<{
  slot: EquippedSlot
  slotNum: number
  canEdit: boolean
  onUnequip: (slotNum: number) => void
  compact?: boolean
  dataTour?: string
  forceFlipped?: boolean
}> = ({ slot, slotNum, canEdit, onUnequip, compact, dataTour, forceFlipped }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div data-tour={dataTour} style={{
      position: 'relative',
      transition: 'transform 0.15s',
      transform: hovered ? 'translateY(-4px)' : 'none',
    }}>
      <TradingCard
        card={slot.card}
        size={compact ? 'sm' : 'md'}
        glowColor={slot.isMatch ? (slot.card.teamColor || '#ffffff') : undefined}
        noHoverLift
        onHoverChange={setHovered}
        forceFlipped={forceFlipped}
      />

      {slot.isMatch && (
        <div style={{
          position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
          fontSize: '8px', color: '#60a5fa', fontWeight: '700',
          backgroundColor: 'rgba(96,165,250,0.20)',
          padding: '2px 5px', borderRadius: '4px',
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

/**
 * Projection pill — direct output for simple cards, descriptive status
 * for amplifiers (context-checked against the equipped hand).
 */
const ProjectionPill: React.FC<{ proj: CardProjection }> = ({ proj }) => {
  const style = projectionPillStyle(proj)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center',
          fontSize: '12px', fontWeight: 700,
          color: style.color, backgroundColor: style.bg,
          padding: '4px 10px', borderRadius: '5px',
          border: `1px solid ${style.color}55`,
          fontVariantNumeric: 'tabular-nums' as const,
          whiteSpace: 'nowrap' as const,
        }}
      >
        {style.label}
      </span>
      {style.ceiling && (
        <span style={{
          fontSize: '10px', color: style.color, opacity: 0.8,
          fontVariantNumeric: 'tabular-nums' as const,
          whiteSpace: 'nowrap' as const,
        }}>
          {style.ceiling}
        </span>
      )}
    </div>
  )
}


const CardEquipment: React.FC = () => {
  const { getToken, fantasyPlayerIds } = useAuth()
  const { event: wsEvent, connected: wsConnected } = useSeasonWebSocket()
  const { seasonState } = useFloosball()
  const wsWasConnected = useRef(false)
  const isMobile = useIsMobile()

  const [numSlots, setNumSlots] = useState(5)
  const [slots, setSlots] = useState<(EquippedSlot | null)[]>(Array(5).fill(null))
  const [loading, setLoading] = useState(true)
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [gamesActive, setGamesActive] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const [deckCards, setDeckCards] = useState<CardData[]>([])
  const [deckLoading, setDeckLoading] = useState(false)
  const deckFetchedRef = useRef(false)

  // Equipped-card projections keyed by slot. The picker modal fetches
  // its own slot-scoped candidate projections when it opens. The
  // Eligible Cards browse grid also fetches candidates (no slot target)
  // so users see per-card output / amplifier status while browsing.
  const { equipped: equippedProjection } = useCardProjection(false)
  const { candidatesByUserCardId: browseCandidates } = useCardProjection(expanded, null)
  const projectionBySlot = useMemo(() => {
    const m = new Map<number, CardProjection>()
    for (const c of equippedProjection?.cards ?? []) m.set(c.slotNumber, c)
    return m
  }, [equippedProjection])

  const isLocked = slots.some(s => s?.locked)
  const displaySlots = slots

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
      const slotCount = json.data?.hasExtraSlot ? 6 : 5
      setNumSlots(slotCount)

      const newSlots: (EquippedSlot | null)[] = Array(slotCount).fill(null)
      for (const eq of equipped) {
        if (eq.slotNumber >= 1 && eq.slotNumber <= slotCount) {
          newSlots[eq.slotNumber - 1] = eq
        }
      }
      setSlots(newSlots)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchEquipped()
  }, [fetchEquipped])

  useEffect(() => {
    if (!wsEvent) return
    if (wsEvent.event === 'week_start' || wsEvent.event === 'week_end' || wsEvent.event === 'game_start') {
      fetchEquipped()
    }
    // Only refetch on game_end when all games are done (avoid 12 refetches per round)
    if (wsEvent.event === 'game_end' && seasonState.activeGames.length === 0) {
      fetchEquipped()
    }
  }, [wsEvent, fetchEquipped, seasonState.activeGames.length])

  // Re-fetch on WS reconnect (covers missed events while tab was backgrounded)
  useEffect(() => {
    if (wsConnected) {
      if (wsWasConnected.current) {
        fetchEquipped()
      }
      wsWasConnected.current = true
    }
  }, [wsConnected, fetchEquipped])

  // Re-fetch after shop purchase (e.g. buying extra card slot)
  useEffect(() => {
    const handler = () => fetchEquipped()
    window.addEventListener('floosball:shop-purchase', handler)
    return () => window.removeEventListener('floosball:shop-purchase', handler)
  }, [fetchEquipped])

  // Re-fetch deck after equip/unequip
  const refetchDeck = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/collection?activeOnly=true`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setDeckCards(json.data?.cards ?? [])
    } catch { /* silent */ }
  }, [getToken])

  const handleEquip = async (card: CardData, slotNumber: number) => {
    const tok = await getToken()
    if (!tok) return
    setSaving(true)
    try {
      const equipCards: { slotNumber: number; userCardId: number }[] = []
      for (let i = 0; i < numSlots; i++) {
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
      await refetchDeck()
      window.dispatchEvent(new Event('cards-equipped'))
    } catch {
      alert('Failed to equip card')
    } finally {
      setSaving(false)
      setPickerSlot(null)
    }
  }

  const handleUnequip = (slotNumber: number) => {
    ;(async () => {
      const tok = await getToken()
      if (!tok) return
      setSaving(true)
      try {
        const equipCards: { slotNumber: number; userCardId: number }[] = []
        for (let i = 0; i < numSlots; i++) {
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
          await refetchDeck()
          window.dispatchEvent(new Event('cards-equipped'))
        }
      } catch {
        // silent
      } finally {
        setSaving(false)
      }
    })()
  }


  const [showMockCard, setShowMockCard] = useState(false)
  const [tourFlipped, setTourFlipped] = useState<boolean | undefined>(undefined)

  // Listen for tutorial expand request
  useEffect(() => {
    const handler = () => setExpanded(true)
    window.addEventListener('floosball:expand-cards', handler)
    return () => window.removeEventListener('floosball:expand-cards', handler)
  }, [])

  // Listen for tutorial mock-card request (shows a sample card when none equipped)
  useEffect(() => {
    const show = () => { setExpanded(true); setShowMockCard(true) }
    const hide = () => setShowMockCard(false)
    window.addEventListener('floosball:mock-card', show)
    window.addEventListener('floosball:unmock-card', hide)
    return () => {
      window.removeEventListener('floosball:mock-card', show)
      window.removeEventListener('floosball:unmock-card', hide)
    }
  }, [])

  // Listen for tutorial flip-card request
  useEffect(() => {
    const flip = () => setTourFlipped(true)
    const unflip = () => setTourFlipped(undefined)
    window.addEventListener('floosball:flip-card', flip)
    window.addEventListener('floosball:unflip-card', unflip)
    return () => {
      window.removeEventListener('floosball:flip-card', flip)
      window.removeEventListener('floosball:unflip-card', unflip)
    }
  }, [])

  // Fetch eligible deck when expanded
  useEffect(() => {
    if (!expanded || deckFetchedRef.current) return
    const fetchDeck = async () => {
      setDeckLoading(true)
      try {
        const tok = await getToken()
        if (!tok) return
        const res = await fetch(`${API_BASE}/cards/collection?activeOnly=true`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) return
        const json = await res.json()
        setDeckCards(json.data?.cards ?? [])
        deckFetchedRef.current = true
      } catch {
        // silent
      } finally {
        setDeckLoading(false)
      }
    }
    fetchDeck()
  }, [expanded, getToken])

  const equippedCardIds = displaySlots.filter(Boolean).map(s => s!.card.id)
  const canEdit = !isLocked && !saving

  // Deck cards: exclude equipped, sort by match > edition > rating
  const editionOrder: Record<string, number> = {
    diamond: 0, prismatic: 1, holographic: 2, base: 3,
  }
  const availableDeck = deckCards
    .filter(c => !equippedCardIds.includes(c.id))
    .sort((a, b) => {
      const aMatch = fantasyPlayerIds.has(a.playerId) ? 0 : 1
      const bMatch = fantasyPlayerIds.has(b.playerId) ? 0 : 1
      if (aMatch !== bMatch) return aMatch - bMatch
      const ea = editionOrder[a.edition] ?? 99
      const eb = editionOrder[b.edition] ?? 99
      if (ea !== eb) return ea - eb
      return b.playerRating - a.playerRating
    })

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
            backgroundColor: 'rgba(245,158,11,0.30)',
            padding: '3px 8px', borderRadius: '6px',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
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
          {Array.from({ length: numSlots }, (_, i) => i + 1).map(slotNum => {
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
            const avatarUri = createAvatar(openPeeps, {
              seed: slot.card.playerName,
              size: 36,
              backgroundColor: [(slot.card.teamColor || '#475569').replace('#', '')],
              backgroundType: ['solid' as const],
              maskProbability: 0,
              facialHairProbability: 40,
              accessoriesProbability: 40,
              accessories: ['glasses', 'glasses2', 'glasses3', 'glasses4', 'glasses5', 'sunglasses', 'sunglasses2'],
              headContrastColor: ['2c1b18', '4a312c', 'a55728', 'b58143', 'c93305', 'd6b370', 'cb8442', 'deb777', 'e8e1e1', '8d4a43'],
            }).toDataUri()
            return (
              <div
                key={slotNum}
                style={{
                  flex: isMobile ? '1 1 100%' : '1 1 0',
                  minWidth: isMobile ? undefined : 150,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: ed.bg,
                  border: `1.5px solid ${ed.border}`,
                  boxShadow: ed.glow ? `0 0 8px ${ed.glow}` : 'none',
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}
              >
                {/* Player avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  border: slot.isMatch
                    ? `2px solid ${hexToRgba(slot.card.teamColor || '#ffffff', 0.85)}`
                    : `1.5px solid ${ed.border}80`,
                  boxShadow: slot.isMatch
                    ? `0 0 8px ${hexToRgba(slot.card.teamColor || '#ffffff', 0.6)}, 0 0 18px ${hexToRgba(slot.card.teamColor || '#ffffff', 0.3)}`
                    : 'none',
                  animation: slot.isMatch ? 'matchGlowPulse 2.5s ease-in-out infinite' : 'none',
                  ['--glow-color' as any]: hexToRgba(slot.card.teamColor || '#ffffff', 0.6),
                  ['--glow-color-soft' as any]: hexToRgba(slot.card.teamColor || '#ffffff', 0.3),
                  ['--glow-color-bright' as any]: hexToRgba(slot.card.teamColor || '#ffffff', 0.9),
                  overflow: 'hidden',
                }}>
                  <img src={avatarUri} alt="" style={{ width: '100%', height: '100%' }} />
                </div>
                {/* Text content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Top row: edition label + match badge + unequip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', color: edLabelColor,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {ed.label}
                    </span>
                    {slot.isMatch && (
                      <span style={{
                        fontSize: '9px', color: '#60a5fa', fontWeight: '700',
                        backgroundColor: 'rgba(96,165,250,0.15)',
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
                  {/* Player name */}
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {slot.card.playerName}
                  </div>
                  {/* Effect name — hover for tooltip */}
                  {effectName && (
                    <HoverTooltip text={tooltip} color={outputColor}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: outputColor, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {effectName}
                      </div>
                    </HoverTooltip>
                  )}
                  {/* Projection chip — what this card is projected to
                      output this week based on season averages */}
                  {(() => {
                    const proj = projectionBySlot.get(slotNum)
                    if (!proj) return null
                    const style = projectionPillStyle(proj)
                    return (
                      <div style={{ marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center',
                            fontSize: '11px', fontWeight: 700,
                            color: style.color, backgroundColor: style.bg,
                            padding: '2px 7px', borderRadius: '4px',
                            fontVariantNumeric: 'tabular-nums' as const,
                            whiteSpace: 'nowrap' as const,
                          }}
                        >
                          {style.label}
                        </span>
                        {style.ceiling && (
                          <span style={{
                            fontSize: '9px', color: style.color, opacity: 0.8,
                            fontVariantNumeric: 'tabular-nums' as const,
                            whiteSpace: 'nowrap' as const,
                          }}>
                            {style.ceiling}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </div>
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
          gap: isMobile ? '12px' : '8px',
          justifyContent: 'center',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
          {(() => {
            let firstCardTagged = false
            return Array.from({ length: numSlots }, (_, i) => i + 1).map(slotNum => {
              const slot = displaySlots[slotNum - 1]

              if (slot) {
                const tourTag = !firstCardTagged ? 'fantasy-card-read' : undefined
                const flipProp = tourTag ? tourFlipped : undefined
                firstCardTagged = true
                const proj = projectionBySlot.get(slotNum)
                return (
                  <div key={slotNum} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <EquippedCardSlot
                      slot={slot}
                      slotNum={slotNum}
                      canEdit={canEdit}
                      onUnequip={handleUnequip}
                      compact
                      dataTour={tourTag}
                      forceFlipped={flipProp}
                    />
                    {proj && (
                      <ProjectionPill proj={proj} />
                    )}
                  </div>
                )
              }

              // Mock card for tutorial when no cards are equipped
              if (slotNum === 1 && showMockCard && !displaySlots.some(Boolean)) {
                return (
                  <div key={slotNum} data-tour="fantasy-card-read" style={{ position: 'relative' }}>
                    <TradingCard
                      card={MOCK_CARD}
                      size="sm"
                      noHoverLift
                      forceFlipped={tourFlipped}
                    />
                    <div style={{
                      position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)',
                      fontSize: '9px', color: '#64748b', whiteSpace: 'nowrap',
                    }}>
                      Sample Card
                    </div>
                  </div>
                )
              }

              return (
                <button
                  key={slotNum}
                  onClick={() => canEdit && setPickerSlot(slotNum)}
                  disabled={!canEdit}
                  style={{
                    width: isMobile ? '100%' : 160,
                    height: 80,
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
            })
          })()}
        </div>
      )}

      {/* Guidance text */}
      {!isLocked && !loading && (
        <div style={{
          marginTop: '10px',
          padding: '8px 14px',
          borderRadius: '10px',
          backgroundColor: 'rgba(99,102,241,0.10)',
          borderBottom: '2px solid rgba(99,102,241,0.5)',
        }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
            {gamesActive
              ? 'Games are in progress. Cards equipped now will activate next week.'
              : 'Equip your cards for this week. They will auto-lock and activate when games start.'}
          </div>
        </div>
      )}

      {/* Eligible deck — shown in expanded view */}
      {expanded && !loading && (
        <div style={{ marginTop: '14px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '10px',
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
              Eligible Cards
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '400', marginLeft: '8px' }}>
                {availableDeck.length}
              </span>
            </h4>
          </div>
          {deckLoading ? (
            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
              Loading deck...
            </div>
          ) : availableDeck.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
              No eligible cards available. Open packs in the Shop!
            </div>
          ) : (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '20px',
              justifyContent: 'center',
            }}>
              {availableDeck.map(card => {
                const isMatch = fantasyPlayerIds.has(card.playerId)
                const proj = browseCandidates.get(card.id)
                return (
                  <div key={card.id} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    transition: 'transform 0.15s ease',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
                    <div style={{ position: 'relative' }}>
                      <TradingCard card={{ ...card, isEquipped: false }} size="md" glowColor={isMatch ? (card.teamColor || '#ffffff') : undefined} staticGlow noHoverLift />
                      {isMatch && (
                        <div style={{
                          position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                          fontSize: '8px', color: '#60a5fa', fontWeight: '700',
                          backgroundColor: 'rgba(96,165,250,0.20)',
                          padding: '2px 5px', borderRadius: '4px',
                          pointerEvents: 'none',
                        }}>
                          MATCH
                        </div>
                      )}
                    </div>
                    {proj && (
                      <ProjectionPill proj={proj} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <CardPickerModal
        visible={pickerSlot !== null}
        onClose={() => setPickerSlot(null)}
        onSelect={(card) => pickerSlot && handleEquip(card, pickerSlot)}
        excludeCardIds={equippedCardIds}
        rosterPlayerIds={fantasyPlayerIds}
        targetSlot={pickerSlot}
      />
    </div>
  )
}

export default CardEquipment
