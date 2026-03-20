import React, { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'

const APP_VERSION = process.env.REACT_APP_VERSION || '0.6.1'

const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
  {
    version: 'v0.6.1',
    date: '2026-03-19',
    changes: [
      'All-Pro Team display in Leaders tab with purple accent styling',
      'All-Pro and MVP announcements in league highlight feed with colored badges',
      'Clock management tuning — smarter spike and timeout decisions in crunch time',
      'Garbage time detection reduces late-game pressure effects in blowouts',
      'Season resume fix — MVP and All-Pro selections now work correctly after restart',
      'Fantasy season-end prize summary with Floobits breakdown',
      'Prognostication leaderboard fix for between-week display',
    ],
  },
  {
    version: 'v0.6.0',
    date: '2026-03-17',
    changes: [
      'Prognostication redesign — pick winners before or during games with quarter-based point multipliers',
      'Earlier picks earn more: pre-game 10 pts, Q1 8 pts, Q2 6 pts, Q3 4 pts, Q4 2 pts, OT 3 pts',
      'Combined win probability bar with clickable pick buttons on game cards',
      'Prognostication leaderboard ranked by total points with season and weekly views',
      'Overtime play-calling fix — first possession team no longer kicks early field goals',
      'Overtime plays now display as "OT" instead of "Q5"',
      'Removed MVP Race from dashboard — streamlined leaderboard tabs',
      'Floobits rewards proportional to points earned',
    ],
  },
  {
    version: 'v0.5.0',
    date: '2026-03-16',
    changes: [
      'GM Board of Directors — ranked-choice ballot system for free agency player targeting',
      'Free agency draft with directive queues, one pick per team per round',
      'Tabbed offseason panel consolidating Players, Directives, and Transactions views',
      'Clutch/choke system redesign — blowout dampening, Q4 pressure progression fix, stricter choke criteria',
      'High-pressure moments now compress the no-effect zone for more dramatic player responses',
      'Game stats snapshot cached at game completion — Floosbowl stats persist through offseason',
      'Centered game bar for playoff weeks',
      'Pick\'em system and game card score predictions',
    ],
  },
  {
    version: 'v0.4.0',
    date: '2026-03-13',
    changes: [
      'The Combine — three card upgrade paths: Promotion, The Blender, and Transplant',
      'Promotion — sacrifice a higher-edition card to promote another card to that edition',
      'The Blender — sacrifice multiple cards to create a new random card, edition based on total card value',
      'Transplant — sacrifice a card plus Floobits to transfer its effect onto another card',
      'Classification-aware card values for upgrades (Rookie, MVP, Champion, All-Pro multipliers)',
      'Cards page restored to main navigation',
    ],
  },
  {
    version: 'v0.3.3',
    date: '2026-03-12',
    changes: [
      'Decoupled card effect pools from position — shared pool available to all positions plus position-exclusive effects for position-specific stats',
      'Rebalanced output types — reduced FPx dominance (44% → 21%), converted 23 effects to FP or Floobits output',
      'Diversified position-exclusive output types — QB and RB exclusives now cover FP, FPx, and Floobits',
      'New RB-exclusive effects: Expedition (FP per rushing yards) and Stampede (conditional FPx with base value)',
      'Buffed flat FP effect values to be competitive with conditional multipliers',
      'Reworked edition secondaries — Prismatic picks random 2-of-3 bonus types, Diamond gets all three',
    ],
  },
  {
    version: 'v0.3.2',
    date: '2026-03-10',
    changes: [
      'Expandable player game stats on roster — tap any player to see live passing, rushing, receiving, or kicking stats',
      'Favorite team slot on roster showing ELO, record, streak, and playoff status',
      'Swap and card lock window now correctly opens between game scheduling and kickoff',
      'Score breakdown equation defaults to expanded',
    ],
  },
  {
    version: 'v0.3.1',
    date: '2026-03-10',
    changes: [
      'Fixed mid-week roster lock — weekly FP and card bonuses now only count post-lock stats',
      'Fixed card effects using pre-lock TDs, yards, and other stats for match bonuses',
      'Card lock button accessible when card equipment slots are collapsed',
      'Momentum flame badge in game modal scoreboard',
    ],
  },
  {
    version: 'v0.3.0',
    date: '2026-03-10',
    changes: [
      'Momentum system — teams go on runs with cascade multipliers and mental resistance',
      'Momentum shift highlights in play feed and game modal',
      'Card classifications (All-Pro, Champion) and weekly modifiers',
      'Roster swap system with between-game unlock window',
      'Detailed card effect breakdowns with equation display',
      'Score formula panel showing full FP calculation',
      'Flame indicator on game cards for momentum streaks',
    ],
  },
  {
    version: 'v0.2.0',
    date: '2026-03-06',
    changes: [
      'Trading card system with 6 editions (Base → Diamond)',
      'Balatro-inspired card effect pools with synergies',
      'Card equipment slots with draft mode and weekly locking',
      'Two-pass card bonus calculator with modifier cards',
      'Smart coaching with halftime gameplan adjustments',
      'Live card bonus tracking and per-card breakdowns',
      'Fantasy leaderboard with accurate live scoring',
      'Offseason system and admin portal',
    ],
  },
  {
    version: 'v0.1.0',
    date: '2026-03-05',
    changes: [
      'Initial release of Floosball simulation',
      'Live play-by-play with Big Play, Clutch, and Choke indicators',
      'Full season simulation with playoffs and Floosbowl',
      'Fantasy mode with live scoring',
      'Team and player management with procedural generation',
      'Coaching system with halftime adjustments',
      'Win probability and pressure-based gameplay',
    ],
  },
]

