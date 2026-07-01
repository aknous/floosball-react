import React, { useState, useEffect, useMemo } from 'react'
import ReactDOM from 'react-dom'
import TradingCard, { CardData } from './TradingCard'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CandidateProjection, projectionPillStyle, useCardProjection } from '@/hooks/useCardProjection'
import {
  CardFilterState, defaultCardFilterState, applyCardFilters, CardFilterControls,
} from './cardFilters'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const PickerCard: React.FC<{
  card: CardData
  isMatch: boolean
  // Effect is already equipped in another slot — only one of each effect
  // can be equipped at a time, so this card can't be picked.
  isDuplicateEffect?: boolean
  onSelect: (card: CardData) => void
  projection?: CandidateProjection
}> = ({ card, isMatch, isDuplicateEffect, onSelect, projection }) => {
  const [hovered, setHovered] = useState(false)
  const style = projection ? projectionPillStyle(projection) : null
  const disabled = !!isDuplicateEffect
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
        transition: 'transform 0.15s',
        transform: hovered && !disabled ? 'translateY(-4px)' : 'none',
      }}
    >
      <div style={{
        position: 'relative',
        borderRadius: '14px',
        boxShadow: isMatch && !disabled ? '0 0 0 2px #60a5fa, 0 0 12px rgba(96,165,250,0.3)' : 'none',
      }}>
        {/* Apply the disabled wash to JUST the card art so the
            EQUIPPED ELSEWHERE badge stays fully vivid on top. */}
        <div style={{
          opacity: disabled ? 0.4 : 1,
          filter: disabled ? 'grayscale(0.7)' : 'none',
          transition: 'opacity 0.15s, filter 0.15s',
        }}>
          <TradingCard
            card={card}
            size="sm"
            noHoverLift
            onHoverChange={disabled ? () => {} : setHovered}
          />
        </div>
        {isMatch && !disabled && (
          <div style={{
            position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
            fontSize: '9px', color: '#60a5fa', fontWeight: '700',
            backgroundColor: 'rgba(96,165,250,0.15)',
            padding: '2px 5px', borderRadius: '4px',
            border: '1px solid rgba(96,165,250,0.3)',
            zIndex: 1,
          }}>
            MATCH
          </div>
        )}
        {disabled && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '12px', color: '#0f172a', fontWeight: '800',
            backgroundColor: '#fbbf24',
            padding: '6px 12px', borderRadius: '6px',
            border: '2px solid #f59e0b',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5), 0 0 0 4px rgba(251,191,36,0.25)',
            zIndex: 2, whiteSpace: 'nowrap' as const,
            letterSpacing: '0.5px',
            textTransform: 'uppercase' as const,
            pointerEvents: 'none' as const,
          }}>
            Equipped Elsewhere
          </div>
        )}
      </div>
      {/* Projection effectiveness chip — placed between card and equip
          button so it's legible without fighting the card art. */}
      {projection && style && (
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
      )}
      <button
        onClick={() => !disabled && onSelect(card)}
        disabled={disabled}
        title={disabled ? "This effect is already equipped in another slot" : undefined}
        style={{
          backgroundColor: disabled ? '#1e293b' : 'rgba(59,130,246,0.85)',
          border: `1px solid ${disabled ? '#334155' : 'rgba(96,165,250,0.5)'}`,
          borderRadius: '6px',
          color: disabled ? '#64748b' : '#fff',
          fontSize: '10px', fontWeight: '700',
          fontFamily: 'pressStart',
          padding: '5px 14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s',
        }}
      >
        {disabled ? 'In use' : 'Equip'}
      </button>
    </div>
  )
}

interface CardPickerModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (card: CardData) => void
  excludeCardIds: number[]  // user_card IDs already equipped in other slots
  // effectNames already equipped in OTHER slots. Cards with these
  // effectNames stay visible in the picker but render as "EQUIPPED
  // ELSEWHERE" + disabled Equip button, so the no-duplicate rule is
  // visible at choose-time instead of via a 400 on save.
  excludeEffectNames?: string[]
  rosterPlayerIds: Set<number>
  // Slot the picker is scoped to. Candidate projections are computed
  // as if each card replaced whatever currently occupies this slot —
  // so FPx chain changes, chance-synergy changes, and straight-swap
  // deltas all land accurately.
  targetSlot?: number | null
}

const CardPickerModal: React.FC<CardPickerModalProps> = ({
  visible, onClose, onSelect, excludeCardIds, excludeEffectNames, rosterPlayerIds, targetSlot,
}) => {
  const excludedEffectSet = useMemo(
    () => new Set(excludeEffectNames ?? []),
    [excludeEffectNames],
  )
  const { getToken } = useAuth()
  // Only fetch candidate projections while the modal is actually open.
  const { candidatesByUserCardId } = useCardProjection(visible, visible ? (targetSlot ?? null) : null)
  const isMobile = useIsMobile()
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<CardFilterState>(defaultCardFilterState)
  const patchFilters = (patch: Partial<CardFilterState>) => setFilters(f => ({ ...f, ...patch }))

  // Reset controls whenever the modal opens so previous filters don't stick
  useEffect(() => {
    if (visible) setFilters(defaultCardFilterState)
  }, [visible])

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    const fetchCards = async () => {
      try {
        const tok = await getToken()
        if (!tok) return
        const res = await fetch(`${API_BASE}/cards/collection?activeOnly=true&vaulted=false`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) return
        const json = await res.json()
        const all: CardData[] = json.data?.cards ?? []
        setCards(all.filter(c => !excludeCardIds.includes(c.id)))
      } catch {
        setCards([])
      } finally {
        setLoading(false)
      }
    }
    fetchCards()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, getToken, excludeCardIds.join(',')])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  // Apply search + filters, then sort (shared engine). useMemo so we only
  // recompute when the cards, filter state, or roster change.
  const displayed = useMemo(
    () => applyCardFilters(cards, filters, rosterPlayerIds),
    [cards, filters, rosterPlayerIds],
  )

  if (!visible) return null

  const totalCount = cards.length
  const matchingCount = cards.filter(c => rosterPlayerIds.has(c.playerId)).length

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '700px',
          // Fixed height so the modal doesn't jump around as filters change
          // the card count. Card grid inside handles its own scrolling.
          height: isMobile ? '92vh' : '85vh',
          backgroundColor: '#1e293b', border: '1px solid #334155',
          borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          fontFamily: 'pressStart', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #475569', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', marginBottom: '2px' }}>
                Select Card
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                {displayed.length} of {totalCount} cards
                {matchingCount > 0 && ` · ${matchingCount} match roster`}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '22px', padding: '2px 6px' }}
            >x</button>
          </div>

          {/* Shared equip-side filter bar (search + pills + sort/match toggle) */}
          <CardFilterControls state={filters} onPatch={patchFilters} />
        </div>

        {/* Card grid */}
        <div style={{ overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Loading...</div>
          ) : totalCount === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
              No active cards available. Open packs in the Shop!
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
              No cards match your filters.
            </div>
          ) : (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '12px',
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}>
              {displayed.map(card => {
                const isMatch = rosterPlayerIds.has(card.playerId)
                const isDuplicateEffect = !!card.effectName && excludedEffectSet.has(card.effectName)
                return (
                  <PickerCard
                    key={card.id} card={card} isMatch={isMatch}
                    isDuplicateEffect={isDuplicateEffect}
                    onSelect={onSelect}
                    projection={candidatesByUserCardId.get(card.id)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default CardPickerModal
