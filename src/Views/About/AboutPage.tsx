import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import TradingCard, { CardData } from '@/Components/Cards/TradingCard'

// ── Section definitions ─────────────────────────────────────────────────────

type SectionItem = { id: string; title: string }
type SectionCategory = { category: string; items: SectionItem[] }

const SECTION_GROUPS: SectionCategory[] = [
  {
    category: 'Floosball',
    items: [
      { id: 'what-is-floosball', title: 'What is Floosball?' },
    ],
  },
  {
    category: 'The Simulation',
    items: [
      { id: 'how-to-watch', title: 'How to Watch' },
      { id: 'play-indicators', title: 'Play Indicators' },
      { id: 'game-badges', title: 'Game Badges' },
      { id: 'season-schedule', title: 'Season Schedule' },
      { id: 'prognosticate', title: 'Prognosticate' },
      { id: 'team-funding', title: 'Facilities' },
    ],
  },
  {
    category: 'Fantasy Floosball',
    items: [
      { id: 'fantasy', title: 'Fantasy' },
      { id: 'trading-cards', title: 'Trading Cards' },
      { id: 'card-effects', title: 'Card Effects' },
      { id: 'card-equipment', title: 'Card Equipment' },
      { id: 'card-packs', title: 'Card Packs' },
      { id: 'the-combine', title: 'The Combine' },
      { id: 'card-upgrades', title: 'Card Upgrades' },
      { id: 'the-vault', title: 'The Vault' },
      { id: 'the-showcase', title: 'The Showcase' },
      { id: 'floobits', title: 'Floobits' },
      { id: 'power-ups', title: 'Power-Ups' },
      { id: 'achievements', title: 'Achievements' },
    ],
  },
]

// Flat list for scroll spy
const ALL_SECTIONS = SECTION_GROUPS.flatMap(g => g.items)

// ── Shared styles ─────────────────────────────────────────────────────────

const linkStyle: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
  fontWeight: '600',
}

const textStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#cbd5e1',
  lineHeight: '1.7',
  margin: 0,
}

const indicatorRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '8px',
}

const labelStyle: React.CSSProperties = {
  ...textStyle,
  fontWeight: '600',
  color: '#e2e8f0',
  marginTop: '14px',
  marginBottom: '6px',
}

const bulletList = (items: string[]) => (
  <div style={{ paddingLeft: '8px' }}>
    {items.map((line, i) => (
      <div key={i} style={{ ...textStyle, fontSize: '13px', marginBottom: '4px', display: 'flex', gap: '6px' }}>
        <span style={{ color: '#94a3b8', flexShrink: 0 }}>-</span>
        <span>{line}</span>
      </div>
    ))}
  </div>
)

// ── Mock card data for live examples ──────────────────────────────────────

const SAMPLE_CARDS: CardData[] = [
  {
    id: 901, templateId: 901, playerId: 901, playerName: 'Rex Tillery',
    teamId: null, teamColor: '#475569', playerRating: 72, position: 1,
    edition: 'metallic', seasonCreated: 1, isRookie: false,
    displayName: 'Freebie', category: 'flat_fp', outputType: 'fp',
    tagline: 'Free real estate',
    tooltip: 'It pays to show up. Bonus FP every week just for having this card equipped.',
    detail: '+8.8 FP per week',
    sellValue: 5, isActive: true, acquiredAt: null, acquiredVia: '',
    effectConfig: { displayName: 'Freebie', tagline: 'Free real estate', detail: '+8.8 FP per week', category: 'flat_fp', outputType: 'fp' },
  },
  {
    id: 902, templateId: 902, playerId: 902, playerName: 'Dante Moreau',
    teamId: null, teamColor: '#a78bfa', playerRating: 81, position: 2,
    edition: 'holographic', seasonCreated: 1, isRookie: false,
    displayName: 'Cornucopia', category: 'multiplier', outputType: 'mult',
    tagline: 'Every touchdown compounds',
    tooltip: 'Every touchdown compounds. FPx that stacks per roster TD.',
    detail: '+0.02 FPx per roster TD',
    sellValue: 30, isActive: true, acquiredAt: null, acquiredVia: '',
    effectConfig: { displayName: 'Cornucopia', tagline: 'Every touchdown compounds', detail: '+0.02 FPx per roster TD', category: 'multiplier', outputType: 'mult' },
  },
  {
    id: 903, templateId: 903, playerId: 903, playerName: 'Jace Whitfield',
    teamId: null, teamColor: '#db2777', playerRating: 88, position: 3,
    edition: 'prismatic', seasonCreated: 1, isRookie: false,
    displayName: 'On Fire', category: 'streak', outputType: 'mult',
    tagline: 'Keep the flame alive',
    tooltip: "Don't let the flame die. FPx that grows each week your roster's K makes a FG. Resets if they don't.",
    detail: '1.03 FPx, +0.01 per consecutive FG week. Resets if no FG. Each other streak card adds +1 bonus tick',
    sellValue: 75, isActive: true, acquiredAt: null, acquiredVia: '',
    effectConfig: { displayName: 'On Fire', tagline: 'Keep the flame alive', detail: '1.03 FPx, +0.01 per consecutive FG week. Resets if no FG', category: 'streak', outputType: 'mult' },
  },
  {
    id: 904, templateId: 904, playerId: 904, playerName: 'Cole Ashford',
    teamId: null, teamColor: '#67e8f9', playerRating: 94, position: 4,
    edition: 'diamond', seasonCreated: 1, isRookie: false,
    classification: 'mvp',
    displayName: 'Providence', category: 'multiplier', outputType: 'mult',
    tagline: 'A little something extra',
    tooltip: 'Small FPx bonus plus increased odds on all chance cards in your hand.',
    detail: '1.04x FPx + 8% chance boost to all chance cards',
    sellValue: 100, isActive: true, acquiredAt: null, acquiredVia: '',
    effectConfig: { displayName: 'Providence', tagline: 'A little something extra', detail: '1.04x FPx + 8% chance boost to all chance cards', category: 'multiplier', outputType: 'mult' },
  },
]

// ── Scroll helper ─────────────────────────────────────────────────────────

/**
 * The element that actually scrolls this page.
 *
 * ⚠️ It is NOT the window. The redesigned shell owns the viewport and gives its content
 * column (`<main>`) `overflow-y: auto`, so `document.documentElement` never scrolls at
 * all — measured, `scrollHeight === innerHeight` while `main` sits at 15490 over a 919px
 * box. Every helper here was written against `window.scrollY` / `window.scrollTo` and a
 * `.fixed.w-full.top-0` header from the OLD chrome, so once this page moved into the
 * shell the whole left contents list went dead: clicking a section did nothing and the
 * highlight never left the first entry. It looked like broken navigation because it was.
 */
const scrollParent = (el: HTMLElement | null): HTMLElement | null => {
  let p = el?.parentElement ?? null
  while (p) {
    const oy = getComputedStyle(p).overflowY
    if (/(auto|scroll)/.test(oy) && p.scrollHeight > p.clientHeight + 4) return p
    p = p.parentElement
  }
  return null
}

/** Breathing room above a section once it lands at the top of the scroller. */
const SCROLL_PAD = 16

const scrollToSection = (id: string) => {
  const el = document.getElementById(id)
  if (!el) return
  const scroller = scrollParent(el)
  if (scroller) {
    const top = el.getBoundingClientRect().top
      - scroller.getBoundingClientRect().top
      + scroller.scrollTop - SCROLL_PAD
    scroller.scrollTo({ top, behavior: 'smooth' })
    return
  }
  // Standalone (no shell): the document scrolls after all.
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - SCROLL_PAD, behavior: 'smooth' })
}

// ── Section component (always open, with anchor ID) ───────────────────────

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <div
    id={id}
    style={{
      backgroundColor: '#1e293b',
      borderRadius: '8px',
      border: '1px solid #334155',
      marginBottom: '16px',
      overflow: 'hidden',
    }}
  >
    <div style={{ padding: '16px 20px 0' }}>
      <span style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0' }}>
        {title}
      </span>
    </div>
    <div style={{ padding: '12px 20px 20px' }}>
      {children}
    </div>
  </div>
)

// ── Desktop sidebar ───────────────────────────────────────────────────────

// ⚠️ `headerHeight` is 0 inside the shell — there is no fixed header above the scroller
// any more, so sticking 64px down just left a gap at the top of the list.
const DocSidebar: React.FC<{ activeId: string; headerHeight: number }> = ({ activeId, headerHeight }) => (
  <nav style={{
    position: 'sticky',
    top: headerHeight + 16,
    alignSelf: 'flex-start',
    width: '200px',
    flexShrink: 0,
    paddingRight: '16px',
    borderRight: '1px solid #334155',
    maxHeight: `calc(100vh - ${headerHeight + 32}px)`,
    overflowY: 'auto',
  }}>
    {SECTION_GROUPS.map(group => (
      <div key={group.category} style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '700',
          color: '#94a3b8',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '4px 12px 6px',
        }}>
          {group.category}
        </div>
        {group.items.map(s => {
          const isActive = s.id === activeId
          return (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                padding: '5px 12px',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#e2e8f0' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
                fontFamily: 'inherit',
                lineHeight: '1.4',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget.style.color = '#cbd5e1') }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget.style.color = '#94a3b8') }}
            >
              {s.title}
            </button>
          )
        })}
      </div>
    ))}
  </nav>
)

// ── Mobile TOC overlay ────────────────────────────────────────────────────

