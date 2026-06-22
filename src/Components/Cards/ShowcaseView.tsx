import React, { useState, useEffect, useCallback } from 'react'
import TradingCard, { CardData } from './TradingCard'
import ShowcasePickerModal from './ShowcasePickerModal'
import ShowcaseViewerModal from './ShowcaseViewerModal'
import ShowcaseResultModal from './ShowcaseResultModal'
import HelpButton, { HelpSection } from './HelpButton'
import HoverTooltip from '@/Components/HoverTooltip'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface ShowcaseSet { key: string; name: string }
interface AlmostSet { key: string; name: string; need: number; hint: string }
// Full paytable entry: every set with its live status.
interface SetEntry {
  key: string
  name: string
  req: string
  bonus: number   // flat completion bonus (e.g. 0.5 → +50%)
  status: 'active' | 'almost' | 'locked'
  need?: number         // almost/locked: cards still needed
  hint?: string         // almost: human hint
}
interface ShowcaseSlot { slotNumber: number; card: CardData | null }
interface LeaderEntry {
  rank: number
  userId: number
  username: string
  grade: string
  weeklyDividend: number
  cardCount: number
  isCurrentUser: boolean
}
interface ShowcaseData {
  slots: ShowcaseSlot[]
  slotCount: number
  maxSlots: number
  grade: string
  weeklyDividend: number
  setBonus: number     // e.g. 0.45 → sets add +45%
  maxSetBonus: number  // cap on the summed set bonus (e.g. 1.5)
  activeSets: ShowcaseSet[]
  almostSets: AlmostSet[]
  sets: SetEntry[]
  season: number
}

// Grade → color. F muted, climbing to gold at S.
const GRADE_COLORS: Record<string, string> = {
  F: '#64748b', D: '#94a3b8', C: '#60a5fa', B: '#4ade80', A: '#a78bfa', S: '#fbbf24',
}
const GOLD = '#fbbf24'

// Spotlight halo behind a featured card, tinted by edition.
const EDITION_HALO: Record<string, string> = {
  base: 'rgba(148,163,184,0.30)',
  holographic: 'rgba(167,139,250,0.42)',
  prismatic: 'rgba(244,114,182,0.48)',
  diamond: 'rgba(103,232,249,0.52)',
}

// Gold corner brackets for the empty display frames.
const Corners: React.FC = () => {
  const c = 'rgba(251,191,36,0.5)'
  const base: React.CSSProperties = { position: 'absolute', width: '13px', height: '13px' }
  return (
    <>
      <div style={{ ...base, top: 7, left: 7, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}`, borderTopLeftRadius: '4px' }} />
      <div style={{ ...base, top: 7, right: 7, borderTop: `2px solid ${c}`, borderRight: `2px solid ${c}`, borderTopRightRadius: '4px' }} />
      <div style={{ ...base, bottom: 7, left: 7, borderBottom: `2px solid ${c}`, borderLeft: `2px solid ${c}`, borderBottomLeftRadius: '4px' }} />
      <div style={{ ...base, bottom: 7, right: 7, borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}`, borderBottomRightRadius: '4px' }} />
    </>
  )
}

