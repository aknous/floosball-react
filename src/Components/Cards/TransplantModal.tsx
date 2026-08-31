import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import TradingCard, { CardData } from './TradingCard'
import { FloobitSymbol } from '@/Components/Icons/Floobit'

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
  metallic: 'Metallic', holographic: 'Holographic', prismatic: 'Prismatic', diamond: 'Diamond',
}
const POS_LABEL: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K' }

const effectLabel = (c: CardData) => c.displayName || c.effectName || 'Effect'
const isEffectBearing = (c: CardData) =>
  c.edition !== 'base' && !!c.effectName && c.effectName !== 'none' && !c.vaulted && !c.isEquipped

const TransplantModal: React.FC<TransplantModalProps> = ({ visible, onClose, onComplete }) => {
  const { getToken } = useAuth()
  const [cards, setCards] = useState<CardData[]>([])
  // ⚠️ EVERY PLAYER IS A TARGET, and there is NO RATING GATE here. `EDITION_THRESHOLDS`
  // exists to make a diamond card mean something as a collectible; a synthetic is not a
  // collectible, so any player can carry any effect. The pool is what makes "any player"
  // literal rather than "any player you happened to pull".
  const [basePool, setBasePool] = useState<CardData[]>([])
  const [components, setComponents] = useState<number | null>(null)
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
  // ⚠️ Highest rated by default (owner). "Lowest value" is the Combine's default, where you
  // are picking fuel to burn; here you are picking a player to build on, and the best one
  // is what you are looking for.
  const [sortMode, setSortMode] = useState<'value_asc' | 'rating_desc' | 'rarest'>('rating_desc')
  // Which half of the target list is showing. Donors are always cards you own.
  const [showPool, setShowPool] = useState(false)

  const reset = useCallback(() => {
    setTarget(null); setDonor(null); setSelecting('target')
    setCost(null); setError(''); setResult(null); setBusy(false)
    setQuery(''); setPosFilter('all'); setEdFilter('all'); setStatusFilter('all'); setSortMode('rating_desc')
    setShowPool(false)
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
      const [poolRes, compRes] = await Promise.all([
        fetch(`${API_BASE}/cards/base-pool`, { headers: { Authorization: `Bearer ${tok}` } }),
        fetch(`${API_BASE}/shop/synth-components`, { headers: { Authorization: `Bearer ${tok}` } }),
      ])
      if (poolRes.ok) {
        const pj = await poolRes.json()
        const raw = (pj.data?.cards ?? pj.cards ?? []) as any[]
        setBasePool(raw.map(c => ({
          id: 0, templateId: c.templateId, playerId: c.playerId,
          playerName: c.playerName, teamId: c.teamId ?? null, teamColor: null,
          playerRating: c.playerRating, position: c.position, edition: 'base',
          seasonCreated: pj.data?.season ?? pj.season ?? 0, isRookie: false,
          effectConfig: {}, effectName: 'none', sellValue: 2, isActive: true,
          fromPool: true,
        }) as CardData))
      }
      if (compRes.ok) {
        const cj = await compRes.json()
        setComponents(cj.data?.held ?? cj.held ?? 0)
      }
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
  // ⚠️ POOL CARDS ARE ALL `id: 0` — deliberately, since a pool card has no UserCard row.
  // So `id` cannot identify a card here, and using it did two visible things: every pool
  // card shared one React key, which let the base players displace the owned cards in the
  // list; and the selection test `target?.id === c.id` matched EVERY pool card at once, so
  // picking one highlighted all of them. A pool card is identified by its TEMPLATE, an
  // owned card by its id, and the prefixes stop the two id spaces colliding.
  //
  // ⚠️ DECLARED ABOVE THE MEMOS THAT USE IT. `useMemo` runs its factory immediately, so a
  // helper declared further down is still in the temporal dead zone when the first render
  // reaches it — a ReferenceError that `tsc` does not catch.
  const cardKey = (c: CardData) => (c.fromPool ? `t${c.templateId}` : `c${c.id}`)
  const sameCard = (a?: CardData | null, b?: CardData | null) =>
    !!a && !!b && cardKey(a) === cardKey(b)

  const donorPool = useMemo(() => {
    if (!target) return []
    // ⚠️ SYNTHESIS LIFTS THE SAME-EDITION RULE. That rule stops an effect being laundered
    // onto a card of a different tier — but a synthetic is minted at the DONOR EFFECT's
    // own edition, so nothing moves downhill: the effect keeps its tier, its power scale
    // and its gate, and the card keeps nothing at all. Position validity still applies.
    const synthesizing = !!target.fromPool
    return cards.filter(c =>
      !sameCard(c, target) && isEffectBearing(c) &&
      (synthesizing || c.edition === target.edition) && fitsTarget(c, target) &&
      (c.effectName || '') !== (target.effectName || ''))
  }, [cards, target])

  const targetPool = useMemo(() => {
    // ⚠️ A SYNTHETIC IS A DONOR, NEVER A TARGET. A base card takes an effect exactly
    // once; after that the pairing is fixed, or one component would buy a permanently
    // re-editable effect socket.
    // ⚠️ `sameCard`, not `id`, even though a donor is always an owned card today (a pool
    // card carries no effect, so it can never BE a donor). The invariant is one rename
    // away from being false, and this file has already been bitten by id identity twice.
    const owned = cards.filter(c => isEffectBearing(c) && !c.synthetic && !sameCard(c, donor))
    // ⚠️ TWO LISTS, NOT ONE MIXED ONE (owner). Concatenating them put 192 pool players in
    // front of the handful of cards somebody actually pulled, which is the same thing the
    // equip picker splits into tabs and for the same reason: a collection you cannot find
    // your own cards in is not a collection. They accept ANY effect, so the donor's
    // edition never restricts them either way.
    return showPool ? basePool : owned
  }, [cards, basePool, donor, showPool])

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
          body: JSON.stringify({
            donorCardId: donor.id,
            ...(target.fromPool
              ? { targetTemplateId: target.templateId }
              : { targetCardId: target.id }),
          }),
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
      if (donor && (donor.edition !== c.edition || !fitsTarget(donor, c) || sameCard(donor, c))) setDonor(null)
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
        body: JSON.stringify({
          donorCardId: donor.id,
          ...(target.fromPool
            ? { targetTemplateId: target.templateId }
            : { targetCardId: target.id }),
        }),
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
  const editionRank: Record<string, number> = { diamond: 0, prismatic: 1, holographic: 2, metallic: 3, base: 4 }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* ⚠️ The held count was FETCHED and never shown — it only ever disabled the
                build button, so a user at zero saw a dead button and no reason for it.
                This is the one place it matters, which is why it lives here rather than in
                the site header. */}
            {components != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                   title="Synthesis Components — each one builds an effect onto a player">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l7 4v8l-7 4-7-4V6l7-4z" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
                  <path d="M12 10l4 2M12 10L8 12M12 10V6" stroke={accent} strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 800, color: components > 0 ? '#e2e8f0' : '#64748b' }}>
                  {components}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#94a3b8' }}>
                  {/* ⚠️ "SYNTHESIS", not "Synth" (owner) — Chrome Components are coming,
                      so the label has to name WHICH family member it is. */}
                  {components === 1 ? 'SYNTHESIS COMPONENT' : 'SYNTHESIS COMPONENTS'}
                </span>
              </div>
            )}
            <button onClick={onClose} style={closeBtn}>×</button>
          </div>
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
                    sub={donor
                      ? effectLabel(donor)
                      : (target
                        // Synthesis accepts any edition — the effect brings its own.
                        ? (target.fromPool ? 'Any effect' : 'Same edition')
                        : 'Pick a keeper first')}
                    onClick={() => target && setSelecting('donor')} disabled={!target} />
            </div>

            {/* Confirm bar */}
            {target && donor && cost != null && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'rgba(167,139,250,0.08)', borderTop: '1px solid rgba(167,139,250,0.25)', borderBottom: '1px solid rgba(167,139,250,0.25)', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                  Graft <b style={{ color: accent }}>{effectLabel(donor)}</b> onto <b style={{ color: '#e2e8f0' }}>{target.playerName}</b>
                  <span style={{ color: '#94a3b8' }}> · keeps tier {target.tier ?? 1}</span>
                </div>
                <button
                  onClick={confirm}
                  // ⚠️ Refuse at CHOOSE time, not at the till. A user holding no
                  // components can otherwise pick a player, pick an effect, read a
                  // payable price and be rejected on the click.
                  disabled={busy || (target.fromPool && components === 0)}
                  style={{
                    ...primaryBtn,
                    opacity: busy || (target.fromPool && components === 0) ? 0.6 : 1,
                  }}>
                  {busy
                    ? 'Working…'
                    : target.fromPool
                      // ⚠️ Synthesis costs a component ON TOP of the Floobit fee, so the
                      // button has to name both or it promises a price the till refuses.
                      ? <>Build{'\u00a0·\u00a0'}<FloobitSymbol size={12} color="currentColor" />{cost} + 1 Synthesis Component</>
                      : <>Transplant{'\u00a0·\u00a0'}<FloobitSymbol size={12} color="currentColor" />{cost}</>}
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
              {/* ⚠️ TARGETS ONLY. A donor has to carry an effect, and every pool card is a
                  floor print — so offering the tab while picking a donor would offer a
                  list that is always empty. */}
              {selecting === 'target' && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {([[false, 'My Cards'], [true, 'All Players']] as [boolean, string][]).map(
                    ([val, label]) => (
                      <button
                        key={label}
                        onClick={() => setShowPool(val)}
                        style={{
                          flex: 1, padding: '9px 10px', fontSize: 13, fontWeight: 700,
                          fontFamily: 'inherit',
                          backgroundColor: showPool === val ? 'rgba(167,139,250,0.85)' : '#0f172a',
                          border: `1px solid ${showPool === val ? 'rgba(196,181,253,0.5)' : '#334155'}`,
                          color: showPool === val ? '#0f172a' : '#94a3b8',
                          borderRadius: 6, cursor: 'pointer',
                          transition: 'background-color 0.15s, color 0.15s',
                        }}
                      >{label}</button>
                    ))}
                </div>
              )}
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search player or effect..."
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', backgroundColor: '#111a2b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
              <PillRow label="Position" value={posFilter} onChange={v => setPosFilter(v as number | 'all')}
                options={[{ v: 'all', l: 'All' }, { v: 1, l: 'QB' }, { v: 2, l: 'RB' }, { v: 3, l: 'WR' }, { v: 4, l: 'TE' }, { v: 5, l: 'K' }]} />
              <PillRow label="Edition" value={edFilter} onChange={v => setEdFilter(String(v))}
                /* ⚠️ THESE VALUES WERE A RENAME BEHIND. The bottom two rungs became
                   `base` (the no-effect floor print) and `metallic` (the first real
                   effect tier), and this list still mapped the label "Metallic" onto the
                   value `base` — so filtering to Metallic asked for floor prints, which a
                   donor list cannot contain, and NOTHING mapped to the real metallic
                   edition. Base is offered on its own because the target list is full of
                   pool cards. */
                options={[{ v: 'all', l: 'All' }, { v: 'base', l: 'Base' }, { v: 'metallic', l: 'Metallic' }, { v: 'holographic', l: 'Holo' }, { v: 'prismatic', l: 'Prism' }, { v: 'diamond', l: 'Diamond' }]} />
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
                  {/* ⚠️ The target list has two halves now, and they run dry for opposite
                      reasons — one because you own nothing eligible, the other because the
                      season's pool has not been minted. One message cannot say both. */}
                  {selecting === 'donor'
                    ? `No other ${target ? EDITION_LABEL[target.edition] || target.edition : ''} card with a different, compatible effect to donate.`
                    : showPool
                      ? 'No players available in the base pool this season.'
                      : 'No effect cards you own are eligible (vaulted and equipped cards are excluded).'}
                </div>
              ) : shown.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 12, padding: 24, textAlign: 'center', width: '100%' }}>No cards match those filters.</div>
              ) : (
                shown.map(c => {
                  const sel = sameCard(selecting === 'target' ? target : donor, c)
                  return (
                    <div key={cardKey(c)} style={{ position: 'relative' }}>
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
