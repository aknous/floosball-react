import React, { useState, useEffect, useMemo } from 'react'
import ReactDOM from 'react-dom'
import TradingCard, { CardData } from './TradingCard'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { TIER_STYLES, CandidateProjection, formatProjectionOutput, formatProjectionOdds, formatRangeLabel, rangeSourceHint } from '@/hooks/useCardProjection'
import HoverTooltip from '@/Components/HoverTooltip'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Position code → label
const POSITION_LABELS: Record<number, string> = {
  1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K',
}
type PositionFilter = 'all' | 1 | 2 | 3 | 4 | 5
type EditionFilter = 'all' | 'base' | 'holographic' | 'prismatic' | 'diamond'
type SortMode = 'match' | 'rating' | 'edition'

const EDITION_ORDER: Record<string, number> = {
  diamond: 0, prismatic: 1, holographic: 2, base: 3,
}
const EDITION_LABELS: Record<EditionFilter, string> = {
  all: 'All',
  base: 'Base',
  holographic: 'Holo',
  prismatic: 'Prism',
  diamond: 'Diamond',
}

const PickerCard: React.FC<{
  card: CardData
  isMatch: boolean
  onSelect: (card: CardData) => void
  projection?: CandidateProjection
}> = ({ card, isMatch, onSelect, projection }) => {
  const [hovered, setHovered] = useState(false)
  const tierCfg = projection ? TIER_STYLES[projection.tier] : null
  const isNullified = projection?.tier === 'nullified'
  const hasOdds = !!projection?.odds && !isNullified
  const hasRange = !!projection?.range && !isNullified && !hasOdds
  const projLabel = projection && tierCfg
    ? (isNullified
        ? tierCfg.label
        : hasOdds
          ? formatProjectionOdds(projection.odds!)
          : hasRange
            ? formatRangeLabel(projection.range!)
            : formatProjectionOutput(projection))
    : null
  const projHint = hasRange && projection ? rangeSourceHint(projection.range!) : ''
  const projTooltip = projection && tierCfg
    ? (projHint ? `${tierCfg.label} — ${projHint}` : tierCfg.label)
    : undefined
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
        transition: 'transform 0.15s',
        transform: hovered ? 'translateY(-4px)' : 'none',
      }}
    >
      <div style={{
        position: 'relative',
        borderRadius: '14px',
        boxShadow: isMatch ? '0 0 0 2px #60a5fa, 0 0 12px rgba(96,165,250,0.3)' : 'none',
      }}>
        <TradingCard
          card={card}
          size="sm"
          noHoverLift
          onHoverChange={setHovered}
        />
        {isMatch && (
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
      </div>
      {/* Projection effectiveness chip — placed between card and equip
          button so it's legible without fighting the card art. */}
      {projection && tierCfg && (
        <HoverTooltip text={projTooltip} color={tierCfg.color}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '10px', fontWeight: 700,
              color: tierCfg.color, backgroundColor: tierCfg.bg,
              padding: '3px 9px', borderRadius: '4px',
              border: `1px solid ${tierCfg.color}55`,
            }}
          >
            <span>{tierCfg.short}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' as const }}>{projLabel}</span>
          </span>
        </HoverTooltip>
      )}
      <button
        onClick={() => onSelect(card)}
        style={{
          backgroundColor: 'rgba(59,130,246,0.85)',
          border: '1px solid rgba(96,165,250,0.5)',
          borderRadius: '6px',
          color: '#fff', fontSize: '10px', fontWeight: '700',
          fontFamily: 'pressStart',
          padding: '5px 14px',
          cursor: 'pointer',
          transition: 'background-color 0.15s',
        }}
      >
        Equip
      </button>
    </div>
  )
}

interface CardPickerModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (card: CardData) => void
  excludeCardIds: number[]  // user_card IDs already equipped in other slots
  rosterPlayerIds: Set<number>
  candidateProjections?: Map<number, import('@/hooks/useCardProjection').CandidateProjection>
}