const ShowcaseView: React.FC = () => {
  const { getToken } = useAuth()
  const isMobile = useIsMobile()
  const [data, setData] = useState<ShowcaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [viewUserId, setViewUserId] = useState<number | null>(null)
  const [lastResult, setLastResult] = useState<{ season: number; grade: string | null; total: number; weeksPaid: number } | null>(null)

  // End-of-season recap: show once per season (localStorage-dismissed).
  const fetchLastResult = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/showcase/last-result`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      const r = json.data
      if (!r) return
      const seenKey = `showcase-result-seen-S${r.season}`
      if (localStorage.getItem(seenKey) === '1') return
      setLastResult(r)
    } catch {
      // silent
    }
  }, [getToken])

  const dismissResult = () => {
    if (lastResult) {
      try { localStorage.setItem(`showcase-result-seen-S${lastResult.season}`, '1') } catch {}
    }
    setLastResult(null)
  }

  const fetchLeaderboard = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/showcase/leaderboard`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setLeaderboard(json.data?.leaderboard ?? [])
    } catch {
      // silent
    }
  }, [getToken])

  const fetchShowcase = useCallback(async () => {
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/showcase`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setData(json.data ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => { fetchShowcase(); fetchLeaderboard(); fetchLastResult() }, [fetchShowcase, fetchLeaderboard, fetchLastResult])

  // Featured slots as a {slotNumber, userCardId} payload
  const filledPayload = (slots: ShowcaseSlot[]) =>
    slots.filter(s => s.card).map(s => ({ slotNumber: s.slotNumber, userCardId: s.card!.id }))

  const putShowcase = async (slots: { slotNumber: number; userCardId: number }[]) => {
    setSaving(true); setError('')
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API_BASE}/cards/showcase`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ slots }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.detail || 'Failed to update showcase'); return }
      setData(json.data ?? null)
      fetchLeaderboard()  // your grade/rank may have moved
    } catch {
      setError('Failed to update showcase')
    } finally {
      setSaving(false)
    }
  }

  const addCard = (slotNumber: number, card: CardData) => {
    if (!data) return
    const base = filledPayload(data.slots).filter(s => s.slotNumber !== slotNumber)
    putShowcase([...base, { slotNumber, userCardId: card.id }])
    setPickerSlot(null)
  }

  const removeCard = (slotNumber: number) => {
    if (!data) return
    putShowcase(filledPayload(data.slots).filter(s => s.slotNumber !== slotNumber))
  }

  const featuredIds = new Set((data?.slots ?? []).filter(s => s.card).map(s => s.card!.id))
  const gradeColor = GRADE_COLORS[data?.grade ?? 'F'] || '#94a3b8'
  // Smaller cards so 4 fit across alongside the standings panel.
  const cardSize = 'sm' as const

  if (loading) {
    return <div style={{ color: '#64748b', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>Loading showcase...</div>
  }

  return (
    <div>
      {error && (
        <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>{error}</p>
      )}

      <div style={{
        display: 'flex', gap: '16px', alignItems: 'flex-start',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
      {/* Display case: framed, lit, distinct from the plain collection grid */}
      <div style={{
        position: 'relative', borderRadius: '16px', overflow: 'hidden',
        flex: 1, minWidth: 0,
        padding: isMobile ? '22px 12px' : '32px 26px',
        background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(251,191,36,0.08), transparent 70%), linear-gradient(180deg, #141b30 0%, #0a0e1a 100%)',
        border: '1px solid rgba(251,191,36,0.22)',
        boxShadow: 'inset 0 2px 60px rgba(0,0,0,0.55), 0 12px 34px rgba(0,0,0,0.45)',
        opacity: saving ? 0.6 : 1, transition: 'opacity 0.15s',
      }}>
        {/* Compact grade header, kept slim so the cards stay in the spotlight */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
          marginBottom: '18px', paddingBottom: '14px',
          borderBottom: '1px solid rgba(251,191,36,0.18)',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle at 35% 30%, ${gradeColor}33, ${gradeColor}10)`,
            border: `2px solid ${gradeColor}`,
            fontSize: '28px', fontWeight: 800, color: gradeColor, fontFamily: 'pressStart',
            boxShadow: `0 0 16px ${gradeColor}55, inset 0 0 12px ${gradeColor}22`,
          }}>
            {data?.grade ?? 'F'}
          </div>
          <div style={{ minWidth: '180px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px',
            }}>
              <span style={{
                fontSize: '11px', letterSpacing: '0.24em', color: 'rgba(251,191,36,0.92)',
                fontWeight: 700, textTransform: 'uppercase', fontFamily: 'pressStart',
              }}>On Display</span>
              <HelpButton title="The Showcase" accent="#fbbf24">
                <HelpSection title="Put your best on display">
                  Feature up to 8 vaulted cards. Your lineup earns a grade from F to S.
                </HelpSection>
                <HelpSection title="Get paid every week">
                  Your Showcase pays a Floobit dividend every week of the regular
                  season, scaled by its score. A better display pays more. Build it up
                  early and it pays all season; the Showcase clears for a fresh start
                  next season.
                </HelpSection>
                <HelpSection title="See the math">
                  Hover any featured card for its breakdown: edition, classification,
                  recency, and upgrade tier all feed its share of the weekly dividend.
                </HelpSection>
                <HelpSection title="Build sets">
                  Group cards into named sets to raise your dividend. One Club for six
                  from a team, Diamond Vault for eight Diamonds, Full Spectrum for all
                  four editions of one player, and more. The "Almost" hints show what
                  you're close to.
                </HelpSection>
                <HelpSection title="Newer pays more">
                  Recent cards are worth more than old ones, so a fresh Showcase scores
                  best. Upgraded cards score higher too.
                </HelpSection>
                <HelpSection title="Vault first">
                  Only vaulted cards can be featured. Vault a card, then add it here.
                </HelpSection>
              </HelpButton>
            </div>
            <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.45 }}>
              Pays <span style={{ color: GOLD, fontWeight: 700 }}>{data?.weeklyDividend ?? 0} Floobits</span> / week
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
              {data?.slotCount ?? 0}/{data?.maxSlots ?? 8} featured
              {(data?.setBonus ?? 0) > 0 && (
                <span style={{ color: GOLD, fontWeight: 600 }}> · sets +{Math.round((data?.setBonus ?? 0) * 100)}%</span>
              )}
              <span> · resets each season</span>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, max-content)' : 'repeat(4, max-content)',
          gap: isMobile ? '16px' : '18px',
          justifyContent: 'center', justifyItems: 'center',
        }}>
          {(data?.slots ?? []).map(slot => (
            slot.card ? (
              <div
                key={slot.slotNumber}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
                onMouseEnter={() => setHoveredSlot(slot.slotNumber)}
                onMouseLeave={() => setHoveredSlot(s => (s === slot.slotNumber ? null : s))}
              >
                {/* Spotlight halo (edition-tinted) */}
                <div style={{
                  position: 'absolute', inset: '-14px', borderRadius: '24px', zIndex: 0,
                  background: `radial-gradient(ellipse at 50% 40%, ${EDITION_HALO[slot.card.edition] || EDITION_HALO.base}, transparent 70%)`,
                  filter: 'blur(12px)', pointerEvents: 'none',
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <TradingCard card={slot.card} size={cardSize} />
                  {(hoveredSlot === slot.slotNumber || isMobile) && (
                    <button
                      onClick={() => removeCard(slot.slotNumber)}
                      aria-label="Remove from showcase"
                      style={{
                        position: 'absolute', top: '6px', right: '6px', zIndex: 6,
                        width: '22px', height: '22px', borderRadius: '5px',
                        border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(15,23,42,0.85)',
                        color: '#ef4444', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                      }}
                    >x</button>
                  )}
                  {/* Pedestal base */}
                  <div style={{
                    position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)',
                    width: '78%', height: '10px', borderRadius: '50%', zIndex: 0,
                    background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.22), transparent 72%)',
                    filter: 'blur(3px)',
                  }} />
                </div>
                {/* Per-card weekly dividend + hover breakdown (transparency) */}
                {slot.card.showcase && <CardDividend showcase={slot.card.showcase} />}
              </div>
            ) : (
              <button
                key={slot.slotNumber}
                onClick={() => setPickerSlot(slot.slotNumber)}
                style={{
                  position: 'relative',
                  width: SLOT_DIMS[cardSize].w, height: SLOT_DIMS[cardSize].h,
                  borderRadius: '12px', border: '1px solid rgba(251,191,36,0.18)',
                  background: 'linear-gradient(180deg, rgba(251,191,36,0.05), rgba(10,14,26,0.4))',
                  cursor: 'pointer', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '12px', color: 'rgba(251,191,36,0.6)', fontFamily: 'pressStart',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.5)'; e.currentTarget.style.color = GOLD; e.currentTarget.style.background = 'linear-gradient(180deg, rgba(251,191,36,0.1), rgba(10,14,26,0.4))' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.18)'; e.currentTarget.style.color = 'rgba(251,191,36,0.6)'; e.currentTarget.style.background = 'linear-gradient(180deg, rgba(251,191,36,0.05), rgba(10,14,26,0.4))' }}
              >
                <Corners />
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  border: '1px solid rgba(251,191,36,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <span style={{ fontSize: '11px', letterSpacing: '0.14em' }}>FEATURE</span>
              </button>
            )
          ))}
        </div>
      </div>

      {/* Sets: a vertical list placed on the LEFT on desktop (CSS order), opposite
          the standings, so it isn't buried under the case and easy to miss. */}
      {data && (
        <SetsColumn sets={data.sets} setBonus={data.setBonus} maxSetBonus={data.maxSetBonus} isMobile={isMobile} />
      )}

      {/* Standings: everyone with a featured showcase this season */}
      <aside style={{
        width: isMobile ? '100%' : '270px', flexShrink: 0,
        borderRadius: '12px', border: '1px solid #1e293b',
        background: 'rgba(15,23,42,0.5)', padding: '14px 16px',
      }}>
        <div style={{
          fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase',
          color: '#94a3b8', fontWeight: 700, fontFamily: 'pressStart', marginBottom: '12px',
        }}>Standings</div>
        {leaderboard.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
            No showcases yet. Be the first to put cards on display.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {leaderboard.map(entry => {
              const gc = GRADE_COLORS[entry.grade] || '#94a3b8'
              return (
                <div key={entry.userId}
                  onClick={() => setViewUserId(entry.userId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                    background: entry.isCurrentUser ? 'rgba(251,191,36,0.1)' : 'transparent',
                    border: entry.isCurrentUser ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (!entry.isCurrentUser) e.currentTarget.style.background = 'rgba(148,163,184,0.08)' }}
                  onMouseLeave={(e) => { if (!entry.isCurrentUser) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    fontSize: '12px', color: '#94a3b8', fontWeight: 700,
                    width: '20px', flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                  }}>{entry.rank}</span>
                  <span style={{
                    flex: 1, minWidth: 0, fontSize: '13px',
                    color: entry.isCurrentUser ? '#fbbf24' : '#e2e8f0', fontWeight: entry.isCurrentUser ? 700 : 400,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{entry.username}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>{entry.cardCount}/8</span>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${gc}`, color: gc,
                    fontSize: '12px', fontWeight: 800, fontFamily: 'pressStart',
                  }}>{entry.grade}</span>
                </div>
              )
            })}
          </div>
        )}
      </aside>
      </div>

      <ShowcasePickerModal
        open={pickerSlot !== null}
        excludeIds={featuredIds}
        onClose={() => setPickerSlot(null)}
        onPick={(card) => { if (pickerSlot !== null) addCard(pickerSlot, card) }}
      />

      <ShowcaseViewerModal userId={viewUserId} onClose={() => setViewUserId(null)} />

      <ShowcaseResultModal result={lastResult} onClose={dismissResult} />
    </div>
  )
}

