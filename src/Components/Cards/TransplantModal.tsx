import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import TradingCard, { CardData } from './TradingCard'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// The Transplant: graft one card's effect onto another player card you own. Both cards
// must be the SAME edition and SAME position; the target keeps its identity + upgrade
// tier and takes on the donor's effect, the donor is consumed. Cost scales with edition.

interface TransplantModalProps {
  visible: boolean
  onClose: () => void
  onComplete: () => void
}

const EDITION_LABEL: Record<string, string> = {
  base: 'Metallic', holographic: 'Holographic', prismatic: 'Prismatic', diamond: 'Diamond',
}
const POS_LABEL: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K' }

const effectLabel = (c: CardData) => c.displayName || c.effectName || 'Effect'
const isEffectBearing = (c: CardData) =>
  c.edition !== 'standard' && !!c.effectName && c.effectName !== 'none' && !c.vaulted && !c.isEquipped

const TransplantModal: React.FC<TransplantModalProps> = ({ visible, onClose, onComplete }) => {
  const { getToken } = useAuth()
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState<CardData | null>(null)   // player to keep
  const [donor, setDonor] = useState<CardData | null>(null)     // effect to graft
  const [selecting, setSelecting] = useState<'target' | 'donor'>('target')
  const [cost, setCost] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CardData | null>(null)
  // Picker filter/sort controls (mirrors The Combine).
  const [query, setQuery] = useState('')
  const [posFilter, setPosFilter] = useState<number | 'all'>('all')
  const [edFilter, setEdFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortMode, setSortMode] = useState<'value_asc' | 'rating_desc' | 'rarest'>('value_asc')

  const reset = useCallback(() => {
    setTarget(null); setDonor(null); setSelecting('target')
    setCost(null); setError(''); setResult(null); setBusy(false)
    setQuery(''); setPosFilter('all'); setEdFilter('all'); setStatusFilter('all'); setSortMode('value_asc')
  }, [])

  const loadCards = useCallback(async () => {
    setLoading(true)
    const tok = await getToken()
    try {
      const res = await fetch(`${API_BASE}/cards/collection?activeOnly=false&vaulted=false`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const json = await res.json()
      setCards(json.data?.cards ?? [])
    } catch { setCards([]) }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => {
    if (visible) { reset(); loadCards() }
  }, [visible, reset, loadCards])

  // Eligible donors for the chosen target: same edition, a different effect, and an effect
  // that can validly land on the target's position (shared effects fit any position).
  const fitsTarget = (c: CardData, t: CardData) =>
    (c.validPositions ?? [c.position]).includes(t.position)
  const donorPool = useMemo(() => {
    if (!target) return []
    return cards.filter(c =>
      c.id !== target.id && isEffectBearing(c) &&
      c.edition === target.edition && fitsTarget(c, target) &&
      (c.effectName || '') !== (target.effectName || ''))
  }, [cards, target])

  const targetPool = useMemo(() =>
    cards.filter(c => isEffectBearing(c) && c.id !== donor?.id),
    [cards, donor])

  // Fetch cost once both are chosen.
  useEffect(() => {
    if (!target || !donor) { setCost(null); return }
    let cancelled = false
    ;(async () => {
      const tok = await getToken()
      try {
        const res = await fetch(`${API_BASE}/cards/transplant/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify({ donorCardId: donor.id, targetCardId: target.id }),
        })
        const json = await res.json()
        if (cancelled) return
        if (res.ok) { setCost(json.data?.cost ?? 0); setError('') }
        else { setError(json.detail || 'Invalid pairing'); setCost(null) }
      } catch { if (!cancelled) setError('Could not price the transplant') }
    })()
    return () => { cancelled = true }
  }, [target, donor, getToken])

  const pick = (c: CardData) => {
    if (selecting === 'target') {
      setTarget(c)
      // If the current donor no longer fits the new target, clear it.
      if (donor && (donor.edition !== c.edition || !fitsTarget(donor, c) || donor.id === c.id)) setDonor(null)
      setSelecting('donor')
    } else {
      setDonor(c)
    }
  }

  const confirm = async () => {
    if (!target || !donor) return
    setBusy(true); setError('')
    const tok = await getToken()
    try {
      const res = await fetch(`${API_BASE}/cards/transplant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ donorCardId: donor.id, targetCardId: target.id }),
      })
      const json = await res.json()
      if (res.ok) { setResult(json.data as CardData); onComplete() }
      else setError(json.detail || 'Transplant failed')
    } catch { setError('Transplant failed') }
    finally { setBusy(false) }
  }

  if (!visible) return null

  const pool = selecting === 'target' ? targetPool : donorPool
  const accent = '#a78bfa'

  // Apply the picker's filter + sort controls to the current pool.
  const cardVal = (c: CardData) => c.combineValue || c.sellValue || 0
  const editionRank: Record<string, number> = { diamond: 0, prismatic: 1, holographic: 2, base: 3, standard: 4 }
  const q = query.trim().toLowerCase()
  const shown = pool
    .filter(c => !q || c.playerName.toLowerCase().includes(q) || (c.displayName || '').toLowerCase().includes(q) || (c.effectName || '').toLowerCase().includes(q))
    .filter(c => posFilter === 'all' || c.position === posFilter)
    .filter(c => edFilter === 'all' || c.edition === edFilter)
    .filter(c => statusFilter === 'all' || (statusFilter === 'active' ? c.isActive : !c.isActive))
    .sort((a, b) => {
      if (sortMode === 'rating_desc') return b.playerRating - a.playerRating
      if (sortMode === 'rarest') {
        const ea = editionRank[a.edition] ?? 9, eb = editionRank[b.edition] ?? 9
        return ea !== eb ? ea - eb : b.playerRating - a.playerRating
      }
      const va = cardVal(a), vb = cardVal(b)
      return va !== vb ? va - vb : a.playerRating - b.playerRating
    })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.02em' }}>The Transplant</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Move an effect onto the player card you want. Same edition; position-specific effects only fit their own position.</div>
          </div>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        {result ? (
          /* ── Success ── */
          <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, overflowY: 'auto' }}>
            <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 700 }}>Transplant complete</div>
            <TradingCard card={result} size="md" noHoverLift />
            <div style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center' }}>
              <b style={{ color: '#e2e8f0' }}>{result.playerName}</b> now runs <b style={{ color: accent }}>{effectLabel(result)}</b>.
            </div>
            <button onClick={onClose} style={{ ...primaryBtn, background: '#334155' }}>Done</button>
          </div>
        ) : (
          <>
            {/* Slots */}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, padding: '14px 18px', flexShrink: 0 }}>
              <Slot label="Player to keep" active={selecting === 'target'} card={target}
                    sub={target ? `${POS_LABEL[target.position]} · ${EDITION_LABEL[target.edition] || target.edition}` : 'Its effect gets replaced'}
                    onClick={() => setSelecting('target')} />
              <div style={{ alignSelf: 'center', color: accent, fontSize: 20, fontWeight: 800 }}>←</div>
              <Slot label="Effect to graft on" active={selecting === 'donor'} card={donor} accentEffect
                    sub={donor ? effectLabel(donor) : (target ? 'Same edition' : 'Pick a keeper first')}
                    onClick={() => target && setSelecting('donor')} disabled={!target} />
            </div>

            {/* Confirm bar */}
            {target && donor && cost != null && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'rgba(167,139,250,0.08)', borderTop: '1px solid rgba(167,139,250,0.25)', borderBottom: '1px solid rgba(167,139,250,0.25)', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                  Graft <b style={{ color: accent }}>{effectLabel(donor)}</b> onto <b style={{ color: '#e2e8f0' }}>{target.playerName}</b>
                  <span style={{ color: '#94a3b8' }}> · keeps tier {target.tier ?? 1}</span>
                </div>
                <button onClick={confirm} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Working…' : `Transplant · ${cost} F`}
                </button>
              </div>
            )}
            {error && <div style={{ color: '#f87171', fontSize: 12, padding: '8px 18px', flexShrink: 0 }}>{error}</div>}

            {/* Picker header */}
            <div style={{ padding: '10px 18px 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: selecting === 'donor' ? accent : '#94a3b8', flexShrink: 0 }}>
              {selecting === 'target'
                ? 'Choose the card to keep'
                : `Choose an effect · ${target ? EDITION_LABEL[target.edition] || target.edition : ''}`}
            </div>

            {/* Filter + sort toolbar (mirrors The Combine) */}
            <div style={{ padding: '0 18px 8px', flexShrink: 0 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search player or effect..."
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', backgroundColor: '#111a2b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
              <PillRow label="Position" value={posFilter} onChange={v => setPosFilter(v as number | 'all')}
                options={[{ v: 'all', l: 'All' }, { v: 1, l: 'QB' }, { v: 2, l: 'RB' }, { v: 3, l: 'WR' }, { v: 4, l: 'TE' }, { v: 5, l: 'K' }]} />
              <PillRow label="Edition" value={edFilter} onChange={v => setEdFilter(String(v))}
                options={[{ v: 'all', l: 'All' }, { v: 'base', l: 'Metallic' }, { v: 'holographic', l: 'Holo' }, { v: 'prismatic', l: 'Prism' }, { v: 'diamond', l: 'Diamond' }]} />
              <PillRow label="Status" value={statusFilter} onChange={v => setStatusFilter(v as 'all' | 'active' | 'inactive')}
                options={[{ v: 'all', l: 'All' }, { v: 'active', l: 'Active' }, { v: 'inactive', l: 'Inactive' }]} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sort</span>
                <select value={sortMode} onChange={e => setSortMode(e.target.value as typeof sortMode)}
                  style={{ padding: '4px 8px', fontSize: 11, fontFamily: 'inherit', backgroundColor: '#111a2b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 4, cursor: 'pointer', outline: 'none' }}>
                  <option value="value_asc">Lowest value</option>
                  <option value="rating_desc">Highest rated</option>
                  <option value="rarest">Rarest first</option>
                </select>
                <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>{shown.length} of {pool.length}</span>
              </div>
            </div>

            <div style={grid}>
              {loading ? (
                <div style={{ color: '#64748b', fontSize: 12, padding: 24 }}>Loading your collection…</div>
              ) : pool.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 12, padding: 24, textAlign: 'center', width: '100%' }}>
                  {selecting === 'donor'
                    ? `No other ${target ? EDITION_LABEL[target.edition] || target.edition : ''} card with a different, compatible effect to donate.`
                    : 'No effect cards available (vaulted and equipped cards are excluded).'}
                </div>
              ) : shown.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 12, padding: 24, textAlign: 'center', width: '100%' }}>No cards match those filters.</div>
              ) : (
                shown.map(c => {
                  const sel = (selecting === 'target' ? target?.id : donor?.id) === c.id
                  return (
                    <div key={c.id} style={{ position: 'relative' }}>
                      <TradingCard card={c} size="sm" noHoverLift selected={sel} onClick={() => pick(c)} />
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const Slot: React.FC<{
  label: string; sub: string; card: CardData | null; active: boolean
  onClick: () => void; disabled?: boolean; accentEffect?: boolean
}> = ({ label, sub, card, active, onClick, disabled, accentEffect }) => (
  <button onClick={onClick} disabled={disabled}
    style={{
      flex: 1, minWidth: 0, textAlign: 'left', cursor: disabled ? 'default' : 'pointer',
      background: active ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${active ? '#a78bfa' : '#334155'}`,
      borderRadius: 8, padding: '8px 10px', opacity: disabled ? 0.5 : 1,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? '#a78bfa' : '#94a3b8' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: card ? '#e2e8f0' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {card ? card.playerName : 'Not chosen'}
    </span>
    <span style={{ fontSize: 11, color: accentEffect && card ? '#a78bfa' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
  </button>
)

const PillRow: React.FC<{
  label: string
  value: string | number
  onChange: (v: string | number) => void
  options: { v: string | number; l: string }[]
}> = ({ label, value, onChange, options }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: 56, flexShrink: 0 }}>{label}</span>
    {options.map(o => {
      const on = value === o.v
      return (
        <button key={String(o.v)} onClick={() => onChange(o.v)}
          style={{
            padding: '3px 9px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
            borderRadius: 5, border: `1px solid ${on ? '#a78bfa' : '#334155'}`,
            background: on ? 'rgba(167,139,250,0.18)' : 'transparent',
            color: on ? '#c4b5fd' : '#94a3b8', fontWeight: on ? 700 : 500,
          }}>{o.l}</button>
      )
    })}
  </div>
)

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(2,6,16,0.72)', zIndex: 9000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const panel: React.CSSProperties = {
  width: 'min(920px, 96vw)', maxHeight: '90vh', background: '#0b1220',
  border: '1px solid #1e293b', borderRadius: 14, display: 'flex', flexDirection: 'column',
  overflow: 'hidden', fontFamily: 'pressStart',
}
const grid: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 12, padding: '8px 18px 18px',
  overflowY: 'auto', justifyContent: 'center', alignContent: 'flex-start',
}
const closeBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: '1px solid #334155', background: 'transparent',
  color: '#94a3b8', fontSize: 18, cursor: 'pointer', lineHeight: 1,
}
const primaryBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.5)',
  background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff',
  fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'pressStart', flexShrink: 0,
}

export default TransplantModal
