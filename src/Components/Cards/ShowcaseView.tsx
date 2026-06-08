import React, { useState, useEffect, useCallback } from 'react'
import TradingCard, { CardData } from './TradingCard'
import ShowcasePickerModal from './ShowcasePickerModal'
import HelpButton, { HelpSection } from './HelpButton'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

interface ShowcaseSet { key: string; name: string }
interface AlmostSet { key: string; name: string; need: number; hint: string }
interface ShowcaseSlot { slotNumber: number; card: CardData | null }
interface LeaderEntry {
  rank: number
  userId: number
  username: string
  grade: string
  estimatedPayout: number
  cardCount: number
  isCurrentUser: boolean
}
interface ShowcaseData {
  slots: ShowcaseSlot[]
  slotCount: number
  maxSlots: number
  grade: string
  estimatedPayout: number
  activeSets: ShowcaseSet[]
  almostSets: AlmostSet[]
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

  useEffect(() => { fetchShowcase(); fetchLeaderboard() }, [fetchShowcase, fetchLeaderboard])

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
  const cardSize = isMobile ? 'sm' : 'md'

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
      {/* Display case — framed, lit, distinct from the plain collection grid */}
      <div style={{
        position: 'relative', borderRadius: '16px', overflow: 'hidden',
        flex: 1, minWidth: 0,
        padding: isMobile ? '22px 12px' : '32px 26px',
        background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(251,191,36,0.08), transparent 70%), linear-gradient(180deg, #141b30 0%, #0a0e1a 100%)',
        border: '1px solid rgba(251,191,36,0.22)',
        boxShadow: 'inset 0 2px 60px rgba(0,0,0,0.55), 0 12px 34px rgba(0,0,0,0.45)',
        opacity: saving ? 0.6 : 1, transition: 'opacity 0.15s',
      }}>
        {/* Compact grade header — kept slim so the cards stay in the spotlight */}
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
                fontSize: '10px', letterSpacing: '0.28em', color: 'rgba(251,191,36,0.75)',
                fontWeight: 700, textTransform: 'uppercase', fontFamily: 'pressStart',
              }}>On Display</span>
              <HelpButton title="The Showcase" accent="#fbbf24">
                <HelpSection title="Put your best on display">
                  Feature up to 8 vaulted cards. Your lineup earns a grade from F to S.
                </HelpSection>
                <HelpSection title="Get paid">
                  The grade pays Floobits at season end, then the Showcase clears for a
                  fresh start next season.
                </HelpSection>
                <HelpSection title="Build sets">
                  Group cards into named sets to raise your grade. One Club for six from
                  a team, Diamond Vault for eight Diamonds, Full Spectrum for all four
                  editions of one player, and more. The "Almost" hints show what you're
                  close to.
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
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4 }}>
              Pays <span style={{ color: GOLD, fontWeight: 700 }}>{data?.estimatedPayout ?? 0} Floobits</span> at season end
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              {data?.slotCount ?? 0}/{data?.maxSlots ?? 8} featured · resets each season
            </div>
          </div>
          <span style={{ flex: 1 }} />
          {/* Active + Almost sets, compact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '340px' }}>
            {(data?.activeSets?.length ?? 0) > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'flex-end' }}>
                {data!.activeSets.map(s => (
                  <span key={s.key} style={{
                    fontSize: '11px', color: GOLD, fontWeight: 700,
                    background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
                    borderRadius: '4px', padding: '2px 7px',
                  }}>◆ {s.name}</span>
                ))}
              </div>
            )}
            {(data?.almostSets?.length ?? 0) > 0 && data!.almostSets.map(s => (
              <span key={s.key} style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                <span style={{ color: '#64748b' }}>○</span> {s.name}
                <span style={{ color: '#64748b' }}> — {s.hint}</span>
              </span>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: isMobile ? '16px' : '22px',
          justifyContent: 'center',
        }}>
          {(data?.slots ?? []).map(slot => (
            slot.card ? (
              <div
                key={slot.slotNumber}
                style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
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
                  {hoveredSlot === slot.slotNumber && (
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
                </div>
                {/* Pedestal base */}
                <div style={{
                  position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)',
                  width: '78%', height: '10px', borderRadius: '50%', zIndex: 0,
                  background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.22), transparent 72%)',
                  filter: 'blur(3px)',
                }} />
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
                <span style={{ fontSize: '10px', letterSpacing: '0.14em' }}>FEATURE</span>
              </button>
            )
          ))}
        </div>
      </div>

      {/* Standings — everyone with a featured showcase this season */}
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
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
            No showcases yet. Be the first to put cards on display.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {leaderboard.map(entry => {
              const gc = GRADE_COLORS[entry.grade] || '#94a3b8'
              return (
                <div key={entry.userId} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px', borderRadius: '6px',
                  background: entry.isCurrentUser ? 'rgba(251,191,36,0.1)' : 'transparent',
                  border: entry.isCurrentUser ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
                }}>
                  <span style={{
                    fontSize: '11px', color: '#64748b', fontWeight: 700,
                    width: '20px', flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                  }}>{entry.rank}</span>
                  <span style={{
                    flex: 1, minWidth: 0, fontSize: '12px',
                    color: entry.isCurrentUser ? '#fbbf24' : '#cbd5e1', fontWeight: entry.isCurrentUser ? 700 : 400,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{entry.username}</span>
                  <span style={{ fontSize: '10px', color: '#64748b', flexShrink: 0 }}>{entry.cardCount}/8</span>
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
    </div>
  )
}

// Empty-slot placeholder dims, matched to the TradingCard size variants.
const SLOT_DIMS = {
  sm: { w: 160, h: 270 },
  md: { w: 200, h: 340 },
} as const

export default ShowcaseView