// Per-card weekly-dividend pill with a hover breakdown. Makes the scoring
// transparent: edition + classification points, scaled by recency and upgrade
// tier, then this card's Floobit share of the showcase's weekly dividend.
interface CardShowcaseBreakdown {
  editionPoints: number
  classificationPoints: number
  recency: number
  tierMult: number
  points: number
  dividend: number
}
const CardDividend: React.FC<{ showcase: CardShowcaseBreakdown }> = ({ showcase }) => {
  const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color: '#e2e8f0' }}>{value}</span>
    </div>
  )
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', minWidth: '160px' }}>
      <Row label="Edition" value={`+${showcase.editionPoints}`} />
      {showcase.classificationPoints > 0 && (
        <Row label="Classification" value={`+${showcase.classificationPoints}`} />
      )}
      <Row label="Recency" value={`×${showcase.recency.toFixed(2)}`} />
      {showcase.tierMult > 1 && <Row label="Upgrade tier" value={`×${showcase.tierMult.toFixed(2)}`} />}
      <div style={{ height: '1px', background: 'rgba(251,191,36,0.25)', margin: '3px 0' }} />
      <Row label="Pays" value={`${showcase.dividend} F / week`} />
    </div>
  )
  return (
    <HoverTooltip content={content} color="#fbbf24">
      <span style={{
        fontSize: '11px', fontWeight: 700, color: GOLD, fontFamily: 'pressStart',
        background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
        borderRadius: '5px', padding: '3px 9px', whiteSpace: 'nowrap',
      }}>+{showcase.dividend}/wk</span>
    </HoverTooltip>
  )
}

