import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAchievements } from '@/contexts/AchievementsContext'
import { useGames } from '@/contexts/GamesContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { SiDiscord } from 'react-icons/si'
import { VersionPill } from '@/Components/Footer'
import { FaTrophy } from 'react-icons/fa'
import { BG, BORDER, TEXT, ACCENT, FONT, NAV_WIDTH, font } from './tokens'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * The left rail: two labeled groups, THE LEAGUE and YOURS.
 *
 * The badge rules were settled explicitly in design review and are the reason this is a
 * bespoke component rather than a restyle of the old sidebar:
 *
 *   - A NOTIFICATION DOT goes only on tabs that genuinely notify — Achievements (dot +
 *     count, because it is a queue you can empty) and your own team (a bare dot, because
 *     it is a state, not a queue). Awards joins them when its window opens.
 *   - An AMBIENT COUNT is a plain number with no dot. Games gets one: it reports league
 *     activity, not something the user owes.
 *   - Prognostications, Fantasy and Cards carry nothing.
 *
 * Filled pills on all four were tried first and rejected as too loud. Don't reintroduce.
 * A "League news" entry was also removed — the front page IS the news.
 */

type NavEntry = {
  key: string
  label: string
  path: string
  icon: React.ReactNode
}

const ICON = (d: string) => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
)

// No Teams entry (owner) — every standings row links to its team page, so a separate
// index was a second door to the same place.
const LEAGUE_ITEMS: NavEntry[] = [
  { key: 'front', label: 'Front page', path: '/', icon: ICON('M10 2 2 8v10h6v-6h4v6h6V8l-8-6z') },
  { key: 'games', label: 'Games', path: '/games', icon: ICON('M3 2h2v1l11 4-11 4v7H3V2z') },
  { key: 'standings', label: 'Standings', path: '/standings', icon: ICON('M3 3h14v3H3V3zm0 5h14v3H3V8zm0 5h14v3H3v-3z') },
  { key: 'stats', label: 'Stats', path: '/stats', icon: ICON('M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z') },
  // ⚠️ /history was ROUTED BUT UNREACHABLE — no nav entry anywhere, so the Record Book,
  // past seasons, fantasy records and the Hall of Fame were all behind a URL you had to
  // know. Reported as the record book having disappeared; it had not, it had no door.
  // An open book, since the Record Book is what a reader comes here for.
  { key: 'history', label: 'History', path: '/history', icon: ICON('M2 4h6a2 2 0 012 2v10a2 2 0 00-2-2H2V4zm16 0h-6a2 2 0 00-2 2v10a2 2 0 012-2h6V4z') },
]

const YOURS_ITEMS: NavEntry[] = [
  { key: 'team', label: 'Your team', path: '/front-office', icon: ICON('M4 2h12v16h-4v-4h-4v4H4V2z') },
  { key: 'pickem', label: 'Prognostications', path: '/prognostications', icon: ICON('M2 12l4-6 4 4 4-7 4 9v4H2v-4z') },
  { key: 'fantasy', label: 'Fantasy', path: '/fantasy', icon: ICON('M10 1l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.3l6-.8L10 1z') },
  { key: 'cards', label: 'Cards', path: '/cards', icon: ICON('M5 2h10a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1zm1 3v4h8V5H6z') },
  { key: 'achievements', label: 'Achievements', path: '/achievements', icon: <FaTrophy size={16} style={{ flexShrink: 0 }} /> },
]

/**
 * How the game works.
 *
 * ⚠️ Sits BELOW the two groups rather than inside either, next to Discord. It is not a
 * league page and it is not one of yours — it is the other thing you reach for when you
 * are stuck, which is exactly what Discord is, so the two read as a pair at the foot.
 *
 * Outside the `user` gate on purpose: `/about` is one of the two routes that render
 * signed out (App.js), so a reader who has not made an account can still read it.
 * The old sidebar carried it and the redesigned rail dropped it.
 */
const GUIDE_ITEM: NavEntry = {
  key: 'guide',
  label: 'Guide',
  path: '/about',
  icon: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
}

/**
 * The playoff bracket, which only exists once there is one.
 *
 * ⚠️ The route was live and nothing linked it, so the bracket was reachable only by
 * typing /bracket — through the four weeks of the year it is the most interesting page
 * in the app. It appears the same way Awards does: when its moment arrives, and not
 * before, because a bracket in week 3 is an empty grid.
 */
const BRACKET_ITEM: NavEntry = {
  key: 'bracket',
  label: 'Bracket',
  path: '/bracket',
  icon: ICON('M2 3h6v3H5v3H3V6H2V3zm10 0h6v3h-1v3h-2V6h-3V3zM2 11h6v3H5v3H3v-3H2v-3zm10 0h6v3h-1v3h-2v-3h-3v-3z'),
}

/**
 * The offseason home — the Season Recap and the live Draft Board.
 *
 * ⚠️ Both were unreachable before this: they lived in `DashboardNew`, which the
 * restructure left at `/dashboard/legacy`. Same treatment as the Bracket above, for the
 * same reason — a draft board in week 3 is an empty list, so the entry arrives with its
 * moment. It sits with the LEAGUE items rather than the reader's own, because the draft
 * is the league rebuilding itself, not anything the reader owns.
 */
