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
    blurb: 'Every game of the week, most interesting first',
    color: ACCENT.live,
    icon: ICON('M3 2h2v1l11 4-11 4v7H3V2z'),
  },
  {
    key: 'standings',
    to: '/standings',
    label: 'Standings',
    blurb: 'The divisions, the cutline and the wild card race',
    color: ACCENT.info,
    icon: ICON('M3 3h14v3H3V3zm0 5h14v3H3V8zm0 5h14v3H3v-3z'),
  },
  {
    key: 'players',
    to: '/players',
    label: 'Players',
    blurb: 'Who leads the league, and who is worth a look',
    color: ACCENT.warning,
    icon: ICON('M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z'),
  },
  {
    key: 'fantasy',
    to: '/fantasy',
    label: 'Fantasy',
    blurb: 'Pick five, equip cards, score every week',
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
      borderTop: `2px solid ${ACCENT.info}`,
      marginBottom: '4px',
      fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', gap: '18px', padding: '22px 24px 20px' }}>
        {/* The league crest, at a size that reads as a mark rather than a favicon. It is
            the same asset the header wears at 28px; here it anchors the block. */}
        <img
          src="/avatars/league_logo.png"
          alt=""
          width={56}
          height={56}
          style={{ borderRadius: '50%', flexShrink: 0, marginTop: '2px' }}
        />
        <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
          <h1 style={{ ...font(800, 26, 1.1, '-0.03em'), color: TEXT.primary, margin: 0 }}>
            Welcome to Floosball
          </h1>
          {seasonNumber > 0 && (
            <span style={{ ...font(600, 12, 1, '0.1em'), color: TEXT.muted, ...TABULAR }}>
              SEASON {seasonNumber} · {weekLabel.toUpperCase()}
            </span>
          )}
          {/* The live pulse the Happening now band used to carry, in one line. */}
          {liveCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PulsingDot size={5} />
              <Link
                to="/games"
                className="hd"
                style={{ ...font(700, 10, 1, '0.1em'), color: ACCENT.live, textDecoration: 'none' }}
              >{liveCount} LIVE NOW</Link>
            </span>
          )}
        </div>
        <p style={{
          ...font(400, 13, 1.6), color: TEXT.muted,
          margin: '10px 0 0', maxWidth: '640px', textWrap: 'pretty' as any,
        }}>
          A football league that plays itself, week after week, whether or not anyone is
          watching. Follow a team, call the results, and build a roster out of the players
          making it happen.
        </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${activities.length}, minmax(0, 1fr))`,
        borderTop: `1px solid ${BORDER.hairline}`,
      }}>
        {activities.map((activity, i) => (
          <Link
            key={activity.key}
            to={activity.to}
            className="row"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '16px 20px', textDecoration: 'none', minWidth: 0,
              borderRight: i < activities.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
            }}
          >
            <span style={{ color: activity.color, display: 'flex', paddingTop: '1px' }}>
              {activity.icon}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', ...font(800, 14, 1, '-0.01em'), color: TEXT.strong }}>
                {activity.label}
              </span>
              <span style={{
                display: 'block', ...font(400, 11, 1.45), color: TEXT.muted, marginTop: '5px',
                textWrap: 'pretty' as any,
              }}>{activity.blurb}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default WelcomeHero
