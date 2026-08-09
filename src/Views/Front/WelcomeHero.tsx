import React from 'react'
import { Link } from 'react-router-dom'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { PulsingDot } from '@/Views/GameBoard/boardPieces'

/**
 * The front page's opening: what this is, what is happening right now, and the four
 * places worth going.
 *
 * ⚠️ The original handoff deliberately removed "a row of go-to buttons" as redundant with
 * the nav. This is the owner reinstating it in a different form, and the distinction that
 * makes it worth having is the FRAMING: the nav is a list of destinations for someone who
 * already knows what they are, while this says what the league is and what each place is
 * for. It also carries the live pulse that the Happening now band used to — one line
 * rather than five cells, since the band came out.
 */

const ICON = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
)

type Activity = {
  key: string
  to: string
  label: string
  blurb: string
  color: string
  icon: React.ReactNode
  needsUser?: boolean
}

const ACTIVITIES: Activity[] = [
  {
    key: 'games',
    to: '/games',
    label: 'Game board',
    blurb: 'watch the games.',
    color: ACCENT.live,
    icon: ICON('M3 2h2v1l11 4-11 4v7H3V2z'),
  },
  {
    key: 'standings',
    to: '/standings',
    label: 'Standings',
    blurb: 'see who\'s the best.',
    color: ACCENT.info,
    icon: ICON('M3 3h14v3H3V3zm0 5h14v3H3V8zm0 5h14v3H3v-3z'),
  },
  {
    key: 'players',
    to: '/players',
    label: 'Players',
    blurb: 'dive into the numbers.',
    color: ACCENT.warning,
    icon: ICON('M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z'),
  },
  {
    key: 'fantasy',
    to: '/fantasy',
    label: 'Fantasy',
    blurb: 'play some cards.',
    color: ACCENT.cards,
    icon: ICON('M3 4h14v3H3V4zm1 5h12v7H4V9z'),
    needsUser: true,
  },
]

const WelcomeHero: React.FC<{
  signedIn: boolean
  seasonNumber: number
  weekLabel: string
  liveCount: number
}> = ({ signedIn, seasonNumber, weekLabel, liveCount }) => {
  const activities = ACTIVITIES.filter(a => !a.needsUser || signedIn)

  return (
    <div style={{
      gridColumn: '1 / -1',
      background: BG.card,
      border: `1px solid ${BORDER.hairline}`,
      marginBottom: '4px',
      fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
      <div style={{
        display: 'flex', gap: '18px', padding: '22px 24px 20px',
        flex: '1 1 400px', minWidth: 0, alignItems: 'center',
      }}>
        {/* The league crest, at a size that reads as a mark rather than a favicon. It is
            the same asset the header wears at 28px; here it anchors the block.

            ⚠️ alignSelf and the CSS width/height are both load-bearing. The asset is
            square (256x256) and the width/height ATTRIBUTES said 56 — but this is a flex
            child, and a flex container defaults to `align-items: stretch`, which
            overrode the attribute height and pulled the crest into an oval as tall as the
            headline block beside it. Attributes do not survive that; CSS sizing plus an
            explicit alignSelf do. */}
        <img
          src="/avatars/league_logo.png"
          alt=""
          width={56}
          height={56}
          style={{
            width: '56px', height: '56px',
            borderRadius: '50%', flexShrink: 0, alignSelf: 'center',
          }}
        />
        <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
          <h1 style={{ ...font(800, 26, 1.1, '-0.03em'), color: TEXT.primary, margin: 0 }}>
            welcome to floosball
          </h1>
        </div>
        <p style={{
          ...font(400, 13, 1.6), color: TEXT.muted,
          margin: '10px 0 0', maxWidth: '520px', textWrap: 'pretty' as any,
        }}>
          the simulation is alive. the cores are always watching.
        </p>
        </div>
      </div>

      {/* Two columns rather than one row per tile. A row of four across the full width
          left the headline block with a lot of dead space beside it; two-up sits the
          tiles in that space and keeps each blurb on a readable line length.

          Signed out there are three tiles, so the last one spans both columns instead of
          leaving a hole in the corner. */}
      <div className="heroTiles" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        flex: '1 1 480px', minWidth: 0,
      }}>
        {activities.map((activity, i) => {
          const isLast = i === activities.length - 1
          const spans = isLast && activities.length % 2 === 1
          const onLastRow = Math.floor(i / 2) === Math.ceil(activities.length / 2) - 1
          const live = activity.key === 'games' && liveCount > 0
          return (
            <Link
              key={activity.key}
              to={activity.to}
              className="row"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '16px 20px', textDecoration: 'none', minWidth: 0,
                gridColumn: spans ? 'span 2' : undefined,
                borderRight: i % 2 === 0 && !spans ? `1px solid ${BORDER.hairline}` : 'none',
                borderBottom: onLastRow ? 'none' : `1px solid ${BORDER.hairline}`,
              }}
            >
              <span style={{ color: activity.color, display: 'flex', paddingTop: '1px' }}>
                {activity.icon}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap',
                }}>
                  <span style={{ ...font(800, 14, 1, '-0.01em'), color: TEXT.strong }}>
                    {activity.label}
                  </span>
                  {/* The live count rides the destination it refers to, rather than
                      sitting up in the headline needing its own link to get here. */}
                  {live && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <PulsingDot size={5} />
                      <span style={{
                        ...font(700, 10, 1, '0.1em'), color: ACCENT.live, ...TABULAR,
                      }}>{liveCount} LIVE NOW</span>
                    </span>
                  )}
                </span>
                <span style={{
                  display: 'block', ...font(400, 11, 1.45), color: TEXT.muted, marginTop: '5px',
                  textWrap: 'pretty' as any,
                }}>{activity.blurb}</span>
              </span>
            </Link>
          )
        })}
      </div>
      </div>
    </div>
  )
}

export default WelcomeHero