// The sets list: every "hand", its requirement, and the flat bonus it pays.
// Rendered as a vertical sidebar to the LEFT of the case (desktop). Active sets glow
// gold, almost-sets show what they still need, locked sets sit muted. Sorted active,
// then almost, then locked.
const SetsColumn: React.FC<{ sets: SetEntry[]; setBonus: number; maxSetBonus: number; isMobile: boolean }> = ({ sets, setBonus, maxSetBonus, isMobile }) => {
  const order = { active: 0, almost: 1, locked: 2 }
  const sorted = [...sets].sort((a, b) => order[a.status] - order[b.status] || b.bonus - a.bonus)
  const capped = setBonus >= maxSetBonus
  return (
    <aside style={{
      order: isMobile ? 0 : -1,
      width: isMobile ? '100%' : '252px', flexShrink: 0,
      borderRadius: '12px', border: '1px solid #1e293b',
      background: 'rgba(15,23,42,0.5)', padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase',
          color: '#cbd5e1', fontWeight: 700, fontFamily: 'pressStart',
        }}>Sets</span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: '13px', fontWeight: 800, fontFamily: 'pressStart',
          color: setBonus > 0 ? GOLD : '#94a3b8',
        }}>{setBonus > 0 ? `+${Math.round(setBonus * 100)}%` : 'none'}</span>
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '12px' }}>
        Group featured cards into sets for a flat bonus on top of your dividend.
        {capped && <span style={{ color: '#cbd5e1' }}> Maxed at +{Math.round(maxSetBonus * 100)}%.</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {sorted.map(s => {
          const active = s.status === 'active'
          const almost = s.status === 'almost'
          const accent = active ? GOLD : almost ? '#94a3b8' : '#475569'
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '9px 11px', borderRadius: '8px',
              background: active ? 'rgba(251,191,36,0.10)' : 'rgba(148,163,184,0.05)',
              border: `1px solid ${active ? 'rgba(251,191,36,0.35)' : '#23304a'}`,
              opacity: s.status === 'locked' ? 0.85 : 1,
            }}>
              {/* Status marker */}
              <span style={{
                width: '13px', height: '13px', borderRadius: '50%', flexShrink: 0, marginTop: '3px',
                border: `2px solid ${accent}`, background: active ? accent : 'transparent',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{
                    flex: 1, fontSize: '13px', fontWeight: 700,
                    color: active ? GOLD : s.status === 'locked' ? '#94a3b8' : '#e2e8f0',
                  }}>{s.name}</span>
                  <span style={{
                    fontSize: '13px', fontWeight: 800, fontFamily: 'pressStart', flexShrink: 0,
                    color: active ? GOLD : '#94a3b8',
                  }}>+{Math.round(s.bonus * 100)}%</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>{s.req}</div>
                {active && (
                  <div style={{ fontSize: '11px', color: GOLD, fontWeight: 600, marginTop: '3px' }}>Active</div>
                )}
                {almost && (
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>{s.hint}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

// Empty-slot placeholder dims, matched to the TradingCard size variants.
const SLOT_DIMS = {
  sm: { w: 160, h: 270 },
  md: { w: 200, h: 340 },
} as const

export default ShowcaseView
