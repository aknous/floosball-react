import React, { useEffect, useMemo, useState } from 'react'
import { SignInButton } from '@clerk/react'
import { useAuth } from '@/contexts/AuthContext'
import { useGames } from '@/contexts/GamesContext'
import { useAchievements } from '@/contexts/AchievementsContext'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { GameModalNew } from '@/Components/GameModalNew'
import { BG, BORDER, TEXT, ACCENT, FONT, RAIL_WIDTH, font } from '@/Components/Shell/tokens'
import WelcomeHero from './WelcomeHero'
import LeagueNews, { type NewsItem } from './LeagueNews'
import TopPlayers, { type LeaderRow } from './TopPlayers'
import YourTeamCard, { type RecentResult } from './YourTeamCard'
import YourNumbers, { type NumbersCell, type NumbersAction } from './YourNumbers'
import CoresStatusPanel from './CoresStatusPanel'
import type { LeagueStandings, TeamStanding } from '@/Views/Standings/standingsTypes'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * How many news stories the feed carries. The feed itself is cumulative and never
 * cleared — this is the window onto it, so a story falls off the bottom when newer ones
 * push it out, not when the week rolls over.
 */
const NEWS_LENGTH = 10

/**
 * The stat leaderboards Top Players tracks, in the order they render — one row each,
 * showing whoever currently leads it.
 *
 * Ordered by phase of the game (throw, run, catch, kick) rather than by importance, so
 * the board reads as a tour of the season instead of a ranking. Ten rows: enough to fill
 * the board without turning it into the stats page.
 */
const LEADER_CATEGORIES: { category: string; label: string; format?: (v: number) => string }[] = [
  { category: 'passing_yards', label: 'PASS YDS' },
  { category: 'passing_tds', label: 'PASS TDS' },
  { category: 'completions', label: 'COMPLETIONS' },
  { category: 'rushing_yards', label: 'RUSH YDS' },
  { category: 'rushing_tds', label: 'RUSH TDS' },
  { category: 'receiving_yards', label: 'REC YDS' },
  { category: 'receptions', label: 'RECEPTIONS' },
  { category: 'receiving_tds', label: 'REC TDS' },
  { category: 'fg_made', label: 'FIELD GOALS' },
  { category: 'fantasy_points', label: 'FANTASY PTS', format: v => v.toFixed(0) },
]

/**
 * The signed-in landing page.
 *
 * It answers four questions in one screen — what is happening right now, what happened in
 * the league, who is worth watching, and how am I doing — and deliberately does NOT
 * reproduce the game board or the standings. The nav owns that navigation.
 *
 * There is no season-progress bar and no row of go-to buttons. Both were removed in
 * review as redundant with the nav.
 */