const MobileTOC: React.FC<{ activeId: string }> = ({ activeId }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: '#1e293b',
          border: '1px solid #475569',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
        aria-label="Table of contents"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1001,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              borderTop: '1px solid #334155',
              borderRadius: '16px 16px 0 0',
              padding: '20px 16px',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0' }}>Contents</span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                  fontFamily: 'inherit',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {SECTION_GROUPS.map(group => (
              <div key={group.category} style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#64748b',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '6px 14px 4px',
                }}>
                  {group.category}
                </div>
                {group.items.map(s => {
                  const isActive = s.id === activeId
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setOpen(false)
                        setTimeout(() => scrollToSection(s.id), 100)
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: isActive ? '600' : '400',
                        color: isActive ? '#e2e8f0' : '#94a3b8',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {s.title}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ── Equipment slot diagram ────────────────────────────────────────────────

const EquipmentSlotDiagram: React.FC<{ isMobile: boolean }> = ({ isMobile }) => (
  <div style={{
    display: 'flex',
    gap: isMobile ? '6px' : '10px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    margin: '14px 0',
  }}>
    {[1, 2, 3, 4, 5].map(n => (
      <div key={n} style={{
        width: isMobile ? '52px' : '64px',
        height: isMobile ? '72px' : '88px',
        borderRadius: '6px',
        border: '2px dashed #475569',
        backgroundColor: 'rgba(51,65,85,0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </svg>
        <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '600' }}>SLOT {n}</span>
      </div>
    ))}
    <div style={{
      width: isMobile ? '52px' : '64px',
      height: isMobile ? '72px' : '88px',
      borderRadius: '6px',
      border: '2px dashed #3b82f6',
      backgroundColor: 'rgba(59,130,246,0.06)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      opacity: 0.5,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M12 8v8M8 12h8" />
      </svg>
      <span style={{ fontSize: '9px', color: '#3b82f6', fontWeight: '600' }}>SLOT 6</span>
    </div>
  </div>
)

// ── Roster slot visual ────────────────────────────────────────────────────

/**
 * The power bar, shown rather than described.
 *
 * ⚠️ There is NO threshold mark part-way along the track, and an earlier version of this
 * drew one. `gateFill` is `playerFP / threshold` clamped to 1, so the bar is FULL at
 * exactly the threshold — filling it IS clearing it, which is why the feature is called
 * a power bar and not a meter. Drawing a tick invented a second idea to learn.
 *
 * The inverse row is the reason this is a graphic at all: those cards compute
 * `(threshold - playerFP) / threshold`, so they start FULL and DRAIN as the player
 * scores. One rule covers both — a full bar is on, an empty one is off — and that reads
 * instantly as a picture and clumsily as a sentence.
 *
 * The chance row is here because it uses the SAME widget for a different unit: its fill
 * is the trigger probability, so a half-full chance bar is a coin flip rather than a card
 * halfway to switching on. Nothing on the card says which kind you are looking at, so the
 * guide has to.
 */
const PowerBarVisual: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const ON = '#7fd8a0'     // the same green the card itself uses for a live bar
  const OFF = '#64748b'
  const INV = '#fbbf24'

  const rows: { label: string; fill: number; color: string; state: string; note: string }[] = [
    { label: 'Quiet week', fill: 38, color: OFF, state: 'OFF',
      note: 'the bar is part full, so the effect scores nothing' },
    { label: 'Big week', fill: 100, color: ON, state: 'ON',
      note: 'filled, so the effect pays' },
    { label: 'Inverse card', fill: 62, color: INV, state: 'ON',
      note: 'a few cards start full and drain as the player scores, so they run until the bar empties' },
    { label: 'Chance card', fill: 62, color: INV, state: '62%',
      note: 'the bar is the odds, not progress. This one triggers 62 times in 100' },
  ]

  return (
    <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {rows.map(r => (
        <div key={r.label} style={{
          display: 'flex', alignItems: 'center',
          gap: isMobile ? '8px' : '12px', flexWrap: 'wrap',
        }}>
          <span style={{
            width: isMobile ? '76px' : '92px', flexShrink: 0,
            fontSize: isMobile ? '11px' : '12px', fontWeight: 700, color: '#cbd5e1',
          }}>{r.label}</span>

          <div style={{
            flex: '1 1 140px', minWidth: '120px',
            height: '12px', borderRadius: '6px',
            backgroundColor: 'rgba(51,65,85,0.55)', overflow: 'hidden',
          }}>
            <div style={{
              width: `${r.fill}%`, height: '100%',
              backgroundColor: r.color, opacity: 0.85,
            }} />
          </div>

          <span style={{
            flexShrink: 0, fontSize: isMobile ? '9px' : '10px', fontWeight: 800,
            letterSpacing: '0.08em', color: r.state === 'OFF' ? OFF : r.color,
            border: `1px solid ${r.state === 'OFF' ? OFF : r.color}`,
            borderRadius: '4px', padding: '2px 6px',
          }}>{r.state}</span>

          <span style={{
            flexBasis: isMobile ? '100%' : 'auto', flex: isMobile ? undefined : '1 1 180px',
            fontSize: isMobile ? '11px' : '12px', color: '#94a3b8', lineHeight: 1.4,
          }}>{r.note}</span>
        </div>
      ))}
    </div>
  )
}

const RosterSlotVisual: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const slots = [
    { label: 'QB', color: '#ef4444' },
    { label: 'RB', color: '#22c55e' },
    { label: 'WR', color: '#3b82f6' },
    { label: 'WR', color: '#3b82f6' },
    { label: 'TE', color: '#f97316' },
    { label: 'K', color: '#a78bfa' },
  ]
  return (
    <div style={{
      display: 'flex',
      gap: isMobile ? '4px' : '8px',
      justifyContent: 'center',
      flexWrap: 'wrap',
      margin: '14px 0',
    }}>
      {slots.map((s, i) => (
        <div key={i} style={{
          width: isMobile ? '42px' : '52px',
          height: isMobile ? '42px' : '52px',
          borderRadius: '8px',
          border: `2px solid ${s.color}`,
          backgroundColor: `${s.color}10`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: '700', color: s.color }}>{s.label}</span>
        </div>
      ))}
      <div style={{
        width: isMobile ? '42px' : '52px',
        height: isMobile ? '42px' : '52px',
        borderRadius: '8px',
        border: '2px dashed #eab308',
        backgroundColor: 'rgba(234,179,8,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5,
      }}>
        <span style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '700', color: '#eab308' }}>FLEX</span>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

const AboutPage: React.FC = () => {
  const isMobile = useIsMobile()
  const [activeSection, setActiveSection] = useState(ALL_SECTIONS[0].id)
  const [headerHeight] = useState(0)
  const rafRef = useRef(0)

  /**
   * Which section the reader is looking at.
   *
   * ⚠️ Listens on the SCROLLER, not the window — see `scrollParent`. On the window it
   * never fired once, so the contents list highlighted its first entry and stayed there
   * however far down the page you were.
   *
   * The section is compared against the scroller's own top edge rather than the
   * viewport's, since inside the shell those are different lines.
   */
  useEffect(() => {
    const first = document.getElementById(ALL_SECTIONS[0].id)
    const scroller = scrollParent(first)
    const target: HTMLElement | Window = scroller ?? window

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const base = scroller ? scroller.getBoundingClientRect().top : 0
        const offset = base + SCROLL_PAD + 8
        let currentId = ALL_SECTIONS[0].id
        for (const s of ALL_SECTIONS) {
          const el = document.getElementById(s.id)
          if (el && el.getBoundingClientRect().top <= offset) currentId = s.id
        }
        setActiveSection(currentId)
      })
    }

    target.addEventListener('scroll', onScroll, { passive: true } as any)
    onScroll()
    return () => {
      target.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>
      <div style={{
        display: 'flex',
        maxWidth: isMobile ? undefined : '960px',
        margin: '0 auto',
        padding: isMobile ? '24px 16px' : '40px 24px',
        gap: '24px',
      }}>
        {/* Sidebar (desktop only) */}
        {!isMobile && <DocSidebar activeId={activeSection} headerHeight={headerHeight} />}

        {/* Main content */}
        <div style={{ flex: 1, maxWidth: '720px', minWidth: 0 }}>
          <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>
            About Floosball
          </h1>

          {/* Beta notice */}
          <div style={{
            padding: '14px 18px',
            marginBottom: '32px',
            borderRadius: '8px',
            backgroundColor: 'rgba(245,158,11,0.10)',
            borderBottom: '2px solid rgba(245,158,11,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                fontSize: '10px', fontWeight: '700', color: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.30)', padding: '2px 6px',
                borderRadius: '4px', letterSpacing: '0.5px',
              }}>
                {/* ⚠️ Not CLOSED BETA. The allowlist gate is off and anyone can sign
                    up, so "closed" told a reader who had just walked in that they
                    were not supposed to be here. */}
                BETA
              </span>
            </div>
            <p style={{ ...textStyle, fontSize: '13px' }}>
              Welcome to the Floosball beta. The simulation is under active development,
              so features may change, balancing will be adjusted, and new systems will be added
              throughout the beta period. Season data (fantasy points, cards, floobits) may
              occasionally be reset as we fix bugs and improve the game. If you run into any
              issues or have feedback, join the{' '}
              <a
                href="https://discord.gg/b4DZn3mVfP"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}
              >Discord server</a>.
            </p>
          </div>

          {/* What is Floosball? */}
          <Section id="what-is-floosball" title="What is Floosball?">
            <p style={textStyle}>
              Floosball is a procedurally generated football simulation. Every team, player, coach, and game is
              generated from scratch with no real-world data. The engine runs full seasons with regular season
              weeks, playoffs, and a championship game (the Floos Bowl). Players have unique attributes that
              affect gameplay, coaches have distinct tendencies, and every play unfolds based on probabilities
              influenced by matchups, pressure, and game situation.
            </p>
          </Section>

          {/* How to Watch */}
          <Section id="how-to-watch" title="How to Watch">
            <p style={textStyle}>
              The <Link to="/games" style={linkStyle}>Game Board</Link> is where a slate lives. Every game
              gets a card with a live score, and the board orders them by how interesting they are right
              now rather than by kickoff time, so the close one is near the top. Click a card to open that
              game.
            </p>

            <p style={labelStyle}>The Game Page</p>
            <p style={textStyle}>
              A game is its own page, in three columns. On the left, the scoreboard, field position and win
              probability. In the middle, the play feed with Box Score and Player Stats beside it. On the
              right, the Bleachers: who else is watching, what they are shouting, and the players and
              coaches reacting on the sideline.
            </p>
            <p style={textStyle}>
              A finished game keeps its box score and player stats. It does not keep its play feed, field
              graphic or win-probability chart, so those disappear once a game is final.
            </p>

            <p style={{ ...labelStyle, fontSize: '13px', marginTop: '12px' }}>Left Column</p>
            <p style={{ ...textStyle, marginBottom: '6px' }}>
              The scoreboard shows each team's avatar, city, name, record, ELO rating, score, and remaining
              timeouts. During live games, a white ring appears around the avatar of the team with possession,
              and a flame icon appears next to a team's name when they have strong momentum.
            </p>
            <p style={{ ...textStyle, marginBottom: '6px' }}>
              Below the scoreboard is the current game status: quarter, clock, down and distance, and yard line.
            </p>
            <p style={{ ...textStyle, marginBottom: '8px' }}>
              The field visualization is an overhead view of the field showing the ball position, first down
              marker, and the trajectory of the last play. Runs show as solid lines, passes as curved arcs,
              and punts/field goals as high arcs. The line turns red on turnovers and gold on touchdowns.
            </p>

            {/* ── Field Position Mockup ── */}
            <div style={{ margin: '4px 0 14px', borderRadius: '4px', overflow: 'hidden' }}>
              <svg viewBox="0 0 600 160" width="100%" style={{ display: 'block', borderRadius: '4px' }}>
                {/* End zones */}
                <rect x="0" y="0" width="50" height="160" fill="#3b82f6" opacity={0.4} />
                <rect x="550" y="0" width="50" height="160" fill="#ef4444" opacity={0.4} />
                {/* Field */}
                <rect x="50" y="0" width="500" height="160" fill="#1e4620" />
                {/* Yard lines */}
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <line key={n} x1={50 + n * 50} y1="0" x2={50 + n * 50} y2="160"
                    stroke="rgba(255,255,255,0.18)" strokeWidth={n === 5 ? 1.5 : 0.75} />
                ))}
                {/* Yard numbers */}
                {[10,20,30,40,50,40,30,20,10].map((num, i) => (
                  <text key={i} x={100 + i * 50} y="132" textAnchor="middle"
                    fontSize="10" fill="rgba(255,255,255,0.28)" fontFamily="inherit">
                    {num}
                  </text>
                ))}
                {/* End zone labels */}
                <text x="25" y="85" textAnchor="middle" fontSize="10" fontWeight="700" fill="#3b82f6" opacity={0.9} fontFamily="inherit">HOM</text>
                <text x="575" y="85" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ef4444" opacity={0.9} fontFamily="inherit">AWY</text>
                {/* First down marker */}
                <line x1="350" y1="0" x2="350" y2="160" stroke="#FFD700" strokeWidth={1.5} opacity={0.7} strokeDasharray="3,2" />
                {/* Pass arc trajectory */}
                <path d="M 280 80 Q 320 30 370 80" fill="none" stroke="#60a5fa" strokeWidth={2.5} opacity={0.8} strokeDasharray="7,3" />
                {/* Arrowhead */}
                <polygon points="370,74 370,86 379,80" fill="#60a5fa" opacity={0.85} />
                {/* Ball halo */}
                <circle cx="370" cy="80" r="10" fill="#3b82f6" opacity={0.2} />
                {/* Ball */}
                <ellipse cx="370" cy="80" rx="7" ry="4.5" fill="#7B4F2E" stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                <line x1="367" y1="80" x2="373" y2="80" stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
              </svg>
              <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Example: 18-yard pass completion to the AWY 38
              </div>
            </div>

            <p style={{ ...textStyle, marginBottom: '8px' }}>
              The win probability chart tracks each team's odds of winning over the course of the game. The
              line color changes based on which team is favored. Quarter boundaries are marked with vertical
              dividers.
            </p>

            {/* ── Win Probability Mockup ── */}
            <div style={{ margin: '4px 0 14px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#0f172a', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '5px', left: '6px', fontSize: '11px', fontWeight: '700', color: '#fff', background: '#3b82f6', padding: '1px 5px', borderRadius: '3px', zIndex: 1 }}>
                HOM 72%
              </div>
              <div style={{ position: 'absolute', bottom: '21px', left: '6px', fontSize: '11px', fontWeight: '700', color: '#fff', background: '#ef4444', padding: '1px 5px', borderRadius: '3px', zIndex: 1 }}>
                AWY 28%
              </div>
              <svg viewBox="0 0 800 140" preserveAspectRatio="none" width="100%" height="100px" style={{ display: 'block' }}>
                {/* Home/away halves */}
                <rect x="0" y="0" width="800" height="70" fill="#3b82f6" fillOpacity={0.15} />
                <rect x="0" y="70" width="800" height="70" fill="#ef4444" fillOpacity={0.15} />
                {/* Quarter dividers */}
                {[200, 400, 600].map(x => (
                  <line key={x} x1={x} y1="0" x2={x} y2="140" stroke="#1e293b" strokeWidth={2.5} />
                ))}
                {/* 50% line */}
                <line x1="0" y1="70" x2="800" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="6,4" />
                {/* Shadow */}
                <polyline
                  points="0,70 50,65 100,58 150,62 200,50 250,42 300,55 350,48 400,40 450,52 500,35 550,30 600,38 650,25 700,40 750,38 800,39"
                  fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth={6} strokeLinejoin="round" strokeLinecap="round"
                />
                {/* WP line */}
                <polyline
                  points="0,70 50,65 100,58 150,62 200,50 250,42 300,55 350,48 400,40 450,52 500,35 550,30 600,38 650,25 700,40 750,38 800,39"
                  fill="none" stroke="#3b82f6" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round"
                />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-around', height: '16px', marginTop: '3px' }}>
                {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                  <span key={q} style={{ fontSize: '10px', color: '#475569' }}>{q}</span>
                ))}
              </div>
            </div>

            <p style={{ ...labelStyle, fontSize: '13px', marginTop: '12px' }}>Plays Tab</p>
            <p style={{ ...textStyle, marginBottom: '6px' }}>
              A chronological feed of every play. Toggle between All Plays and Highlights (touchdowns,
              turnovers, big plays, clutch/choke moments, momentum shifts). Each play shows the clock,
              down and distance, play description, and a color-coded result badge.
            </p>
            {bulletList([
              'Blue: first down',
              'Green: touchdown, field goal, extra point, two-point conversion, conversion ladder, sideline goal',
              'Red: fumble, interception, turnover on downs, drive clock expired, safety, bust, contest lost',
              'Orange: sack',
              'Amber: stopped on the last down, missed extra point, failed conversion, provisional score',
              'Gray: punt, missed field goal, missed sideline goal',
            ])}
            <p style={{ ...textStyle, marginTop: '6px', marginBottom: '10px' }}>
              The amber down badge follows the ACTUAL last down rather than always the fourth. Downs per
              series is a rule the Cores can change, so in a five-down game it is fifth down that turns
              amber. Several of these results only appear in alternate formats.
            </p>
            <p style={{ ...textStyle, marginTop: '6px', marginBottom: '10px' }}>
              Plays with special significance get a colored left border and label: amber for Big Plays
              (with WPA impact), cyan for Clutch Plays, red for Choke Plays, and orange for Momentum Shifts.
              Click any play with a chevron icon to expand the Play Insights panel for a detailed breakdown
              of that play.
            </p>

            {/* ── Example Play Rows ── */}
            <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #1e293b', margin: '0 0 6px' }}>
              {[
                {
                  meta: 'Q2 - 8:42',
                  down: '2nd & 7',
                  yard: 'HOM 33',
                  desc: 'D. Mercer pass complete to T. Ashford for 22 yards to the AWY 45',
                  badge: '1ST DOWN',
                  badgeColor: '#3b82f6',
                },
                {
                  meta: 'Q3 - 2:15',
                  down: '1st & 10',
                  yard: 'AWY 45',
                  desc: 'R. Beckham rushes right for 45 yards, TOUCHDOWN',
                  badge: 'TOUCHDOWN',
                  badgeColor: '#22c55e',
                  score: 'HOM 21 \u2013 14 AWY',
                  accent: { color: '#f59e0b', bg: '#1a1300', label: 'HOM +18.2%', labelColor: '#d97706' },
                },
                {
                  meta: 'Q4 - 0:48',
                  down: '3rd & 4',
                  yard: 'AWY 28',
                  desc: 'J. Prescott pass intercepted by K. Williams at the AWY 35',
                  badge: 'INT',
                  badgeColor: '#ef4444',
                  accent: { color: '#ef4444', bg: '#1a0500', label: '\u25bc CHOKE', labelColor: '#ef4444' },
                },
              ].map((play, i) => (
                <div key={i} style={{
                  borderBottom: i < 2 ? '1px solid #334155' : 'none',
                  ...(play.accent ? { boxShadow: `inset 3px 0 0 ${play.accent.color}`, backgroundColor: play.accent.bg } : {}),
                }}>
                  <div style={{ padding: '8px 10px 10px', display: 'flex', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#334155', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: '#94a3b8' }}>{play.meta}</span>
                        <span style={{ color: '#cbd5e1', fontWeight: '500' }}>{play.down}</span>
                        <span style={{ color: '#94a3b8' }}>{play.yard}</span>
                        {play.accent && (
                          <span style={{ color: play.accent.labelColor, fontWeight: '600', fontSize: '11px', marginLeft: 'auto' }}>
                            {play.accent.label}
                          </span>
                        )}
                        {!play.accent && (
                          <span style={{
                            fontSize: '10px', color: play.badgeColor, backgroundColor: `${play.badgeColor}30`,
                            padding: '1px 7px', borderRadius: '3px', fontWeight: '700', letterSpacing: '0.04em',
                            marginLeft: 'auto', whiteSpace: 'nowrap',
                          }}>
                            {play.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: play.score ? '4px' : 0 }}>
                        {play.desc}
                      </div>
                      {play.score && (
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>{play.score}</div>
                      )}
                    </div>
                    {play.accent && (
                      <span style={{
                        fontSize: '10px', color: play.badgeColor, backgroundColor: `${play.badgeColor}30`,
                        padding: '1px 7px', borderRadius: '3px', fontWeight: '700', letterSpacing: '0.04em',
                        whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: '2px',
                      }}>
                        {play.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p style={{ ...labelStyle, fontSize: '13px', marginTop: '12px' }}>Box Score Tab</p>
            <p style={{ ...textStyle, marginBottom: '4px' }}>
              A side-by-side comparison of team-level stats:
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2px 16px',
              padding: '6px 8px',
              margin: '4px 0 6px',
            }}>
              {[
                'Total Yards', 'Total Plays',
                'First Downs', '3rd Down Conversions',
                '4th Down Conversions', 'Pass Yards',
                'Completions/Attempts', 'Interceptions Thrown',
                'Rush Yards', 'Rush Carries',
                'Turnovers', 'Sacks',
              ].map(stat => (
                <span key={stat} style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' }}>
                  {stat}
                </span>
              ))}
            </div>

            <p style={{ ...labelStyle, fontSize: '13px', marginTop: '12px' }}>Stats Tab</p>
            <p style={{ ...textStyle, marginBottom: '4px' }}>
              Individual player stats grouped by position. Each player shows their star rating and
              fantasy points earned.
            </p>
            {bulletList([
              'Passing (QB): Completions/Attempts, Yards, Yards per Completion, Longest, TDs',
              'Rushing (RB): Carries, Yards, Yards per Carry, Longest, TDs',
              'Receiving (WR1, WR2, TE): Receptions, Yards, Yards per Reception, YAC, TDs',
              'Kicking (K): Field Goals Made, Attempts, Longest',
            ])}

            <p style={{ ...labelStyle, fontSize: '13px', marginTop: '12px' }}>Play Insights</p>
            <p style={{ ...textStyle, marginBottom: '6px' }}>
              Expanding a play reveals the full decision-making and execution breakdown behind that play.
              The panel has two columns: context on the left and execution on the right.
            </p>
            <p style={{ ...textStyle, fontWeight: '600', color: '#e2e8f0', fontSize: '13px', marginBottom: '4px' }}>
              Context
            </p>
            {bulletList([
              'Situation: game pressure level and current momentum balance',
              'Stratagem: the coach\'s play call, offensive gameplan (Ground Dominant to Air Raid), defensive posture (Blitz Heavy to Pass Coverage), and coaching attributes like Offensive Mind and Adaptability',
              'Fourth Down decisions (punt, field goal, or go for it) and field goal probability',
              'Clock Management decisions (kneel, spike, timeout, desperation FG) with rationale',
            ])}
            <p style={{ ...textStyle, fontWeight: '600', color: '#e2e8f0', fontSize: '13px', marginTop: '8px', marginBottom: '4px' }}>
              Execution
            </p>
            {bulletList([
              'Composure: each key player\'s mental state ranging from Locked In to Rattled, based on confidence, determination, and pressure handling',
              'Run plays: runner and TE blocking ratings, gap quality breakdown (Open/Tight/Stuffed for each gap), offensive vs defensive matchup, and fumble risk',
              'Pass plays: pass rush pressure on the QB, vision and throw quality, receiver separation, route quality, hands rating, and a probability bar showing catch/drop/incomplete/interception zones with the actual outcome roll',
              'Field goals: distance, make probability, kicker rating, and result',
            ])}

            {/* ── Play Insights Mockup ── */}
            <div style={{
              margin: '10px 0 6px',
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: isMobile ? '10px' : '10px 12px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '14px' : '24px',
            }}>
              {/* Left column: Context */}
              <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Situation */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px', paddingBottom: '3px', borderBottom: '1px solid #1e293b' }}>
                    Situation
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '80px' }}>Game Pressure</span>
                    <div style={{ width: '60px', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '72%', height: '100%', backgroundColor: '#f97316', borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#f97316', fontWeight: '500', minWidth: '50px', textAlign: 'right' }}>High</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '80px' }}>Momentum</span>
                    <div style={{ width: '60px', height: '8px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '50%', width: '35%', height: '100%', backgroundColor: '#22c55e', borderRadius: '0 3px 3px 0' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: '500', minWidth: '50px', textAlign: 'right' }}>HOM +12</span>
                  </div>
                </div>

                {/* Stratagem */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px', paddingBottom: '3px', borderBottom: '1px solid #1e293b' }}>
                    Stratagem
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Play Call</span>
                    <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>Medium Pass</span>
                  </div>
                  <div style={{ borderLeft: '2px solid #3b82f6', paddingLeft: '8px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#3b82f6', letterSpacing: '0.06em', marginBottom: '2px' }}>OFFENSE</div>
                    <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                      <span style={{ color: '#94a3b8' }}>Gameplan</span>
                      <span style={{ color: '#e2e8f0', fontWeight: '500' }}>Pass First (62% pass)</span>
                    </div>
                  </div>
                  <div style={{ borderLeft: '2px solid #ef4444', paddingLeft: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', letterSpacing: '0.06em', marginBottom: '2px' }}>DEFENSE</div>
                    <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                      <span style={{ color: '#94a3b8' }}>Posture</span>
                      <span style={{ color: '#e2e8f0', fontWeight: '500' }}>Pass Coverage</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: Execution */}
              <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Composure */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px', paddingBottom: '3px', borderBottom: '1px solid #1e293b' }}>
                    Composure
                  </div>
                  {[
                    { name: 'D. Mercer', pos: 'QB', state: 'In Rhythm', color: '#4ade80', arrow: '\u2191' },
                    { name: 'T. Ashford', pos: 'WR', state: 'Locked In', color: '#22c55e', arrow: '\u2191' },
                  ].map(p => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', backgroundColor: '#0f172a', padding: '1px 4px', borderRadius: '3px' }}>{p.pos}</span>
                      <span style={{ fontSize: '11px', color: '#cbd5e1', flex: 1 }}>{p.name}</span>
                      <span style={{ fontSize: '11px', color: p.color, fontWeight: '600', minWidth: '60px', textAlign: 'right' }}>{p.state}</span>
                      <span style={{ fontSize: '10px', color: '#4ade80' }}>{p.arrow}</span>
                    </div>
                  ))}
                </div>

                {/* Pass execution */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px', paddingBottom: '3px', borderBottom: '1px solid #1e293b' }}>
                    Pass
                  </div>
                  {[
                    { label: 'Pass Rush', value: 'Protected', color: '#22c55e' },
                    { label: 'Vision', value: 'Keen', color: '#22c55e' },
                    { label: 'Throw Quality', value: 'Sharp', color: '#22c55e' },
                    { label: 'Separation', value: 'Steady', color: '#eab308' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 0' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '80px' }}>{row.label}</span>
                      <div style={{ width: '50px', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: row.color === '#22c55e' ? '80%' : '55%', height: '100%', backgroundColor: row.color, borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: row.color, fontWeight: '500' }}>{row.value}</span>
                    </div>
                  ))}
                  {/* Probability bar */}
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Outcome</span>
                    <div style={{ display: 'flex', height: '10px', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: '8%', backgroundColor: '#ef4444' }} />
                      <div style={{ width: '52%', backgroundColor: '#22c55e' }} />
                      <div style={{ width: '12%', backgroundColor: '#eab308' }} />
                      <div style={{ width: '28%', backgroundColor: '#475569' }} />
                      {/* Outcome roll marker */}
                      <div style={{ position: 'absolute', left: '35%', top: '-2px', width: '2px', height: '14px', backgroundColor: '#fff', boxShadow: '0 0 3px rgba(0,0,0,0.5)' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
                      {[
                        { label: 'INT', color: '#ef4444' },
                        { label: 'Catch', color: '#22c55e' },
                        { label: 'Drop', color: '#eab308' },
                        { label: 'Inc', color: '#475569' },
                      ].map(z => (
                        <span key={z.label} style={{ fontSize: '10px', color: z.color, fontWeight: '500' }}>{z.label}</span>
                      ))}
                      <span style={{ fontSize: '10px', color: '#e2e8f0', fontWeight: '600', marginLeft: 'auto' }}>Catch</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ ...labelStyle, fontSize: '13px', marginTop: '12px' }}>Matchup Preview</p>
            <p style={textStyle}>
              For scheduled (upcoming) games, the modal shows a matchup preview instead of the play tabs.
              This displays season-to-date averages for both teams in a head-to-head comparison: points per
              game, points allowed, pass and rush yards (offense and defense), pass TDs, sacks, and
              interceptions.
            </p>
          </Section>

          {/* Play Indicators */}
          <Section id="play-indicators" title="Play Indicators">
            <p style={{ ...textStyle, marginBottom: '16px' }}>
              Certain plays are highlighted with visual indicators in the play-by-play and highlights feed:
            </p>
            <div style={indicatorRow}>
              <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '13px', minWidth: '110px' }}>
                BIG PLAY
              </span>
              <span style={textStyle}>
                A play that swings the game's win probability by a large margin (about 7% or more either way),
                typically a big gain, score, or turnover at a pivotal moment. It's keyed to win-probability impact
                rather than raw yardage.
              </span>
            </div>
            <div style={indicatorRow}>
              <span style={{ color: '#06b6d4', fontWeight: '600', fontSize: '13px', minWidth: '110px' }}>
                CLUTCH
              </span>
              <span style={textStyle}>
                A player delivered under high game pressure. Big throws, clutch catches, or key runs when the game is on the line.
              </span>
            </div>
            <div style={indicatorRow}>
              <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px', minWidth: '110px' }}>
                CHOKE
              </span>
              <span style={textStyle}>
                A player crumbled under pressure. Costly interceptions, dropped passes, or missed field goals in critical moments.
              </span>
            </div>
            <div style={indicatorRow}>
              <span style={{ color: '#f97316', fontWeight: '600', fontSize: '13px', minWidth: '110px' }}>
                <svg viewBox="0 0 24 24" fill="#f97316" style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'middle', marginRight: '2px' }}>
                  <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
                </svg>{' '}MOMENTUM
              </span>
              <span style={textStyle}>
                A team is on a hot streak with consecutive successful plays. Appears as a flame icon
                next to the team name on game cards and as a tag in the highlights feed. The flame glows brighter
                and more intense as the streak grows.
              </span>
            </div>
          </Section>

          {/* Game Badges */}
          <Section id="game-badges" title="Game Badges">
            <p style={{ ...textStyle, marginBottom: '16px' }}>
              Some games on the board carry a badge:
            </p>
            <div style={indicatorRow}>
              <span style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.05em', flexShrink: 0 }}>
                FEATURED
              </span>
              <span style={textStyle}>
                A marquee matchup. Either two elite teams (both with high ELO ratings) facing off, or a late-season
                playoff bubble battle between same-league teams fighting for a postseason spot.
              </span>
            </div>
            <div style={indicatorRow}>
              <span style={{ backgroundColor: '#f97316', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.05em', flexShrink: 0 }}>
                UPSET ALERT
              </span>
              <span style={textStyle}>
                A heavy underdog has taken command. Triggers from Q2 onward when a team that entered with less than
                a 35% chance of winning has flipped to a 65% or better live win probability, against a favorite that
                currently sits in a playoff spot (top half of its league).
              </span>
            </div>
          </Section>

          {/* Teams & Players */}
          {/* Season Schedule */}
          <Section id="season-schedule" title="Season Schedule">
            <p style={{ ...textStyle, marginBottom: '16px' }}>
              Each season plays out over the course of a week on a fixed real-world schedule. All game times are Eastern (adjust for your time zone).
            </p>

            {[
              { day: 'Monday \u2013 Thursday', label: 'Regular Season', desc: '28 rounds of games played across 4 days (7 rounds per day). Each round kicks off on the hour from 12 PM to 6 PM. Every team plays a mix of intra-league and inter-league matchups.' },
              { day: 'Thursday Evening', label: 'MVP Announcement', desc: 'After the final regular season round, the season MVP is announced. MVP is decided by a fan vote: players are ranked into a shortlist by a performance and win-probability value metric, and fans vote for the winner (the metric serves as the tiebreaker and fallback if too few fans vote).' },
              { day: 'Friday', label: 'Playoffs', desc: 'All playoff rounds are played on Friday: two rounds of playoff games, the league championships, and the Floos Bowl. The top 8 of each league qualify, which is the four division winners plus four wildcards. Sixteen teams is a clean bracket, so nobody gets a bye, and the field re-seeds every round rather than following a fixed ladder.' },
              { day: 'Saturday', label: 'Retirements & Free Agency', desc: 'Players with expiring contracts and aging veterans retire. Retirees become eligible for the Hall of Fame, where fans vote on inductions (with a points-based auto-induct for slam-dunk careers). Then teams sign available free agents to fill roster gaps. Draft order goes from worst record to best, with the champion picking last.' },
              { day: 'Sunday', label: 'Offseason & New Season', desc: 'Coaches train and develop their players. Players may improve, regress, or stay the same based on coaching ability. Performance ratings reset, team ratings are recalculated, and a new schedule is generated for the next season.' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '12px',
                padding: '10px 0',
                borderBottom: i < 4 ? '1px solid #334155' : 'none',
              }}>
                <div style={{ minWidth: '150px', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{item.day}</div>
                  <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>{item.label}</div>
                </div>
                <div style={{ ...textStyle, fontSize: '13px' }}>{item.desc}</div>
              </div>
            ))}
          </Section>

          {/* Prognosticate */}
          <Section id="prognosticate" title="Prognosticate">
            <p style={textStyle}>
              Prognosticate is the weekly game where you pick winners. You can set picks before kickoff or
              swap them mid-game. Each pick locks once that specific game hits Final.
            </p>

            <p style={labelStyle}>Scoring</p>
            <p style={textStyle}>
              A correct pick starts from a base of 10 points and gets scaled by two factors:
            </p>
            {bulletList([
              'Timing: a pick made before kickoff is always worth the full base. Once the game starts, the value decays based on what quarter you picked in and how close the game is. A pick made in a blowout decays fast because the outcome is obvious. A pick made in a close game decays slowly, since the result is still in question',
              'Underdog bonus: picking a team with a lower ELO (or, once the game starts, a lower live win probability) pays more if they win. Picking a heavy favorite pays less',
            ])}
            <p style={textStyle}>
              The final score is base × timing × underdog, rounded. Wrong picks score zero no matter when
              you made them.
            </p>

            <p style={labelStyle}>Auto-Pick</p>
            <p style={textStyle}>
              If you don't want to set picks manually every week, you can have them filled in for you. Three
              modes in your user settings:
            </p>
            {bulletList([
              'Favorites: always pick the favorite by ELO',
              'Underdogs: always pick the underdog (higher payout when they win)',
              'Random: coin flip each game',
            ])}
            <p style={textStyle}>
              Auto-picks are tagged so you can tell them apart from manual picks. You can still override any
              auto-pick before its game is Final.
            </p>

            <p style={labelStyle}>Weekly Rewards</p>
            <p style={textStyle}>
              Points convert to Floobits at the end of each week. Score above the Clairvoyant
              threshold in a single week and you get a bonus payout on top of that.
            </p>
            <p style={textStyle}>
              Weekly and season-long leaderboards rank everyone by total points. Picks live on
              the <Link to="/prognostications" style={linkStyle}>Prognostications</Link> page, where you can
              take a whole day's slate at once.
            </p>
          </Section>

          {/* Facilities */}
          <Section id="team-funding" title="Facilities">
            <p style={textStyle}>
              Fans fund and shape their favorite team's facilities, the buildings that decide how well the
              team develops players, keeps morale up, shakes off fatigue, and scouts rookies. Facilities
              replace the old market-tier perks: your team's edge is whatever you and your fellow fans
              actually build.
            </p>

            <p style={labelStyle}>The Five Facilities</p>
            <p style={textStyle}>
              Each facility levels from 0 to 5, with the real effects arriving around level 3.
            </p>
            {bulletList([
              'Training Facility: faster player development',
              'Locker Room: higher player morale',
              'Recovery Center: quicker fatigue recovery',
              'Scouting Department: clearer rookie scouting',
              'Stadium: home-field morale (new, effect coming in a later update)',
            ])}

            <p style={labelStyle}>The Treasury and Upkeep</p>
            <p style={textStyle}>
              Every facility has a per-season upkeep cost. Fans chip in Floobits three ways: straight to a
              facility's upkeep, to an active upgrade project, or into the team Treasury. You can also set a
              season-end auto-deposit, a percentage of your leftover Floobits that flows into the Treasury
              automatically. Costs scale with the league's economy, so the bar rises as the league grows richer.
            </p>

            <p style={labelStyle}>Projects</p>
            <p style={textStyle}>
              Raising a facility a level is a project. Fans vote on which project to chase next, then fund it.
            </p>

            <p style={labelStyle}>Season End</p>
            <p style={textStyle}>
              The Treasury pays out in order: upkeep first so no facility slips a level, then active projects,
              oldest first. Any upkeep left unfunded drops that facility a level; fully funded projects get built.
            </p>

            <p style={labelStyle}>Appeal</p>
            <p style={textStyle}>
              Your facilities' combined level is your team's Appeal. Higher Appeal lets your team draft free
              agents earlier in the offseason. Find it all on the Facilities tab under Front Office.
            </p>
          </Section>

          {/* ── Fantasy ── */}
          <Section id="fantasy" title="Fantasy">
            <p style={textStyle}>
              Sign in to play <Link to="/fantasy" style={linkStyle}>Fantasy Floosball</Link>. Your equipped
              trading cards are your roster: each card fields its real player, and that player's live in-game
              Fantasy Points (FP) power the card. Your FP update in real-time as games are played. You can
              watch your score tick up in the navbar during live games.
            </p>

            <p style={labelStyle}>Roster</p>
            <p style={textStyle}>
              Your roster has 6 slots, one per position (QB, RB, WR, WR, TE, K), each filled by an equipped
              card. You need at least 3 filled slots to lock. An optional 7th FLEX slot (any position) opens
              when you equip an MVP card, or for four weeks with the Accession power-up.
            </p>
            <RosterSlotVisual isMobile={isMobile} />

            <p style={labelStyle}>The Power Bar</p>
            <p style={textStyle}>
              A card only pays out when its own player has a good week. Every card has an FP bar that fills
              as that player scores, and the card's effect is on only while the bar is FULL. Fill it and the
              effect pays in full; come up short and it scores nothing. There is no partial credit for a
              bar that is nearly there.
            </p>
            <PowerBarVisual isMobile={isMobile} />
            <p style={textStyle}>
              Chance cards borrow the same bar for something else. They are never on or off: their bar is
              the odds themselves, so a bar at two thirds means the effect triggers about two times in
              three. The player's FP and the card's own condition are what push those odds up. The roll is
              settled at the end of the week, so during the week the bar reads Pending, and only afterwards
              does it say Triggered or Missed. It turns green when it hits. The Fortunate weekly modifier
              and the Patronage power-up both raise those odds.
            </p>
            <p style={textStyle}>
              How much it takes to fill belongs to the card, not to you. A rarer card depicts a better
              player and asks more of them, and each position is on its own scale, so filling a kicker's bar
              is nothing like filling a quarterback's. An All-Pro card fills more easily than the rest,
              because the best players deliver more often. A few cards have no bar at all, and a chance
              card's bar shows its odds of triggering rather than an on-or-off line.
            </p>

            <p style={labelStyle}>Scoring</p>
            <p style={textStyle}>
              Each week, your total Fantasy Points are calculated as:
            </p>
            <div style={{
              margin: '10px 0',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(51,65,85,0.3)',
              border: '1px solid #334155',
              fontSize: '13px',
              color: '#e2e8f0',
              fontWeight: '600',
              textAlign: 'center',
            }}>
              Total FP = (Roster FP + Card Bonus FP) x Multiplier Cards
            </div>
            <p style={{ ...textStyle, marginTop: '8px' }}>
              <span style={{ color: '#4ade80', fontWeight: '600' }}>Roster FP</span> comes from your players'
              in-game stats. <span style={{ color: '#4ade80', fontWeight: '600' }}>Card Bonus FP</span> is
              added by your equipped cards' flat effects. <span style={{ color: '#f472b6', fontWeight: '600' }}>Multiplier Cards</span> then
              scale the combined total (e.g. a 1.05x card turns 100 FP into 105).
            </p>

            <p style={labelStyle}>Weekly Modifiers</p>
            <p style={textStyle}>
              A random modifier is applied each week that changes how card effects work for everyone.
              The active modifier is shown on the Fantasy page. Modifiers don't repeat within 3 weeks.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
              {[
                { name: 'Amplify', color: '#f472b6', desc: 'FPx bonus portions are doubled' },
                { name: 'Frenzy', color: '#4ade80', desc: '+FP values are doubled' },
                { name: 'Ironclad', color: '#f97316', desc: "Streak cards can't reset this week" },
                { name: 'Longshot', color: '#a78bfa', desc: 'Conditional card rewards are doubled' },
                { name: 'Fortunate', color: '#38bdf8', desc: 'Chance card trigger rates increased by 15%' },
                { name: 'Synergy', color: '#f472b6', desc: 'Same-team stack FPx is doubled this week' },
                { name: 'Payday', color: '#eab308', desc: 'Floobits earned are tripled' },
                { name: 'Grounded', color: '#ef4444', desc: 'All FPx effects disabled' },
                { name: 'Steady', color: '#94a3b8', desc: 'No special effect. All normal rules apply' },
              ].map(m => (
                <div key={m.name} style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '10px',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(51,65,85,0.15)',
                }}>
                  <span style={{ color: m.color, fontWeight: '700', fontSize: '13px', minWidth: '80px' }}>{m.name}</span>
                  <span style={{ ...textStyle, fontSize: '13px' }}>{m.desc}</span>
                </div>
              ))}
            </div>

            <p style={labelStyle}>Changing Your Lineup</p>
            <p style={textStyle}>
              Your lineup is your equipped cards; each card fields its player at that position. You can
              change any card for another in your collection between game rounds, for free. Once games
              start for the week, your lineup locks until the next unlock window.
            </p>

            <p style={labelStyle}>Participation Reward</p>
            <p style={textStyle}>
              At the end of each week, your weekly FP is converted to Floobits along a tapering
              curve. Big weeks pay more than small weeks, but with diminishing returns. Everyone
              who plays earns something.
            </p>
          </Section>

          {/* ── Trading Cards ── */}
          <Section id="trading-cards" title="Trading Cards">
            <p style={textStyle}>
              Collect player <Link to="/cards" style={linkStyle}>Trading Cards</Link> from packs or the
              daily shop selection. Base cards simply field their player for their FP. The four effect
              editions add a named effect that modifies your weekly Fantasy scoring, and rarer editions
              have stronger effects.
            </p>

            <p style={labelStyle}>Editions</p>
            <div style={{
              display: 'flex',
              gap: isMobile ? '6px' : '14px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              margin: '14px 0',
            }}>
              {SAMPLE_CARDS.map(card => (
                <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <TradingCard
                    card={card}
                    size={isMobile ? 'xs' : 'sm'}
                    noHoverLift
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {[
                { name: 'Base', color: '#8a94a6', count: 0, desc: 'No effect. A Base card just fields its player for their FP. Your starter cards are Base, one per position.' },
                { name: 'Metallic', color: '#9aabc4', count: 33, desc: 'Simple, reliable effects. Flat FP bonuses, basic Floobit earnings, and straightforward conditionals. The backbone of any collection.' },
                { name: 'Holographic', color: '#c4b5fd', count: 45, desc: 'Conditional and composition effects. Team-based bonuses, position matchup rewards, and loyalty programs that scale with roster synergy.' },
                { name: 'Prismatic', color: '#f472b6', count: 35, desc: 'Chance-based and streak effects. High-risk/high-reward mechanics that grow over consecutive weeks, plus game-outcome bonuses.' },
                { name: 'Diamond', color: '#a5f3fc', count: 13, desc: 'Synergy effects. Hand-shaping cards that boost your entire loadout, chain reactions, and build-around centerpieces.' },
              ].map(e => (
                <div key={e.name} style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(51,65,85,0.2)',
                  borderLeft: `3px solid ${e.color}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: e.color, fontWeight: '700', fontSize: '13px' }}>{e.name}</span>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>{e.count > 0 ? `${e.count} effects` : 'no effect'}</span>
                  </div>
                  <span style={{ ...textStyle, fontSize: '13px' }}>{e.desc}</span>
                </div>
              ))}
            </div>

            <p style={labelStyle}>Obtaining Cards</p>
            {bulletList([
              'Card Packs: purchase from the Shop with Floobits (see Card Packs below)',
              'Daily Selection: rotating shop cards available for direct purchase, refreshes each day',
              'The Combine: sacrifice multiple cards to create a new one at a higher edition',
            ])}

            <p style={labelStyle}>Expiration</p>
            <p style={textStyle}>
              Cards are tied to the season they were created in. When a season ends, all cards from that
              season expire and can no longer be equipped. Expired cards can still be sold (at 20% of their
              normal value) or sacrificed in The Combine, but they won't contribute to your fantasy scoring.
              Build your collection each season knowing you'll start fresh next time. The exception is the
              Vault: vaulting a card keeps it forever (see The Vault below).
            </p>

            <p style={labelStyle}>Classifications</p>
            <p style={textStyle}>
              Some cards have special classifications that grant bonus abilities when equipped:
            </p>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { label: 'Rookie', abbr: 'R', color: '#fbbf24', desc: 'Sells for 2x Floobits' },
                { label: 'MVP', abbr: 'MVP', color: '#3b82f6', desc: 'Unlocks a 6th card equipment slot' },
                { label: 'Champion', abbr: 'CH', color: '#f59e0b', desc: 'Boosts your FPx when stacked with same-team cards' },
                { label: 'All-Pro', abbr: 'AP', color: '#a78bfa', desc: 'Lowers its own power bar threshold, so its effect activates more easily' },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <span style={{
                    color: c.color, fontWeight: '700', fontSize: '10px',
                    backgroundColor: `${c.color}20`, padding: '2px 6px',
                    borderRadius: '4px', minWidth: '36px', textAlign: 'center',
                  }}>{c.abbr}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: '600', minWidth: '80px' }}>{c.label}</span>
                  <span style={{ color: '#94a3b8' }}>{c.desc}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Card Effects ── */}
          <Section id="card-effects" title="Card Effects">
            <p style={{ ...textStyle, marginBottom: '12px' }}>
              Each card has a named effect. Most are drawn from a shared pool that any position can
              roll, but the pool is not the same for everyone: some effects belong to one position only,
              because they are built on a stat that position produces. A quarterback can roll effects a
              kicker never will, and a few are excluded where the maths does not work, such as an
              escalating touchdown effect on a tight end who scores too rarely to climb it.
            </p>
            <p style={{ ...textStyle, marginTop: '10px', marginBottom: '12px' }}>
              The color of the effect name on a card tells you what it produces:
              {' '}<span style={{ color: '#4ade80', fontWeight: '600' }}>green</span> for FP,
              {' '}<span style={{ color: '#f472b6', fontWeight: '600' }}>pink</span> for FPx (multipliers),
              and <span style={{ color: '#eab308', fontWeight: '600' }}>gold</span> for Floobits.
              Effects fall into these categories:
            </p>
            {[
              { label: 'Flat FP', color: '#4ade80', desc: 'Adds a fixed amount of Fantasy Points to your weekly total, no conditions.', example: 'Freebie: +3 FP added every week regardless of player performance.' },
              { label: 'Multiplier', color: '#60a5fa', desc: 'Multiplies your total combined FP at the end of each week.', example: 'Big Deal: 1.03x multiplier on all FP. Stacks with other multipliers.' },
              { label: 'Floobits', color: '#eab308', desc: 'Earns bonus Floobits currency each week instead of (or in addition to) FP.', example: 'Allowance: earn 2 bonus Floobits every week.' },
              { label: 'Conditional', color: '#a78bfa', desc: 'Awards bonus FP all at once when a specific in-game condition is met.', example: 'Mismatch: bonus FP for each touchdown by your roster\'s chosen position, with an extra reward once they reach a set number of TDs.' },
              { label: 'Streak', color: '#f97316', desc: 'Grows stronger each consecutive week its condition is met. Resets on failure.', example: 'On Fire: an FP multiplier that grows each consecutive week your roster\'s kicker makes a field goal, and resets otherwise.' },
              { label: 'Chance', color: '#38bdf8', desc: 'The power bar is your trigger odds. A guaranteed floor always pays; the fuller the bar, the better your shot at the enhanced payout.', example: 'Scrappy: a guaranteed FP floor plus a chance at a bigger payout. The bar fills from the card player\'s FP plus each low-rated player on your roster.' },
            ].map(c => (
              <div key={c.label} style={{
                marginBottom: '12px',
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(51,65,85,0.15)',
                borderLeft: `3px solid ${c.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: c.color, fontWeight: '700', fontSize: '13px' }}>{c.label}</span>
                </div>
                <p style={{ ...textStyle, fontSize: '13px' }}>{c.desc}</p>
                <p style={{ ...textStyle, fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                  {c.example}
                </p>
              </div>
            ))}

            <p style={labelStyle}>Synergies</p>
            <p style={textStyle}>
              Some card categories get stronger when you equip multiples. <span style={{ color: '#f97316', fontWeight: '600' }}>Streak cards</span> boost
              each other's weekly growth rate, so equipping 3 streak cards means each one grows faster than it
              would alone. <span style={{ color: '#38bdf8', fontWeight: '600' }}>Chance cards</span> slightly
              increase each other's trigger probability.
            </p>

          </Section>

          {/* ── Card Equipment ── */}
          <Section id="card-equipment" title="Card Equipment">
            <p style={textStyle}>
              Equip one card per position slot (QB, RB, WR, WR, TE, K) on the <Link to="/fantasy" style={linkStyle}>Fantasy</Link> page;
              each card must match its slot's position. A 6th card slot unlocks when you equip a card with
              the MVP classification, or by using the Accession power-up.
            </p>
            <EquipmentSlotDiagram isMobile={isMobile} />
            {bulletList([
              'Cards lock when games start for the week. Change your loadout between weeks',
              'Equip and unequip from the Fantasy page, below your roster',
              'Each card carries an FP power bar that turns its effect on once its player fills it that week',
              'Cards must be unequipped before they can be sold or used in The Combine',
            ])}
          </Section>

          {/* ── Card Packs ── */}
          <Section id="card-packs" title="Card Packs">
            <p style={{ ...textStyle, marginBottom: '14px' }}>
              Packs are the main way to get new cards. The Shop opens from your Floobits balance in the
              header. Most packs share the same rarity odds and the tier just buys more cards; the packs
              that guarantee something say so below. Everyone also gets one free Starter Pack per season.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
              gap: '8px',
            }}>
              {[
                { name: 'Humble', price: 40, cards: 3, kept: 2, border: '#475569', bg: '#283548', accent: '#94a3b8' },
                { name: 'Grand', price: 70, cards: 5, kept: 3, border: '#a78bfa', bg: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)', accent: '#c4b5fd' },
                { name: 'Exquisite', price: 100, cards: 7, kept: 4, border: '#67e8f9', bg: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 100%)', accent: '#a5f3fc' },
              ].map(p => (
                <div key={p.name} style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: p.bg,
                  borderBottom: `2px solid ${p.border}`,
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: p.accent, marginBottom: '6px' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.6 }}>
                    Reveal {p.cards}, keep {p.kept} &middot; {p.price} Floobits
                  </div>
                </div>
              ))}
            </div>
            <p style={{ ...labelStyle, marginTop: '16px' }}>Themed Packs</p>
            <p style={{ ...textStyle, marginBottom: '8px' }}>
              These rotate through the Shop. All of them cost 60 Floobits and reveal 3, keep 2, on the same
              odds as a Humble Pack. You are not buying better cards, you are buying a smaller haystack.
            </p>
            {bulletList([
              'Position packs: one position only, so you can go looking for the slot you still need',
              'Output packs: only cards that pay a specific output type',
              'Rookie packs: this season\'s draft class',
              'Team packs: one team\'s players, one pack per team',
            ])}

            <p style={{ ...labelStyle, marginTop: '16px' }}>Prestige Packs</p>
            {bulletList([
              'Champion Pack, 85 Floobits, reveal 5 keep 3: last season\'s champion roster, guaranteed Holographic or better',
              'All-Pro Pack, 85 Floobits, reveal 5 keep 3: last season\'s All-Pro team, guaranteed Holographic or better',
              'Collection Pack, 90 Floobits, reveal 5 keep 3: past-season greats, guaranteed Prismatic or better and nothing below Holographic',
            ])}
            <p style={{ ...textStyle, marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
              The Collection Pack can afford to be that generous because its cards can never be equipped.
              They go to your Vault and score in the Showcase, so there is no power to creep.
            </p>
          </Section>

          {/* ── The Combine ── */}
          <Section id="the-combine" title="The Combine">
            <p style={textStyle}>
              The Combine is one of two ways to upgrade cards on the <Link to="/cards" style={linkStyle}>Cards</Link> page.
              It raises a card's <em>edition</em>: sacrifice 2 or more cards to destroy them and create a single
              new card. The resulting edition depends on the total combined sell value of the sacrificed cards.
              (To raise a single card's <em>tier</em> instead, see Card Upgrades below.) The new card's player and
              effect are randomly assigned.
            </p>

            <p style={labelStyle}>Edition Thresholds</p>
            <p style={{ ...textStyle, fontSize: '13px', marginBottom: '10px' }}>
              The total sell value of all input cards determines the output edition:
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              margin: '0 0 12px',
            }}>
              {[
                { edition: 'Diamond', threshold: '300+', color: '#a5f3fc' },
                { edition: 'Prismatic', threshold: '175 – 299', color: '#f472b6' },
                { edition: 'Holographic', threshold: '50 – 174', color: '#c4b5fd' },
                { edition: 'Metallic', threshold: '0 – 49', color: '#9aabc4' },
              ].map(t => (
                <div key={t.edition} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: t.color, minWidth: '85px' }}>
                    {t.edition}
                  </span>
                  <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{t.threshold} total sell value</span>
                </div>
              ))}
            </div>

            <p style={labelStyle}>Examples</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { inputs: '10 Metallic (5x10 = 50)', result: 'Holographic', resultColor: '#c4b5fd' },
                { inputs: '6 Holographic (30x6 = 180)', result: 'Prismatic', resultColor: '#f472b6' },
                { inputs: '4 Prismatic (75x4 = 300)', result: 'Diamond', resultColor: '#a5f3fc' },
              ].map((ex, i) => (
                <div key={i} style={{
                  fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px', borderRadius: '5px', backgroundColor: 'rgba(51,65,85,0.2)',
                }}>
                  <span style={{ flex: 1 }}>{ex.inputs}</span>
                  <span style={{ color: '#64748b' }}>&rarr;</span>
                  <span style={{ color: ex.resultColor, fontWeight: '700', minWidth: '85px' }}>{ex.result}</span>
                </div>
              ))}
            </div>

            <p style={{ ...textStyle, marginTop: '10px', fontSize: '13px' }}>
              Cards must be unequipped before combining. Higher-edition cards contribute more value,
              so combining a mix of editions is the most efficient path to Diamond.
            </p>
          </Section>

          {/* ── Card Upgrades ── */}
          <Section id="card-upgrades" title="Card Upgrades">
            <p style={textStyle}>
              Level Up raises a single card's tier from I to IV, making it stronger without changing its
              edition or effect. Hover a card on the <Link to="/cards" style={linkStyle}>Cards</Link> page and
              hit Level Up.
            </p>

            <p style={labelStyle}>How it works</p>
            {bulletList([
              'Each level up costs Floobits plus one duplicate of the same effect, which is consumed',
              'Effects are locked to one edition, so any duplicate of the effect already matches the rarity you need',
              'Tiers go I, II, III, IV. The tier shows as a roman numeral on the card and in your scoring breakdown',
              'Higher tiers pay more (FP, FPx, or Floobits), and the card sells and scores for more',
            ])}

            <p style={labelStyle}>The Transplant</p>
            <p style={textStyle}>
              Sometimes you pull a great effect on a player you do not want. The Transplant moves an effect
              off one card and onto another: pick the card you want to keep, pick the card whose effect you
              want, and the second one is consumed.
            </p>
            {bulletList([
              'Both cards must be the same edition. You cannot promote an effect up a rarity this way',
              'The card you keep holds on to its player, its tier and its Vault status, and only the effect changes',
              'The effect is re-scaled to the player receiving it, so grafting off a star does not hand a weaker player the star\'s numbers',
              'Position-specific effects only move onto a player whose position they work for. Shared effects go anywhere at the same edition',
              'No-effect cards cannot donate or receive',
              'Cost rises with edition: Metallic 40, Holographic 70, Prismatic 120, Diamond 180',
            ])}

            <p style={labelStyle}>Which one do I want?</p>
            <p style={textStyle}>
              Three things that sound alike. The Combine fuses several cards into one of a higher
              <em> edition</em>. Level Up raises one card's <em>tier</em>. The Transplant keeps both fixed and
              swaps the <em>effect</em> onto a player you would rather field.
            </p>

            <p style={labelStyle}>Seasonal</p>
            <p style={textStyle}>
              A card's tier lasts the season, just like the card. Vault the card to keep its tier for good and
              feed it into your Showcase.
            </p>
          </Section>

          {/* ── The Vault ── */}
          <Section id="the-vault" title="The Vault">
            <p style={textStyle}>
              The Vault is your permanent collection. Vaulting a card keeps it forever, even after the season
              ends when normal cards expire. Find it as a tab on the <Link to="/cards" style={linkStyle}>Cards</Link> page.
            </p>

            <p style={labelStyle}>The trade-off</p>
            <p style={textStyle}>
              Vaulting is permanent. A vaulted card can no longer be equipped, sold, or used in The Combine or
              Level Up. In return it's yours for keeps. So vault the cards you want to collect and show off, not
              the ones you want to play.
            </p>

            <p style={labelStyle}>Keepsakes</p>
            <p style={textStyle}>
              A vaulted card drops its effect and becomes a player keepsake. The back shows the player's stats
              for the season the card is from: their team, star rating, and season fantasy points.
            </p>

            {bulletList([
              'Arrange your Vault by switching to Manual sort and dragging cards into any order',
              'Removing a card from the Vault trashes it for good, with no Floobit return',
              'Vaulting cards drives Collection achievements (Hometown Hero, Full Spectrum, Ice Cold, Archivist, and more)',
            ])}
          </Section>

          {/* ── The Showcase ── */}
          <Section id="the-showcase" title="The Showcase">
            <p style={textStyle}>
              The Showcase is where you put your best cards on display for a weekly Floobit dividend all season
              long. Feature up to 8 vaulted cards on the Showcase tab of the <Link to="/cards" style={linkStyle}>Cards</Link> page.
            </p>

            <p style={labelStyle}>Grades and payout</p>
            <p style={textStyle}>
              Your featured cards earn a grade from F to S as a quick read on their quality, and, more
              importantly, a Floobit dividend paid every regular-season week, scaled by how good your featured
              cards are. A better collection earns a better grade and a bigger weekly dividend: rarer editions,
              classifications (MVP, Champion, All-Pro), and higher tiers all push it up. Newer cards are worth
              more than old ones.
            </p>

            <p style={labelStyle}>Sets</p>
            <p style={textStyle}>
              Grouping cards into named sets boosts your grade. One Club (six from a team), Diamond Vault
              (eight Diamonds), Full Spectrum (all four editions of one player), and others. The Showcase shows
              which sets are Active and which you're one or two cards Away from.
            </p>

            {bulletList([
              'Only vaulted cards can be featured',
              'Editable all season, so keep swapping cards to push the grade higher',
              'Standings show everyone with a featured Showcase this season. Tap a name to view theirs',
            ])}
          </Section>

          {/* ── Floobits Economy ── */}
          <Section id="floobits" title="Floobits">
            <p style={{ ...textStyle, marginBottom: '12px' }}>
              Floobits are the in-app currency. Here's how you earn and spend them:
            </p>
            <p style={{ ...textStyle, fontWeight: '600', color: '#e2e8f0', marginBottom: '6px' }}>
              Earning:
            </p>
            {bulletList([
              'Weekly fantasy: your weekly FP converts to Floobits on a tapering curve (more FP earns more, with diminishing returns, no hard cap)',
              'Supporter: back a team and earn a dividend every week without doing anything. Tenure with the same team raises it, and the team playing well nudges it up. Switching teams sets your tenure back, so it rewards staying put',
              'Spectating: watching a live game fills a bar as plays go by, and each full segment pays out. Points scored while you watch fill it faster, and so does watching your own team',
              'Showcase: vaulted cards pay a weekly dividend based on their score',
              'Weekly leaderboard: 1st = 30, 2nd = 20, 3rd = 15 (top 25% get 5)',
              'Season leaderboard: 1st = 200, 2nd = 125, 3rd = 75 (top 25% get 25)',
              'Prognostications: points x 0.5 Floobits, plus weekly prizes and the Clairvoyant bonus',
              'Achievements: one-off payouts, and the season goals can be re-earned each year',
              'Favorite team clinches playoffs: 25',
              'Favorite team clinches top seed: 50',
              'Favorite team wins the Floos Bowl: 150',
              'Floobit card effects: bonus Floobits each week from equipped cards',
              'Selling cards you do not want',
            ])}
            <p style={{ ...textStyle, marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
              Supporter and Spectator income exists so there is a way to earn that does not run through
              fantasy. You can follow a team, watch games, and still get somewhere.
            </p>
            <p style={{ ...textStyle, fontWeight: '600', color: '#e2e8f0', marginBottom: '6px', marginTop: '12px' }}>
              Spending:
            </p>
            {bulletList([
              'Card Packs: Humble (40), themed packs (60), Grand (70), Champion and All-Pro (85), Collection (90), Exquisite (100)',
              'Card Upgrades: Floobits to Level Up a card a tier',
              'Daily Selection cards and rerolls (escalating cost)',
              'Power-Ups: Annulment, Accession, Patronage, Endowment',
              'Season-end tax: 25% of unspent Floobits fund your favorite team between seasons. Teams with more funding become larger markets with better player development and morale',
            ])}
          </Section>

          {/* ── Power-Ups ── */}
          <Section id="power-ups" title="Power-Ups">
            <p style={{ ...textStyle, marginBottom: '12px' }}>
              Power-ups are purchasable from the Shop. Each has a limited number of uses per season.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                // ⚠️ Dispensation (extra_swap) and Conscription (temp_flex) are RETIRED —
                // both left POWERUP_CATALOG with the fantasy/cards fusion, so the shop
                // rejects them. Roster swaps no longer exist, and the FLEX slot is
                // Accession's job now.
                { name: 'Annulment', price: 60, color: '#eab308', desc: 'Your cards operate under Steady (no modifier effect) this week.' },
                { name: 'Accession', price: 200, color: '#67e8f9', desc: 'Unlocks the FLEX lineup slot (any position) for 4 weeks. Limit 2/season.' },
                { name: 'Patronage', price: 125, color: '#f472b6', desc: 'Boosts all chance card trigger rates by 10% for 3 weeks. Limit 2/season.' },
                { name: 'Endowment', price: 100, color: '#fbbf24', desc: '+25% on all Floobits you earn (fantasy, pick-em, showcase, supporter dividends) for 4 weeks. Limit 2/season.' },
              ].map(pu => (
                <div key={pu.name} style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(51,65,85,0.2)',
                  borderLeft: `3px solid ${pu.color}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: pu.color, fontWeight: '700', fontSize: '13px' }}>{pu.name}</span>
                    <p style={{ ...textStyle, fontSize: '13px', marginTop: '2px' }}>{pu.desc}</p>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', flexShrink: 0 }}>
                    {pu.price}F
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Achievements */}
          <Section id="achievements" title="Achievements">
            <p style={textStyle}>
              Achievements reward you with Floobits, packs, or powerups for hitting milestones across
              the site. They split into four buckets that all live on
              the <Link to="/achievements" style={linkStyle}>Achievements</Link> page.
            </p>

            <p style={labelStyle}>Rookie Goals</p>
            <p style={textStyle}>
              One-time onboarding achievements. Things like setting a favorite team, submitting your
              first pick-em pick, opening your first pack, setting a fantasy roster, equipping a card.
              Each has a step-by-step hint and an action button that takes you straight to the right
              spot. Payouts are Floobits only. Once you complete a Rookie Goal, it stays completed
              forever.
            </p>

            <p style={labelStyle}>Season Goals</p>
            <p style={textStyle}>
              Per-season achievements that reset every offseason, so you can earn them again each year.
              Some are tiered (Banner Week I through IV, Dedicated I through VI) and reward larger prizes
              as you climb. Card upgrades have their own tiers here (Artificer, Ascendant). Rewards can
              include Floobits, card packs, or powerups.
            </p>

            <p style={labelStyle}>Collection</p>
            <p style={textStyle}>
              Permanent goals for your Vault that never reset, like vaulting your favorite team's players,
              every edition of one player, or a stack of Diamonds.
            </p>

            <p style={labelStyle}>Secret Achievements</p>
            <p style={textStyle}>
              Hidden achievements that only reveal themselves once you unlock them. These reward
              unusual patterns of play rather than straightforward milestones.
            </p>

            <p style={labelStyle}>Claiming Rewards</p>
            <p style={textStyle}>
              Floobits pay out instantly when the achievement completes. Packs and powerups show up in
              your Unclaimed Rewards panel at the top of the Achievements page. Click Claim on a pack
              to open it right there. Powerups activate on claim.
            </p>

            <p style={labelStyle}>Save for Next Season</p>
            <p style={textStyle}>
              You don't have to open a pack the moment you earn it. In the last four weeks of the
              regular season, any unclaimed pack reward shows a "Save for Next Season" button. Clicking
              it stashes the pack for season N+1 so you can open it against a fresher card pool (new
              rookies, new edition rarities, etc.) instead of burning it on the current season.
            </p>
            <p style={textStyle}>
              Stashed packs have one-season expiry. If you save a pack for next season and then forget
              to claim it during that season, it gets swept at the following season's start. Unclaimed
              rewards that you never stashed also get swept at the next season's start, so the general
              rule is: claim (or stash) your rewards before the season ends.
            </p>
          </Section>

          {/* Created by */}
          <div style={{
            marginTop: '24px',
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'rgba(30,41,59,0.6)',
            border: '1px solid #334155',
            textAlign: 'center',
          }}>
            <p style={{ ...textStyle, fontSize: '14px', color: '#cbd5e1' }}>
              Created by <span style={{ color: '#e2e8f0', fontWeight: '700' }}>_aplo</span>
            </p>
            <p style={{ ...textStyle, fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
              Built as a passion project in my spare time, not a full-time endeavor. Updates come when they come.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile floating TOC */}
      {isMobile && <MobileTOC activeId={activeSection} />}
    </div>
  )
}

export default AboutPage