const CardPickerModal: React.FC<CardPickerModalProps> = ({
  visible, onClose, onSelect, excludeCardIds, rosterPlayerIds, candidateProjections,
}) => {
  const { getToken } = useAuth()
  const isMobile = useIsMobile()
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all')
  const [editionFilter, setEditionFilter] = useState<EditionFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('match')
  const [matchOnly, setMatchOnly] = useState(false)

  // Reset controls whenever the modal opens so previous filters don't stick
  useEffect(() => {
    if (visible) {
      setQuery('')
      setPositionFilter('all')
      setEditionFilter('all')
      setSortMode('match')
      setMatchOnly(false)
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    const fetchCards = async () => {
      try {
        const tok = await getToken()
        if (!tok) return
        const res = await fetch(`${API_BASE}/cards/collection?activeOnly=true`, {
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

  // Apply search + filters, then sort. useMemo so we don't recompute on
  // every render — only when one of the inputs changes.
  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase()
    let filtered = cards
    if (q) {
      filtered = filtered.filter(c =>
        c.playerName.toLowerCase().includes(q) ||
        (c.displayName || '').toLowerCase().includes(q) ||
        (c.effectName || '').toLowerCase().includes(q)
      )
    }
    if (positionFilter !== 'all') {
      filtered = filtered.filter(c => c.position === positionFilter)
    }
    if (editionFilter !== 'all') {
      filtered = filtered.filter(c => c.edition === editionFilter)
    }
    if (matchOnly) {
      filtered = filtered.filter(c => rosterPlayerIds.has(c.playerId))
    }
    const sorted = [...filtered]
    switch (sortMode) {
      case 'rating':
        sorted.sort((a, b) => b.playerRating - a.playerRating)
        break
      case 'edition':
        sorted.sort((a, b) => {
          const ea = EDITION_ORDER[a.edition] ?? 99
          const eb = EDITION_ORDER[b.edition] ?? 99
          if (ea !== eb) return ea - eb
          return b.playerRating - a.playerRating
        })
        break
      case 'match':
      default:
        sorted.sort((a, b) => {
          const aMatch = rosterPlayerIds.has(a.playerId) ? 0 : 1
          const bMatch = rosterPlayerIds.has(b.playerId) ? 0 : 1
          if (aMatch !== bMatch) return aMatch - bMatch
          const ea = EDITION_ORDER[a.edition] ?? 99
          const eb = EDITION_ORDER[b.edition] ?? 99
          if (ea !== eb) return ea - eb
          return b.playerRating - a.playerRating
        })
    }
    return sorted
  }, [cards, query, positionFilter, editionFilter, sortMode, matchOnly, rosterPlayerIds])

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

          {/* Search */}
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search player or effect..."
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '12px',
              fontFamily: 'inherit',
              backgroundColor: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '6px',
              outline: 'none',
              marginBottom: '10px',
            }}
          />

          {/* Filter pill rows */}
          <FilterRow
            label="Position"
            options={[
              { value: 'all', label: 'All' },
              { value: 1, label: 'QB' },
              { value: 2, label: 'RB' },
              { value: 3, label: 'WR' },
              { value: 4, label: 'TE' },
              { value: 5, label: 'K' },
            ]}
            value={positionFilter}
            onChange={(v) => setPositionFilter(v as PositionFilter)}
          />
          <div style={{ height: '6px' }} />
          <FilterRow
            label="Edition"
            options={(['all', 'base', 'holographic', 'prismatic', 'diamond'] as EditionFilter[]).map(e => ({
              value: e,
              label: EDITION_LABELS[e],
            }))}
            value={editionFilter}
            onChange={(v) => setEditionFilter(v as EditionFilter)}
          />

          {/* Sort + match toggle row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '10px', gap: '10px', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                Sort
              </span>
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontFamily: 'inherit',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="match">Match first</option>
                <option value="rating">Highest rated</option>
                <option value="edition">Rarest first</option>
              </select>
            </div>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', color: matchOnly ? '#60a5fa' : '#94a3b8', cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={matchOnly}
                onChange={e => setMatchOnly(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Match roster only
            </label>
          </div>
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
                return (
                  <PickerCard key={card.id} card={card} isMatch={isMatch} onSelect={onSelect} projection={candidateProjections?.get(card.id)} />
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

// Compact pill-row filter used for both Position and Edition. The active
// option gets the accent color; inactive options fade into the panel.
function FilterRow<T extends string | number>({
  label, options, value, onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{
        fontSize: '10px', color: '#94a3b8', fontWeight: 600,
        textTransform: 'uppercase' as const, letterSpacing: '0.05em',
        minWidth: '52px',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {options.map(opt => {
          const active = opt.value === value
          return (
            <button
              key={String(opt.value)}
              onClick={() => onChange(opt.value)}
              style={{
                padding: '3px 10px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'inherit',
                border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
                backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: active ? '#60a5fa' : '#94a3b8',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CardPickerModal
