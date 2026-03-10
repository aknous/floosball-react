import React from 'react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'

const linkStyle: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
  fontWeight: '600',
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '8px',
  border: '1px solid #334155',
  padding: '20px 24px',
  marginBottom: '16px',
}

const headingStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#e2e8f0',
  marginBottom: '12px',
  margin: 0,
}

const textStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: '1.7',
  margin: 0,
}

const indicatorRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '8px',
}

const AboutPage: React.FC = () => {
  const isMobile = useIsMobile()

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: isMobile ? '24px 16px' : '40px 24px' }}>

        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#e2e8f0', marginBottom: '8px' }}>
          About Floosball
        </h1>
        <p style={{ ...textStyle, marginBottom: '32px' }}>
          Everything you need to know about the simulation.
        </p>

        {/* What is Floosball? */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>What is Floosball?</h2>
          <p style={{ ...textStyle, marginTop: '12px' }}>
            Floosball is a procedurally generated football simulation. Every team, player, coach, and game is
            generated from scratch — no real-world data, just pure simulation. The engine runs full
            seasons with regular season weeks, playoffs, and a championship game (the Floosbowl).
            Players have unique attributes that affect gameplay, coaches have distinct tendencies,
            and every play unfolds based on probabilities influenced by matchups, pressure, and situational context.
          </p>
        </div>

        {/* How to Watch */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>How to Watch</h2>
          <p style={{ ...textStyle, marginTop: '12px' }}>
            The <Link to="/dashboard" style={linkStyle}>Dashboard</Link> is your home base. When games are
            live, you'll see game cards with real-time scores. Click any game card to open the play-by-play
            modal with a full drive log, live stats, and win probability. The Highlights feed on the
            dashboard surfaces key moments — touchdowns, turnovers, big plays, and clutch/choke moments — so
            you can follow the action across all games at once.
          </p>
        </div>

        {/* Play Indicators */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>Play Indicators</h2>
          <p style={{ ...textStyle, marginTop: '12px', marginBottom: '16px' }}>
            Certain plays are highlighted with visual indicators in the play-by-play and highlights feed:
          </p>
          <div style={indicatorRow}>
            <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '12px', minWidth: '90px' }}>
              ⚡ BIG PLAY
            </span>
            <span style={textStyle}>
              An explosive play — long runs, deep passes, or huge gains.
            </span>
          </div>
          <div style={indicatorRow}>
            <span style={{ color: '#06b6d4', fontWeight: '600', fontSize: '12px', minWidth: '90px' }}>
              ◆ CLUTCH
            </span>
            <span style={textStyle}>
              A player delivered under high game pressure — a big throw, clutch catch, or key run when the game is on the line.
            </span>
          </div>
          <div style={indicatorRow}>
            <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '12px', minWidth: '90px' }}>
              ▼ CHOKE
            </span>
            <span style={textStyle}>
              A player crumbled under pressure — a costly interception, dropped pass, or stalled drive in a critical moment.
            </span>
          </div>
        </div>

        {/* Game Badges */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>Game Badges</h2>
          <p style={{ ...textStyle, marginTop: '12px', marginBottom: '16px' }}>
            Some games on the dashboard are highlighted with special badges:
          </p>
          <div style={indicatorRow}>
            <span style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.05em', flexShrink: 0 }}>
              FEATURED
            </span>
            <span style={textStyle}>
              A marquee matchup — either two elite teams (both with high ELO ratings) facing off, or a late-season
              playoff bubble battle between same-league teams fighting for a postseason spot.
            </span>
          </div>
          <div style={indicatorRow}>
            <span style={{ backgroundColor: '#f97316', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.05em', flexShrink: 0 }}>
              UPSET ALERT
            </span>
            <span style={textStyle}>
              A heavy underdog is winning. Triggers when a team that entered the game with less than a 35% chance of
              winning takes the lead against a playoff-contending opponent.
            </span>
          </div>
        </div>

        {/* Teams & Players */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>Teams & Players</h2>
          <p style={{ ...textStyle, marginTop: '12px' }}>
            The league consists of procedurally generated teams, each with unique rosters, coaches, and
            geometric avatars. Visit the <Link to="/players" style={linkStyle}>Players</Link> page
            to browse the full player database — filter by position and status to find who you're looking
            for. Each player has detailed attributes (speed, strength, awareness, pressure handling, and
            more) that directly affect how they perform on the field.
          </p>
        </div>

        {/* Records */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>Records</h2>
          <p style={{ ...textStyle, marginTop: '12px' }}>
            The <Link to="/records" style={linkStyle}>Records</Link> page tracks season records and
            all-time bests across the league's history. See which teams have dominated, which players
            hold records, and browse past season results including playoff brackets and Floosbowl champions.
          </p>
        </div>

        {/* Fantasy */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>Fantasy</h2>
          <p style={{ ...textStyle, marginTop: '12px' }}>
            Sign in to play <Link to="/fantasy" style={linkStyle}>Fantasy Floosball</Link>. Draft a
            roster of players and earn points based on their live in-game performance. Your fantasy
            points update in real-time as games are played — watch your score tick up in the navbar
            during live games.
          </p>
        </div>

        {/* Season Schedule */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>Season Schedule</h2>
          <p style={{ ...textStyle, marginTop: '12px', marginBottom: '16px' }}>
            Each season plays out over the course of a week on a fixed real-world schedule. All game times are Eastern (adjust for your time zone).
          </p>

          {[
            { day: 'Monday – Thursday', label: 'Regular Season', desc: '28 rounds of games played across 4 days (7 rounds per day). Each round kicks off on the hour from 11 AM to 5 PM. Every team plays a mix of intra-league and inter-league matchups.' },
            { day: 'Thursday Evening', label: 'MVP Announcement', desc: 'After the final regular season round, the season MVP is announced based on cumulative performance ratings.' },
            { day: 'Friday', label: 'Playoffs', desc: 'All playoff rounds are played on Friday — two rounds of playoff games, the league championships, and the Floosbowl. 6 teams per league qualify, with the top 2 seeds earning a first-round bye.' },
            { day: 'Saturday', label: 'Retirements & Free Agency', desc: 'Players with expiring contracts and aging veterans retire. Hall of Fame inductions are made for eligible retirees. Then teams sign available free agents to fill roster gaps — draft order goes from worst record to best, with the champion picking last.' },
            { day: 'Sunday', label: 'Offseason & New Season', desc: 'Coaches train and develop their players — players may improve, regress, or stay the same based on coaching ability. Performance ratings reset, team ratings are recalculated, and a new schedule is generated for the next season.' },
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
              <div style={{ ...textStyle, fontSize: '12px' }}>{item.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

export default AboutPage