export const Footer: React.FC = () => {
  const [showChangelog, setShowChangelog] = useState(false)
  const [showAllNotes, setShowAllNotes] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const latest = CHANGELOG[0]

  useEffect(() => {
    if (!showChangelog) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        badgeRef.current && !badgeRef.current.contains(e.target as Node)
      ) {
        setShowChangelog(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showChangelog])

  return (
    <footer style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      backgroundColor: '#0f172a',
      borderTop: '1px solid #334155',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: isMobile ? '8px 16px' : '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NavLink
            to="/about"
            style={{
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >
            About
          </NavLink>
          <a
            href="https://discord.gg/b4DZn3mVfP"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >
            Discord
          </a>
        </div>

        <div ref={badgeRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowChangelog(o => !o)}
            style={{
              background: 'none',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '3px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: '600',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b' }}
          >
            v{APP_VERSION}
          </button>

          {showChangelog && (
            <div
              ref={panelRef}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                right: 0,
                width: isMobile ? '280px' : '340px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '10px',
                boxShadow: '0 -8px 30px rgba(0,0,0,0.4)',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #334155',
                fontSize: '13px',
                fontWeight: '700',
                color: '#e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                What's New
                <span style={{ fontSize: '11px', fontWeight: '500', color: '#94a3b8' }}>{latest.date}</span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <ul style={{
                  margin: 0,
                  paddingLeft: '16px',
                  listStyle: 'none',
                }}>
                  {latest.changes.map((change, i) => (
                    <li key={i} style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                      lineHeight: '1.6',
                      position: 'relative',
                      paddingLeft: '8px',
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: '-8px',
                        color: '#64748b',
                      }}>•</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
              {CHANGELOG.length > 1 && (
                <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #334155' }}>
                  <button
                    onClick={() => { setShowChangelog(false); setShowAllNotes(true) }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3b82f6',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#3b82f6')}
                  >
                    View all release notes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full release notes modal */}
      {showAllNotes && (
        <div
          onClick={() => setShowAllNotes(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: isMobile ? '92vw' : '480px',
              maxHeight: '80vh',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>Release Notes</span>
              <button
                onClick={() => setShowAllNotes(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
              >
                ×
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '4px 0' }}>
              {CHANGELOG.map((entry, idx) => (
                <div key={entry.version} style={{
                  padding: '16px 20px',
                  borderBottom: idx < CHANGELOG.length - 1 ? '1px solid #334155' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: idx === 0 ? '#3b82f6' : '#64748b',
                    }}>
                      {entry.version}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{entry.date}</span>
                    {idx === 0 && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: '#22c55e',
                        backgroundColor: 'rgba(34,197,94,0.12)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>LATEST</span>
                    )}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', listStyle: 'none' }}>
                    {entry.changes.map((change, i) => (
                      <li key={i} style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        lineHeight: '1.7',
                        position: 'relative',
                        paddingLeft: '8px',
                      }}>
                        <span style={{ position: 'absolute', left: '-8px', color: '#64748b' }}>•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