const OFFSEASON_ITEM: NavEntry = {
  key: 'offseason',
  label: 'Offseason',
  path: '/offseason',
  icon: ICON('M10 1l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L2.2 6.7l5.4-.8L10 1z'),
}

const AWARDS_ITEM: NavEntry = {
  key: 'awards',
  label: 'Awards',
  path: '/awards',
  icon: ICON('M10 1l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 6.3l5-.7L10 1z'),
}

// The one link that leaves the app. It sits under the user's own entries rather than in
// either league group, because it is not a page — it is where you go to talk to people.
const DISCORD_URL = 'https://discord.gg/b4DZn3mVfP'

/** Matches the header's own idea of where the regular season ends. */
const REGULAR_SEASON_WEEKS = 28

const GROUP_LABEL: React.CSSProperties = {
  ...font(700, 10, 1, '0.16em'),
  color: TEXT.faint,
  padding: '0 18px 9px',
}

const NotificationDot: React.FC<{ color: string; count?: number }> = ({ color, count }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color }} />
    {count != null && <span style={{ ...font(700, 10), color }}>{count}</span>}
  </span>
)

const AmbientCount: React.FC<{ value: number }> = ({ value }) => (
  <span style={{ ...font(400, 10), color: TEXT.dim, flexShrink: 0 }}>{value}</span>
)