const FrontPage: React.FC = () => {
  const { user } = useAuth()
  const { games } = useGames()
  const { unclaimedCount } = useAchievements()
  const { myEntry } = useFantasySnapshot()
  const { event: wsEvent } = useSeasonWebSocket()
  const { seasonState } = useFloosball()

  const [openGameId, setOpenGameId] = useState<number | null>(null)
  const [news, setNews] = useState<{ lead: NewsItem | null; items: NewsItem[] }>({ lead: null, items: [] })
  const [leaders, setLeaders] = useState<LeaderRow[]>([])
  const [leagues, setLeagues] = useState<LeagueStandings[]>([])
  const [showcase, setShowcase] = useState<any>(null)
  const [pickem, setPickem] = useState<{ correct: number; total: number; accuracy: number } | null>(null)

  const gameList = useMemo(() => Array.from(games.values()), [games])
  const favouriteTeamId = user?.favoriteTeamId ?? null

  /**
   * Refetch counters, one per feed.
   *
   * A dependency of `wsEvent.type === 'week_start'` looks right and is not: it is a
   * BOOLEAN, so it flips false→true on the first week rollover and then stays true for
   * every later one. The effect would fire once and never again. Counting the events
   * gives each one a distinct value.
   */
  const [newsTick, setNewsTick] = useState(0)
  const [standingsTick, setStandingsTick] = useState(0)
  const [leadersTick, setLeadersTick] = useState(0)
  useEffect(() => {
    const type = (wsEvent as any)?.type
    // The feed is cumulative and published as things happen, so it refetches on anything
    // that PRODUCES news — a finished game (upsets, big games, records), a league_news
    // broadcast (clinches, rule changes, awakenings, criticality) — not just on the week
    // rollover.
    if (type === 'game_end' || type === 'league_news' || type === 'week_start' || type === 'season_start') {
      setNewsTick(n => n + 1)
    }
    if (type === 'standings_update' || type === 'game_end') setStandingsTick(n => n + 1)
    // ⚠️ Top Players used to fetch once on mount and never again. Season totals only move
    // when a game finishes, which made it look right — until a season rolled over or the
    // sim restarted fresh, at which point the board kept showing the PREVIOUS season's
    // numbers over a league that had played nothing.
    if (type === 'game_end' || type === 'week_start' || type === 'season_start') {
      setLeadersTick(n => n + 1)
    }
  }, [wsEvent])

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/front-page/news?limit=${NEWS_LENGTH}`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setNews(json?.data ?? { lead: null, items: [] }) })
      .catch(() => { /* the module hides itself when empty */ })
    return () => { cancelled = true }
  }, [newsTick])

  useEffect(() => {
    let cancelled = false
    Promise.all(LEADER_CATEGORIES.map(async ({ category, label, format }) => {
      try {
        const res = await fetch(`${API_BASE}/stats/leaders?category=${category}&limit=3`)
        const json = await res.json()
        const list = json?.data?.leaders ?? json?.leaders ?? []
        return list.map((p: any) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          teamAbbr: p.teamAbbr,
          teamId: p.teamId,
          teamColor: p.teamColor,
          ratingStars: p.ratingStars,
          statLabel: label,
          statValue: format ? format(p.statValue) : Number(p.statValue).toLocaleString(),
          raw: p.statValue,
        }))
      } catch {
        return []
      }
    })).then(perCategory => {
      if (cancelled) return
      // One row per category, taking the best available player who is not already on the
      // board — otherwise a two-way star occupies three of the eight rows.
      const seen = new Set<number>()
      const rows: LeaderRow[] = []
      perCategory.forEach(list => {
        const pick = list.find((p: any) => p.raw > 0 && !seen.has(p.id))
        if (pick) { seen.add(pick.id); rows.push(pick) }
      })
      setLeaders(rows)
    })
    return () => { cancelled = true }
  }, [leadersTick])

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/standings`)
      .then(r => r.json())
      .then(json => { if (!cancelled && Array.isArray(json)) setLeagues(json) })
      .catch(() => { /* rail team card hides itself */ })
    return () => { cancelled = true }
  }, [standingsTick])

  const { getToken } = useAuth()
  useEffect(() => {
    if (!user) { setShowcase(null); setPickem(null); return }
    let cancelled = false
    const load = async () => {
      try {
        const tok = await getToken()
        const headers = { Authorization: `Bearer ${tok}` }
        const [showcaseRes, pickemRes] = await Promise.all([
          fetch(`${API_BASE}/cards/showcase`, { headers }).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/pickem/leaderboard`, { headers }).then(r => r.json()).catch(() => null),
        ])
        if (cancelled) return
        setShowcase(showcaseRes?.data ?? null)
        const mine = (pickemRes?.data?.season?.entries ?? []).find((e: any) => e.userId === user.id)
        setPickem(mine
          ? { correct: mine.correctCount, total: mine.totalPicks, accuracy: mine.accuracy }
          : null)
      } catch { /* cells fall back to placeholders */ }
    }
    load()
    return () => { cancelled = true }
  }, [user, getToken])

  // ── The rail's team data ──────────────────────────────────────────────────
  const { myTeam, myLeagueName } = useMemo(() => {
    if (favouriteTeamId == null) return { myTeam: null as TeamStanding | null, myLeagueName: '' }
    for (const league of leagues) {
      const found = league.standings.find(t => t.id === favouriteTeamId)
      if (found) return { myTeam: found, myLeagueName: league.name }
    }
    return { myTeam: null as TeamStanding | null, myLeagueName: '' }
  }, [leagues, favouriteTeamId])

  const myLiveGame = useMemo(() => {
    if (favouriteTeamId == null) return null
    return gameList.find(g =>
      g.status === 'Active'
      && (String(g.homeTeam?.id) === String(favouriteTeamId) || String(g.awayTeam?.id) === String(favouriteTeamId)),
    ) ?? null
  }, [gameList, favouriteTeamId])

  const [recent, setRecent] = useState<RecentResult[]>([])
  const [nextFixture, setNextFixture] = useState<{ opponentId: number; opponentAbbr: string; home: boolean } | null>(null)
  useEffect(() => {
    if (favouriteTeamId == null) { setRecent([]); setNextFixture(null); return }
    let cancelled = false
    // The team payload already carries a format-aware schedule (frames matches report
    // frames won, not points), so the form block reads `displayTeamScore` rather than
    // recomputing a result the team page would disagree with.
    fetch(`${API_BASE}/teams/${favouriteTeamId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        const fixtures: any[] = (json?.data ?? json)?.schedule ?? []
        if (!Array.isArray(fixtures)) return
        setRecent(
          fixtures
            .filter(f => f.status === 'Final')
            .slice(-6)
            .map(f => ({
              opponentId: f.opponent?.id,
              opponentAbbr: f.opponent?.abbr ?? '—',
              home: !!f.isHome,
              won: f.result === 'W',
              teamScore: f.displayTeamScore ?? f.teamScore ?? 0,
              opponentScore: f.displayOppScore ?? f.oppScore ?? 0,
            })),
        )
        const next = fixtures.find(f => f.status !== 'Final')
        setNextFixture(next
          ? { opponentId: next.opponent?.id, opponentAbbr: next.opponent?.abbr ?? '—', home: !!next.isHome }
          : null)
      })
      .catch(() => { /* the form block just renders empty */ })
    return () => { cancelled = true }
  }, [favouriteTeamId])

  const fantasyPlayerIds = useMemo(
    () => new Set((myEntry?.players ?? []).map(p => p.playerId)),
    [myEntry],
  )

  // ── Your numbers ──────────────────────────────────────────────────────────
  const numbersCells: NumbersCell[] = useMemo(() => {
    const seasonTotal = myEntry?.seasonTotal ?? 0
    const rank = myEntry?.rank ?? 0
    return [
      {
        key: 'fantasy',
        value: seasonTotal.toFixed(1),
        label: 'FANTASY POINTS',
        note: rank ? `${rank} in the league` : 'Not ranked yet',
        noteColor: rank ? ACCENT.live : TEXT.muted,
      },
      {
        key: 'floobits',
        value: (user?.floobits ?? 0).toLocaleString(),
        valueColor: ACCENT.warning,
        label: 'FLOOBITS',
        note: `${(myEntry?.weekTotal ?? 0).toFixed(0)} FP this week`,
      },
      {
        key: 'showcase',
        value: showcase?.grade ?? '—',
        suffix: showcase?.dividendRate ? `×${showcase.dividendRate}` : undefined,
        label: 'SHOWCASE GRADE',
        note: showcase
          ? `${showcase.slotCount} of ${showcase.maxSlots} slots · ${showcase.score} pts`
          : 'Nothing on show',
      },
      {
        key: 'pickem',
        value: pickem ? `${pickem.correct}–${pickem.total - pickem.correct}` : '—',
        suffix: pickem ? `${pickem.accuracy}%` : undefined,
        valueColor: pickem && pickem.correct * 2 >= pickem.total ? ACCENT.live : TEXT.primary,
        label: 'PROGNOSTICATIONS',
        note: pickem ? `${pickem.total} called this season` : 'No calls yet',
      },
    ]
  }, [myEntry, user, showcase, pickem])

  const numbersActions: NumbersActionList = useMemo(() => {
    const actions: NumbersAction[] = []
    const openPicks = gameList.filter(g => g.status === 'Scheduled').length
    if (openPicks > 0) {
      actions.push({ label: `CALL ${openPicks} GAMES`, to: '/prognostications', color: ACCENT.info })
    }
    if (unclaimedCount > 0) {
      actions.push({ label: `CLAIM ${unclaimedCount} REWARDS`, to: '/achievements', color: ACCENT.warning })
    }
    return actions
  }, [gameList, unclaimedCount])

  const liveCount = gameList.filter(g => g.status === 'Active').length

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `minmax(0,1fr) ${RAIL_WIDTH}px`,
        gap: '30px',
        alignItems: 'start',
        padding: '26px 28px 40px',
        fontFamily: FONT,
      }}>
        <WelcomeHero
          signedIn={!!user}
          seasonNumber={seasonState.seasonNumber}
          weekLabel={seasonState.currentWeekText || `Week ${seasonState.currentWeek}`}
          liveCount={liveCount}
        />

        <div style={{ minWidth: 0 }}>
          {!user && <SignedOutPanel />}
          <LeagueNews lead={news.lead} items={news.items} />
          <TopPlayers
            rows={leaders}
            categoryLabels={LEADER_CATEGORIES.map(c => c.label)}
            fantasyPlayerIds={fantasyPlayerIds}
          />
        </div>

        {/* The rail. The Cores panel sits below the personal cards and shows for signed-out
            visitors too — the state of the simulation is not a personal stat, and it is
            the one thing on this page that is about the world rather than about you. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: 0 }}>
          {user && myTeam && (
            <YourTeamCard
              team={myTeam}
              leagueName={myLeagueName}
              liveGame={myLiveGame}
              nextFixture={nextFixture}
              recent={recent}
              onOpenGame={setOpenGameId}
            />
          )}
          {user && <YourNumbers cells={numbersCells} actions={numbersActions} />}
          <CoresStatusPanel />
        </div>
      </div>

      {openGameId != null && (
        <GameModalNew gameId={openGameId} onClose={() => setOpenGameId(null)} />
      )}
    </>
  )
}

type NumbersActionList = NumbersAction[]

/**
 * Signed-out: the live band and the news render identically, so a visitor sees a working
 * league rather than a wall. Only the personal surfaces are replaced.
 */
const SignedOutPanel: React.FC = () => (
  <div style={{
    background: BG.panel,
    border: `1px solid ${BORDER.hairline}`,
    borderBottom: `3px solid ${ACCENT.info}`,
    padding: '26px 28px',
    marginBottom: '26px',
  }}>
    <div style={{ ...font(700, 10, 1, '0.16em'), color: ACCENT.info }}>SIGN IN</div>
    <h2 style={{
      ...font(800, 30, 1.1, '-0.035em'), color: TEXT.primary,
      margin: '12px 0 0', textWrap: 'balance' as any,
    }}>
      Pick a team and start watching
    </h2>
    <p style={{ ...font(400, 13, 1.65), color: TEXT.muted, margin: '12px 0 0', maxWidth: '560px' }}>
      The league runs whether you are watching or not. Sign in to follow a team, build a
      fantasy roster, collect cards, and call the results before they happen.
    </p>
    <SignInButton mode="modal">
      <button style={{
        ...font(700, 11), color: BG.shell, background: ACCENT.info,
        border: 'none', padding: '11px 16px', marginTop: '18px',
        cursor: 'pointer', fontFamily: FONT,
      }}>SIGN IN</button>
    </SignInButton>
  </div>
)

export default FrontPage
