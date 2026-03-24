import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'

const linkStyle: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
  fontWeight: '600',
}

const textStyle: React.CSSProperties = {
  fontSize: '13px',
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

// ── Collapsible section ────────────────────────────────────────────────────

const Section: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderRadius: '8px',
      border: '1px solid #334155',
      marginBottom: '16px',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '16px 20px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>
          {title}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

const AboutPage: React.FC = () => {
  const isMobile = useIsMobile()

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: isMobile ? '24px 16px' : '40px 24px' }}>

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
              CLOSED BETA
            </span>
          </div>
          <p style={{ ...textStyle, fontSize: '12px' }}>
            Welcome to the Floosball closed beta. The simulation is under active development
            — features may change, balancing will be adjusted, and new systems will be added
            throughout the beta period. Season data (fantasy points, cards, floobits) may
            occasionally be reset as we fix bugs and improve the game. If you encounter any
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
        <Section title="What is Floosball?" defaultOpen>
          <p style={textStyle}>
            Floosball is a procedurally generated football simulation. Every team, player, coach, and game is
            generated from scratch — no real-world data, just pure simulation. The engine runs full
            seasons with regular season weeks, playoffs, and a championship game (the Floosbowl).
            Players have unique attributes that affect gameplay, coaches have distinct tendencies,
            and every play unfolds based on probabilities influenced by matchups, pressure, and situational context.
          </p>
        </Section>

        {/* How to Watch */}
        <Section title="How to Watch">
          <p style={textStyle}>
            The <Link to="/dashboard" style={linkStyle}>Dashboard</Link> is your home base. When games are
            live, you'll see game cards with real-time scores. Click any game card to open the play-by-play
            modal with a full drive log, live stats, and win probability. The Highlights feed on the
            dashboard surfaces key moments — touchdowns, turnovers, big plays, and clutch/choke moments — so
            you can follow the action across all games at once.
          </p>
        </Section>

        {/* Play Indicators */}
        <Section title="Play Indicators">
          <p style={{ ...textStyle, marginBottom: '16px' }}>
            Certain plays are highlighted with visual indicators in the play-by-play and highlights feed:
          </p>
          <div style={indicatorRow}>
            <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '12px', minWidth: '110px' }}>
              BIG PLAY
            </span>
            <span style={textStyle}>
              An explosive play — long runs, deep passes, or huge gains.
            </span>
          </div>
          <div style={indicatorRow}>
            <span style={{ color: '#06b6d4', fontWeight: '600', fontSize: '12px', minWidth: '110px' }}>
              CLUTCH
            </span>
            <span style={textStyle}>
              A player delivered under high game pressure — a big throw, clutch catch, or key run when the game is on the line.
            </span>
          </div>
          <div style={indicatorRow}>
            <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '12px', minWidth: '110px' }}>
              CHOKE
            </span>
            <span style={textStyle}>
              A player crumbled under pressure — a costly interception, dropped pass, or missed field goal in a critical moment.
            </span>
          </div>
          <div style={indicatorRow}>
            <span style={{ color: '#f97316', fontWeight: '600', fontSize: '12px', minWidth: '110px' }}>
              <svg viewBox="0 0 24 24" fill="#f97316" style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'middle', marginRight: '2px' }}>
                <path d="M12 23c-4.97 0-8-3.58-8-7.5 0-3.07 1.74-5.44 3.42-7.1A13.5 13.5 0 0 1 10.5 5.8s.5 2.7 2.5 4.2c2-1.5 2.5-4.2 2.5-4.2s2.08 1.5 3.08 2.6C20.26 10.06 20 12.93 20 15.5 20 19.42 16.97 23 12 23Zm0-2c2.76 0 5-1.79 5-4.5 0-1.5-.5-3-1.5-4l-1 1c-1 1-2.5 1-3.5 0l-1-1c-1 1-1.5 2.5-1.5 4 0 2.71 2.24 4.5 5 4.5Z" />
              </svg>{' '}MOMENTUM
            </span>
            <span style={textStyle}>
              A team is on a hot streak — consecutive successful plays building momentum. Appears as a flame icon
              next to the team name on game cards and as a highlight tag in the feed. The flame intensifies
              with stronger momentum streaks.
            </span>
          </div>
        </Section>

        {/* Game Badges */}
        <Section title="Game Badges">
          <p style={{ ...textStyle, marginBottom: '16px' }}>
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
        </Section>

        {/* Teams & Players */}
        <Section title="Teams & Players">
          <p style={textStyle}>
            The league consists of procedurally generated teams, each with unique rosters, coaches, and
            geometric avatars. Visit the <Link to="/players" style={linkStyle}>Players</Link> page
            to browse the full player database — filter by position and status to find who you're looking
            for. Each player has detailed attributes (speed, strength, awareness, pressure handling, and
            more) that directly affect how they perform on the field.
          </p>
        </Section>

        {/* Fantasy */}
        <Section title="Fantasy">
          <p style={textStyle}>
            Sign in to play <Link to="/fantasy" style={linkStyle}>Fantasy Floosball</Link>. Draft a
            roster of 5 players (QB, RB, WR, TE, K) each season and earn Fantasy Points (FP) based on their
            live in-game performance. Your FP update in real-time as games are played — watch your score
            tick up in the navbar during live games.
          </p>
          <p style={{ ...textStyle, marginTop: '10px' }}>
            <span style={{ color: '#e2e8f0', fontWeight: '600' }}>Fantasy Scoring:</span> Your total FP each week
            is calculated as: (roster FP + card bonus FP) multiplied by any multiplier bonuses from equipped cards.
            A weekly modifier is randomly applied to all players that can affect scoring in different ways.
          </p>
          <p style={{ ...textStyle, marginTop: '10px' }}>
            <span style={{ color: '#e2e8f0', fontWeight: '600' }}>Roster Swaps:</span> Your roster swap replenishes each week.
            Between games, you can swap one player for a new one — costs 1 Floobit per swap. When you swap,
            your previous player's FP are banked and you start earning with the new player.
          </p>
        </Section>

        {/* Trading Cards */}
        <Section title="Trading Cards">
          <p style={textStyle}>
            Collect player <Link to="/cards" style={linkStyle}>Trading Cards</Link> from packs or the shop.
            Each card has a named effect that provides bonus FP, Floobit earnings, or multipliers.
            Higher edition cards have stronger effects.
          </p>
          <p style={{ ...textStyle, marginTop: '10px', fontWeight: '600', color: '#e2e8f0' }}>
            Editions (weakest to strongest):
          </p>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { name: 'Base', color: '#94a3b8', mult: '1.0x' },
              { name: 'Chrome', color: '#60a5fa', mult: '1.5x' },
              { name: 'Holographic', color: '#a78bfa', mult: '2.0x' },
              { name: 'Gold', color: '#f59e0b', mult: '2.5x' },
              { name: 'Prismatic', color: '#f472b6', mult: '3.0x' },
              { name: 'Diamond', color: '#22d3ee', mult: '4.0x' },
            ].map(e => (
              <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: e.color, fontWeight: '700', minWidth: '90px' }}>{e.name}</span>
                <span style={{ color: '#94a3b8' }}>{e.mult} power</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Card Effects */}
        <Section title="Card Effects">
          <p style={{ ...textStyle, marginBottom: '12px' }}>
            Each card has a named effect drawn from a shared pool — effects are not tied to specific
            positions. Effects fall into several categories:
          </p>
          {[
            { label: 'Flat FP', desc: 'Unconditional bonus Fantasy Points added each week.', color: '#4ade80' },
            { label: 'Multiplier', desc: 'Multiplies your total roster FP (e.g. 1.05x).', color: '#60a5fa' },
            { label: 'Floobits', desc: 'Earns bonus Floobits currency each week.', color: '#eab308' },
            { label: 'Conditional', desc: 'Triggers when the card player hits a stat threshold in a game.', color: '#a78bfa' },
            { label: 'Streak', desc: 'Grows stronger over consecutive weeks when its condition is met. Resets on failure.', color: '#f97316' },
            { label: 'Chance', desc: 'Probability-based bonus that rolls at the end of each week.', color: '#38bdf8' },
          ].map(c => (
            <div key={c.label} style={{ ...indicatorRow, marginBottom: '6px' }}>
              <span style={{ color: c.color, fontWeight: '600', fontSize: '12px', minWidth: '100px' }}>
                {c.label}
              </span>
              <span style={{ ...textStyle, fontSize: '12px' }}>{c.desc}</span>
            </div>
          ))}
          <p style={{ ...textStyle, marginTop: '10px' }}>
            <span style={{ color: '#e2e8f0', fontWeight: '600' }}>Synergies:</span> Equipping multiple streak cards
            provides a growth bonus — each active streak boosts the others. Similarly, multiple chance cards
            slightly increase each other's odds of triggering.
          </p>
          <p style={{ ...textStyle, marginTop: '10px' }}>
            <span style={{ color: '#e2e8f0', fontWeight: '600' }}>Match Bonus:</span> When a card's player is on
            your fantasy roster, the card's primary effect gets a 1.5x boost.
          </p>
        </Section>

        {/* Card Equipment */}
        <Section title="Card Equipment">
          <p style={textStyle}>
            Equip up to 5 cards in any combination on the <Link to="/fantasy" style={linkStyle}>Fantasy</Link> page.
            Slots are not position-locked — you can equip any card in any slot.
            Card effects are calculated each week alongside your roster's FP.
            Cards lock in when your roster locks at the start of each week and can be changed between weeks.
          </p>
        </Section>

        {/* The Combine */}
        <Section title="The Combine">
          <p style={textStyle}>
            The Combine is the card upgrade system, accessible from the <Link to="/cards" style={linkStyle}>Cards</Link> page.
            It offers three ways to transform your collection:
          </p>
          <p style={{ ...textStyle, marginTop: '10px' }}>
            <span style={{ color: '#60a5fa', fontWeight: '600' }}>Promotion:</span> Sacrifice a higher-edition card to
            promote another card to that edition. The subject keeps its player and effect but gains the
            higher edition tier. The sacrificed card is destroyed.
          </p>
          <p style={{ ...textStyle, marginTop: '10px' }}>
            <span style={{ color: '#f59e0b', fontWeight: '600' }}>The Blender:</span> Throw in 2 or more cards —
            they are all destroyed and a single new card is created. The result edition depends on
            the total combined value. Player and effect are randomly assigned.
          </p>
          <p style={{ ...textStyle, marginTop: '10px' }}>
            <span style={{ color: '#a78bfa', fontWeight: '600' }}>Transplant:</span> Sacrifice one card to transfer its
            effect onto another card. The target keeps its player and edition but receives the new effect.
            Costs Floobits.
          </p>
        </Section>

        {/* Prognosticate */}
        <Section title="Prognosticate">
          <p style={textStyle}>
            Prognosticate is the weekly predictions game. Pick who you think will win each matchup — before
            or during games. Earlier picks are worth more points: a pre-game pick earns 10 points if correct,
            while a Q3 pick earns only 4 and a Q4 pick earns 2. Overtime picks earn 3 points — more than Q4,
            since the outcome is essentially a coin flip again. You can change your pick at any time before
            the game ends, but the multiplier resets to the current quarter. Points convert to Floobits at
            2:1, and reaching 96+ points in a week earns a Clairvoyant bonus. Weekly and season leaderboards
            rank by total points earned. Access Prognosticate from the <Link to="/dashboard" style={linkStyle}>Dashboard</Link>.
          </p>
        </Section>

        {/* The Front Office */}
        <Section title="The Front Office">
          <p style={textStyle}>
            The Front Office is a fan-driven GM voting system available on your favorite team's page
            starting in Week 10 of each season. As a board member, you can issue directives to influence
            team decisions — fire coaches, re-sign or cut players, nominate coaching replacements,
            and request specific free agents.
          </p>
          <p style={{ ...textStyle, marginTop: '10px' }}>
            Each directive costs Floobits and counts toward your seasonal allowance. Motions require
            a quorum of directives from active board members before they can be considered for
            ratification. All motions are resolved during the offseason.
          </p>
        </Section>

        {/* Floobits Economy */}
        <Section title="Floobits">
          <p style={{ ...textStyle, marginBottom: '12px' }}>
            Floobits are the in-app currency. Here's how you earn and spend them:
          </p>
          <p style={{ ...textStyle, fontWeight: '600', color: '#e2e8f0', marginBottom: '6px' }}>
            Earning:
          </p>
          <div style={{ marginBottom: '12px', paddingLeft: '8px' }}>
            {[
              'Weekly leaderboard: 1st = 30, 2nd = 20, 3rd = 15 (top 25% get 5)',
              'Season leaderboard: 1st = 200, 2nd = 125, 3rd = 75 (top 25% get 25)',
              'Season FP payout: 1 Floobit per 25 FP earned',
              'Prognosticate: points x 0.5 Floobits, bonus for perfect weeks',
              'Favorite team clinches playoffs: 25',
              'Favorite team clinches top seed: 50',
              'Favorite team wins Floosbowl: 150',
              'Floobit card effects: earn Floobits weekly from equipped cards',
            ].map((line, i) => (
              <div key={i} style={{ ...textStyle, fontSize: '12px', marginBottom: '3px', display: 'flex', gap: '6px' }}>
                <span style={{ color: '#94a3b8' }}>-</span> {line}
              </div>
            ))}
          </div>
          <p style={{ ...textStyle, fontWeight: '600', color: '#e2e8f0', marginBottom: '6px' }}>
            Spending:
          </p>
          <div style={{ paddingLeft: '8px' }}>
            {[
              'Humble Pack: 100 Floobits (3 cards)',
              'Proper Pack: 250 Floobits (5 cards, guaranteed Chrome+)',
              'Grand Pack: 600 Floobits (5 cards, guaranteed Holo+)',
              'Exquisite Pack: 1500 Floobits (5 cards, guaranteed Prismatic+)',
              'Featured cards in the shop (rotating selection)',
              'Roster swaps: 1 Floobit per swap',
              'Transplant operations in The Combine',
              'Front Office directives (team management votes)',
            ].map((line, i) => (
              <div key={i} style={{ ...textStyle, fontSize: '12px', marginBottom: '3px', display: 'flex', gap: '6px' }}>
                <span style={{ color: '#94a3b8' }}>-</span> {line}
              </div>
            ))}
          </div>
        </Section>

        {/* Season Schedule */}
        <Section title="Season Schedule">
          <p style={{ ...textStyle, marginBottom: '16px' }}>
            Each season plays out over the course of a week on a fixed real-world schedule. All game times are Eastern (adjust for your time zone).
          </p>

          {[
            { day: 'Monday \u2013 Thursday', label: 'Regular Season', desc: '28 rounds of games played across 4 days (7 rounds per day). Each round kicks off on the hour from 11 AM to 5 PM. Every team plays a mix of intra-league and inter-league matchups.' },
            { day: 'Thursday Evening', label: 'MVP Announcement', desc: 'After the final regular season round, the season MVP is announced based on cumulative performance ratings.' },
            { day: 'Friday', label: 'Playoffs', desc: 'All playoff rounds are played on Friday \u2014 two rounds of playoff games, the league championships, and the Floosbowl. 6 teams per league qualify, with the top 2 seeds earning a first-round bye.' },
            { day: 'Saturday', label: 'Retirements & Free Agency', desc: 'Players with expiring contracts and aging veterans retire. Hall of Fame inductions are made for eligible retirees. Then teams sign available free agents to fill roster gaps \u2014 draft order goes from worst record to best, with the champion picking last.' },
            { day: 'Sunday', label: 'Offseason & New Season', desc: 'Coaches train and develop their players \u2014 players may improve, regress, or stay the same based on coaching ability. Performance ratings reset, team ratings are recalculated, and a new schedule is generated for the next season.' },
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
  )
}

export default AboutPage