const AppNav: React.FC = () => {
  const location = useLocation()
  const { user } = useAuth()
  const { unclaimedCount } = useAchievements()
  const { games } = useGames()
  const { seasonState } = useFloosball()

  const [awardsOpen, setAwardsOpen] = useState(false)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/awards/status`)
        const json = await res.json()
        if (!cancelled) setAwardsOpen(!!json?.data?.anyOpen)
      } catch { /* keep last */ }
    }
    load()
    const id = setInterval(load, 180_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [location.pathname])

  // Your team's tab shows a bare dot while that team is playing. It is a state ("there is
  // something happening to you right now"), not a queue, which is why it carries no count.
  const favoriteTeamId = user?.favoriteTeamId ?? null
  const liveGames = Array.from(games.values()).filter(g => g.status === 'Active')
  // Team ids arrive as strings on the game payload and as a number on the user.
  const favoriteKey = favoriteTeamId != null ? String(favoriteTeamId) : null
  const yourTeamIsPlaying = favoriteKey != null && liveGames.some(
    g => String(g.homeTeam?.id) === favoriteKey || String(g.awayTeam?.id) === favoriteKey,
  )

  const [favTeamName, setFavTeamName] = useState<string | null>(null)
  useEffect(() => {
    if (!favoriteTeamId) { setFavTeamName(null); return }
    const cacheKey = `favTeamName:${favoriteTeamId}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) setFavTeamName(cached)
    } catch { /* no cache, fetch below */ }
    let cancelled = false
    fetch(`${API_BASE}/teams/${favoriteTeamId}`)
      .then(r => r.json())
      .then(json => {
        const name = (json?.data ?? json)?.name
        if (cancelled || !name) return
        setFavTeamName(name)
        try { localStorage.setItem(cacheKey, name) } catch { /* cache is best-effort */ }
      })
      .catch(() => { /* keep whatever we had */ })
    return () => { cancelled = true }
  }, [favoriteTeamId])

  // ⚠️ No team entry without a team (owner). It rendered as "Your team" with a
  // generic building icon and went to /front-office, which without a club is a page
  // about nobody. The offer to pick one lives on the front page's own team panel,
  // where there is a league on screen to pick from; the nav is for places you
  // already have.
  const yoursItems = YOURS_ITEMS.filter(i => i.key !== 'team' || favoriteTeamId != null)
  // ⚠️ Past the regular season, the bracket joins THE LEAGUE group — it is a view of
  // the competition, not one of the reader's own things. `currentWeek` climbs past 28
  // into the playoff weeks (29-32) and `seasonComplete` covers the gap between the
  // Floos Bowl and the next season starting, so the entry survives the whole postseason
  // rather than vanishing the moment the last game ends.
  const inPlayoffs = seasonState.currentWeek > REGULAR_SEASON_WEEKS || seasonState.seasonComplete
  // The offseason entry replaces the bracket rather than joining it: once the drafts are
  // running the bracket is a settled result, and stacking two postseason entries pushes
  // the standing pages down for a reader who still wants them.
  const isOffseason = seasonState.currentWeekText === 'Offseason'
  const leagueItems = isOffseason ? [...LEAGUE_ITEMS, OFFSEASON_ITEM]
    : inPlayoffs ? [...LEAGUE_ITEMS, BRACKET_ITEM]
      : LEAGUE_ITEMS
  // Awards voting is season's-end only, and it DOES notify — so it takes the dot
  // treatment, and it takes it at the end of the group.
  if (awardsOpen) yoursItems.push(AWARDS_ITEM)

  const renderItem = (item: NavEntry) => {
    const isActive = item.path === '/'
      ? location.pathname === '/'
      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

    let trailing: React.ReactNode = null
    if (item.key === 'games' && liveGames.length > 0) trailing = <AmbientCount value={liveGames.length} />
    else if (item.key === 'achievements' && unclaimedCount > 0) trailing = <NotificationDot color={ACCENT.warning} count={unclaimedCount} />
    else if (item.key === 'team' && yourTeamIsPlaying) trailing = <NotificationDot color={ACCENT.ownTeam} />
    else if (item.key === 'awards') trailing = <NotificationDot color={ACCENT.warning} />

    // The team entry wears its own crest — the page is that team's hub, so its badge is
    // more use than a generic building.
    const icon = item.key === 'team' && favoriteTeamId
      ? <img src={`/avatars/${favoriteTeamId}.png`} alt="" width={17} height={17} style={{ flexShrink: 0, borderRadius: '50%' }} />
      : item.icon

    const label = item.key === 'team' && favTeamName ? favTeamName : item.label

    return (
      <NavLink
        key={item.key}
        to={item.path}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          padding: '9px 18px',
          textDecoration: 'none',
          color: isActive ? TEXT.strong : TEXT.muted,
          background: isActive ? 'rgba(56,189,248,0.10)' : 'transparent',
          borderLeft: `3px solid ${isActive ? ACCENT.info : 'transparent'}`,
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#ffffff' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT.muted }}
      >
        {icon}
        <span style={{
          ...font(isActive ? 700 : 500, 13),
          // 196px is tight for "Prognostications" at 13px. It fits with no headroom — if
          // a label ever grows, widen the rail rather than shrinking the type.
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{label}</span>
        {trailing && <span style={{ flex: 1 }} />}
        {trailing}
      </NavLink>
    )
  }

  return (
    <nav
      className="font-pixel"
      style={{
        width: `${NAV_WIDTH}px`,
        flexShrink: 0,
        background: BG.panel,
        borderRight: `1px solid ${BORDER.hairline}`,
        padding: '18px 0 22px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
        // Fills the shell row, top to bottom, and never moves — the shell owns
        // the viewport and the content column is the thing that scrolls. Any
        // overflow is handled INSIDE the rail (the item list below), so the
        // badge at its foot is always where the foot is.
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Only the ITEM LIST scrolls. The block below it is pinned, because a
          nav that scrolls as one puts its own foot below the fold — which is
          where the version badge was ending up on a short viewport. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={GROUP_LABEL}>THE LEAGUE</div>
      {leagueItems.map(renderItem)}

      {user && (
        <>
          <div style={{ ...GROUP_LABEL, padding: '22px 18px 9px' }}>YOURS</div>
          {yoursItems.map(renderItem)}
        </>
      )}

      <div style={{ marginTop: '14px' }}>{renderItem(GUIDE_ITEM)}</div>

      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          padding: '9px 18px',
          textDecoration: 'none',
          color: TEXT.muted,
          borderLeft: '3px solid transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#ffffff' }}
        onMouseLeave={e => { e.currentTarget.style.color = TEXT.muted }}
      >
        {/* ⚠️ OPTICALLY sized, not nominally. Measured against its neighbours, this is
            what "misshapen" actually was: every other nav icon draws 10-14.6px of ink
            inside a 17px box, while SiDiscord's glyph fills its viewBox edge to edge — at
            size 17 it rendered 17px wide, flush to x=0, wider than anything near it and
            with none of their built-in padding. FaDiscord was worse still (a 640x512
            viewBox letterboxed into a square).
            The Discord mark is genuinely wide and short — its glyph is only 0.76 as tall
            as it is wide — so it reads SMALL next to icons drawing 11-14.6px of ink
            height. Sized to match them on HEIGHT: 19 puts its ink at 14.5px tall, in line
            with its neighbours. The fixed 17px box keeps every label in the rail on the
            same left edge, and the extra pixel of width either side is a logo overhanging
            its slot rather than anything shifting. */}
        <span style={{
          width: '17px', display: 'flex', justifyContent: 'center',
          flexShrink: 0, overflow: 'visible',
        }}>
          {/* flexShrink:0 on the icon matters: without it the 17px slot squeezes the
              19px svg back down to 17 wide, and SVG letterboxing then scales the glyph to
              13px tall again — exactly the size this was meant to fix. It overhangs the
              slot by a pixel each side instead, which is a logo being a logo. */}
          <SiDiscord size={19} style={{ flexShrink: 0 }} />
        </span>
        <span style={{ ...font(500, 13), whiteSpace: 'nowrap' }}>Discord</span>
      </a>

      </div>

      {/* The version badge and its changelog, moved off the fixed footer bar —
          the rail already had a bottom edge doing nothing, and the footer was a
          strip across every page carrying almost nothing else. The instance
          label and season number sat here too and came out (owner): the header
          already carries the season, and 498b is Cores-side lore rather than
          something the rail needs to state on every page. */}
      <div style={{ padding: '18px 18px 4px' }}>
        <VersionPill align="left" />
      </div>
    </nav>
  )
}

export default AppNav
