import React, { useEffect, useMemo, useState } from 'react'
import { SignInButton } from '@clerk/react'
import { useAuth } from '@/contexts/AuthContext'
import { useGames } from '@/contexts/GamesContext'
import { useAchievements } from '@/contexts/AchievementsContext'
import { useFantasySnapshot } from '@/hooks/useFantasySnapshot'
import { useSeasonWebSocket } from '@/contexts/SeasonWebSocketContext'
import { useFloosball } from '@/contexts/FloosballContext'
import { GameModalNew } from '@/Components/GameModalNew'
import { useOpenGame } from '@/hooks/useOpenGame'
import { BG, BORDER, TEXT, ACCENT, FONT, RAIL_WIDTH, font } from '@/Components/Shell/tokens'
import LiveTicker from './LiveTicker'
import LeagueNews, { type NewsItem } from './LeagueNews'
import TopPlayers, { type LeaderRow } from './TopPlayers'
import YourTeamCard, { type RecentResult } from './YourTeamCard'
import YourNumbers, { type NumbersCell, type NumbersAction } from './YourNumbers'
import QuickPicks from './QuickPicks'
import OffseasonHero from './OffseasonHero'
import SeasonOverCard from './SeasonOverCard'
import { useSeasonRecap } from '@/hooks/useSeasonRecap'
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
/**
 * How deep to fetch per category, so the de-duplication below has something to work
 * with.
 *
 * ⚠️ It was 3, and FANTASY PTS came back BLANK because of it. Fantasy points is a
 * composite of the nine categories above it and is drawn LAST, so by the time it is
 * reached nine players are already on the board and its own top three are the players
 * who put them there. Measured on a live season: 2 free candidates in the top 3
 * against 8 in the top 12 — the pool was the constraint, not the data.
 */
const LEADER_POOL = 12

/**
 * One row per category: the best available player who is not already on the board,
 * otherwise a two-way star occupies three of the ten rows.
 *
 * ⚠️ A REPEATED name beats an EMPTY row. If every candidate is already shown, the
 * category still HAS a leader and the reader still came to see who it is; printing
 * "No leader yet" against a category somebody is leading is simply wrong. Only a
 * category nobody has scored in stays blank.
 *
 * Shared by the live `/api/stats/leaders` path and the offseason recap fallback so the
 * board cannot follow two different rules depending on the time of year.
 */
function pickOnePerCategory(perCategory: (LeaderRow & { raw: number })[][]): LeaderRow[] {
  const seen = new Set<number>()
  const rows: LeaderRow[] = []
  perCategory.forEach(list => {
    const fresh = list.find(p => p.raw > 0 && !seen.has(p.id))
    const pick = fresh ?? list.find(p => p.raw > 0)
    if (pick) { seen.add(pick.id); rows.push(pick) }
  })
  return rows
}

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
  // ⚠️ The userId argument is not optional in practice — `myEntry` is
  // `entries.find(e => e.userId === userId)`, which is undefined without it. Called
  // bare, this page's own fantasy cell read 0.0 and "Not ranked yet" for every reader
  // forever, and the leaders table never marked a player the reader had rostered.
  const { myEntry } = useFantasySnapshot(user?.id)
  const { event: wsEvent } = useSeasonWebSocket()
  const { seasonState } = useFloosball()
  // ⚠️ The same string the legacy dashboard gated on, so the front page and the nav
  // cannot disagree about whether it is the offseason.
  const isOffseason = seasonState?.currentWeekText === 'Offseason'
  // ⚠️ Gated, not merely unread. `/api/recap` is a consolidated payload and nothing on
  // this page looks at it outside the offseason, so fetching it on every landing-page
  // load for eleven months of the year would be pure waste.
  const { recap: seasonRecap } = useSeasonRecap(isOffseason)

  // Desktop routes to the game's own page; mobile keeps the modal.
  const { openGame, modalGameId, closeGame } = useOpenGame()
  const [news, setNews] = useState<{ lead: NewsItem | null; items: NewsItem[] }>({ lead: null, items: [] })
  const [leaders, setLeaders] = useState<LeaderRow[]>([])
  const [leagues, setLeagues] = useState<LeagueStandings[]>([])
  const [showcase, setShowcase] = useState<any>(null)
  const [pickem, setPickem] = useState<{
    correct: number; total: number; accuracy: number
    /** This week's slate, so the cell can lead with the games in front of the reader. */
    weekCorrect: number; weekTotal: number
  } | null>(null)

  const gameList = useMemo(() => Array.from(games.values()), [games])
  const favoriteTeamId = user?.favoriteTeamId ?? null

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
    // ⚠️ `.event`, NOT `.type`. Every season-socket payload is keyed `event` (see
    // api/event_models.py); `.type` is only ever sent BY the client, on identify and
    // watch. Reading `.type` here yielded undefined for every message, so this effect
    // never fired once and the panel below only ever refreshed on mount.
    const type = (wsEvent as any)?.event ?? (wsEvent as any)?.type
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

    // ⚠️ ONCE THE SEASON ENDS, `/api/stats/leaders` HAS NOTHING TO SERVE. Every category
    // it reads comes out of the player's live `seasonStatsDict`, and the sim archives
    // that dict and resets it to blank the moment the Floos Bowl finishes — so from the
    // final whistle until the next season's first game the whole panel read "No leader
    // yet". The one row that survived is the tell rather than an exception: `fantasy_points`
    // alone also adds the in-game total, so it showed the BOWL's own points (42) as if
    // they were a season figure.
    //
    // `/api/recap` carries the archived leaders for the season just finished, and the
    // offseason front page already fetches it for the hero and the personal rail, so this
    // is a re-read of a payload that is on the page rather than a new request.
    //
    // ⚠️ It replaces the live categories rather than filling the empty ones. Falling back
    // only where the list came back empty would have left that bogus 42 standing, since
    // that row is not empty — it is wrong.
    if (isOffseason && seasonRecap?.leaders?.length) {
      const byCategory = new Map(seasonRecap.leaders.map(c => [c.category, c]))
      setLeaders(pickOnePerCategory(LEADER_CATEGORIES.map(({ category, label, format }) => {
        const entry = byCategory.get(category)
        return (entry?.leaders ?? []).map(p => ({
          id: p.id,
          name: p.name,
          position: p.position ?? '',
          teamAbbr: p.teamAbbr ?? '',
          teamId: p.teamId ?? null,
          teamColor: p.teamColor ?? TEXT.secondary,
          ratingStars: p.stars ?? 0,
          // The recap does not carry anomaly state, and it should not: the panel is
          // reporting a finished season, where "currently awakened" is not a fact about
          // the year being described.
          awakened: false,
          statLabel: label,
          statValue: format ? format(p.value ?? 0) : Number(p.value ?? 0).toLocaleString(),
          raw: p.value ?? 0,
        }))
      })))
      return () => { cancelled = true }
    }

    Promise.all(LEADER_CATEGORIES.map(async ({ category, label, format }) => {
      try {
        const res = await fetch(`${API_BASE}/stats/leaders?category=${category}&limit=${LEADER_POOL}`)
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
          awakened: !!p.awakened,
          statLabel: label,
          statValue: format ? format(p.statValue) : Number(p.statValue).toLocaleString(),
          raw: p.statValue,
        }))
      } catch {
        return []
      }
    })).then(perCategory => {
      if (cancelled) return
      setLeaders(pickOnePerCategory(perCategory))
    })
    return () => { cancelled = true }
  }, [leadersTick, isOffseason, seasonRecap])

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
        // The endpoint returns BOTH boards in one payload — the season entries were
        // already being read and the week ones thrown away.
        const mine = (pickemRes?.data?.season?.entries ?? []).find((e: any) => e.userId === user.id)
        const mineWeek = (pickemRes?.data?.week?.entries ?? []).find((e: any) => e.userId === user.id)
        setPickem(mine
          ? {
            correct: mine.correctCount, total: mine.totalPicks, accuracy: mine.accuracy,
            weekCorrect: mineWeek?.correctCount ?? 0, weekTotal: mineWeek?.totalPicks ?? 0,
          }
          : null)
      } catch { /* cells fall back to placeholders */ }
    }
    load()
    return () => { cancelled = true }
  }, [user, getToken])

  // ── The rail's team data ──────────────────────────────────────────────────
  const { myTeam, myLeagueName } = useMemo(() => {
    if (favoriteTeamId == null) return { myTeam: null as TeamStanding | null, myLeagueName: '' }
    for (const league of leagues) {
      const found = league.standings.find(t => t.id === favoriteTeamId)
      if (found) return { myTeam: found, myLeagueName: league.name }
    }
    return { myTeam: null as TeamStanding | null, myLeagueName: '' }
  }, [leagues, favoriteTeamId])

  // Any game underway anywhere in the league. The picker closes while the league is
  // playing — see QuickPicks.
  const gamesActive = useMemo(() => gameList.some(g => g.status === 'Active'), [gameList])

  const myLiveGame = useMemo(() => {
    if (favoriteTeamId == null) return null
    return gameList.find(g =>
      g.status === 'Active'
      && (String(g.homeTeam?.id) === String(favoriteTeamId) || String(g.awayTeam?.id) === String(favoriteTeamId)),
    ) ?? null
  }, [gameList, favoriteTeamId])

  const [recent, setRecent] = useState<RecentResult[]>([])
  const [nextFixture, setNextFixture] = useState<{ opponentId: number; opponentAbbr: string; home: boolean } | null>(null)
  useEffect(() => {
    if (favoriteTeamId == null) { setRecent([]); setNextFixture(null); return }
    let cancelled = false
    // The team payload already carries a format-aware schedule (frames matches report
    // frames won, not points), so the form block reads `displayTeamScore` rather than
    // recomputing a result the team page would disagree with.
    fetch(`${API_BASE}/teams/${favoriteTeamId}`)
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
  }, [favoriteTeamId])

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
        to: '/fantasy',
        // ⚠️ "this SEASON", not this week. `rank` is the snapshot's season rank —
        // `entries.sort(key=e["seasonTotal"])` in fantasyTracker — and the number above
        // it is the season total, so a weekly label would name the wrong contest. The
        // two read the same in week 1, which is where "this week" looks right.
        note: rank ? `Ranked #${rank} this season` : 'Not ranked yet',
        noteColor: rank ? ACCENT.live : TEXT.muted,
      },
      {
        key: 'floobits',
        value: (user?.floobits ?? 0).toLocaleString(),
        // The unit, matching the header chip and the "50F" the shop prices in.
        suffix: 'F',
        valueColor: ACCENT.warning,
        label: 'FLOOBITS',
        // The Shop is a modal, not a route — the header's floobits chip opens it the same
        // way. Navigating to /cards would land on the collection, which is where floobits
        // have already been spent rather than where you spend them.
        onClick: () => window.dispatchEvent(new Event('floosball:show-shop')),
        // ⚠️ No note. It read "0 FP this week" under a floobits balance, which is a
        // fantasy-points figure sitting under a currency and answering a question
        // nobody asked of that cell — the FANTASY POINTS cell two along already
        // carries the season figure.
      },
      {
        key: 'showcase',
        value: showcase?.grade ?? '—',
        // ⚠️ The dividend RATE came off (owner). As a bare "×0.13" beside a letter
        // grade it explained nothing — it is the rate that turns showcase points
        // into floobits, which is a mechanic, not a status. The grade says how the
        // showcase is doing and the points say how much of it there is; that is the
        // whole job of an at-a-glance cell.
        label: 'SHOWCASE',
        to: '/cards?view=showcase',
        note: showcase
          ? `${showcase.score} pts · ${showcase.slotCount} of ${showcase.maxSlots} slots`
          : 'Nothing on show',
      },
      {
        key: 'pickem',
        value: pickem ? `${pickem.correct}–${pickem.total - pickem.correct}` : '—',
        suffix: pickem ? `${pickem.accuracy}%` : undefined,
        valueColor: pickem && pickem.correct * 2 >= pickem.total ? ACCENT.live : TEXT.primary,
        label: 'PROGNOSTICATIONS',
        to: '/prognostications',
        // "Calls" was the old word for it (owner) — these are PICKS. And the cell
        // showed only a season total, which says nothing about the slate a reader is
        // actually watching, so this week's record leads and the season follows.
        note: pickem
          ? (pickem.weekTotal > 0
            ? `${pickem.weekCorrect}/${pickem.weekTotal} this week · ${pickem.total} picks this season`
            : `${pickem.total} picks this season`)
          : 'No picks yet',
      },
    ]
  }, [myEntry, user, showcase, pickem])

  const numbersActions: NumbersActionList = useMemo(() => {
    const actions: NumbersAction[] = []
    const openPicks = gameList.filter(g => g.status === 'Scheduled').length
    if (openPicks > 0) {
      actions.push({ label: `PICK ${openPicks} GAMES`, to: '/prognostications', color: ACCENT.info })
    }
    if (unclaimedCount > 0) {
      actions.push({ label: `CLAIM ${unclaimedCount} REWARDS`, to: '/achievements', color: ACCENT.warning })
    }
    return actions
  }, [gameList, unclaimedCount])


  return (
    <>
      <div
        className={user ? 'frontGrid' : 'frontGrid noRail'}
        style={{
          '--railWidth': `${RAIL_WIDTH}px`,
          padding: '26px 28px 40px',
          fontFamily: FONT,
        } as React.CSSProperties}
      >
        <div className="frontHero">
          {/* The rail carries the SLATE now (owner). It was a static welcome message
              beside four nav links that duplicated the sidebar — nothing in it was
              live or unavailable elsewhere, which is exactly why it read as sparse. */}
          {/* ⚠️ In the offseason there IS no slate, so the ticker renders an empty week
              in the most prominent column on the landing page. The signpost to the
              recap and the draft board goes here instead. */}
          {isOffseason ? (
            <OffseasonHero recap={seasonRecap} />
          ) : (
            <LiveTicker
              games={gameList}
              weekLabel={seasonState.currentWeekText || `Week ${seasonState.currentWeek}`}
              onOpen={openGame}
            />
          )}
        </div>

        <div className="frontMain" style={{ minWidth: 0 }}>
          {!user && <SignedOutPanel />}
          <LeagueNews lead={news.lead} items={news.items} />
          <TopPlayers
            rows={leaders}
            categoryLabels={LEADER_CATEGORIES.map(c => c.label)}
            fantasyPlayerIds={fantasyPlayerIds}
          />
        </div>

        {/* The personal rail. Signed out it does not render at all and the grid drops to
            a single column — the Cores used to hold that side, and they now ride at the
            top of the news instead. */}
        {user && (
          <div className="frontRail" style={{
            display: 'flex', flexDirection: 'column', gap: '22px', minWidth: 0,
          }}>
            {myTeam ? (
              <YourTeamCard
                team={myTeam}
                leagueName={myLeagueName}
                liveGame={myLiveGame}
                nextFixture={nextFixture}
                recent={recent}
                onOpenGame={openGame}
              />
            ) : (
              /* ⚠️ The team picker is no longer forced open at sign-in (owner). This is
                 where it is offered instead: a panel in the place the club would occupy,
                 shown only to a signed-in reader who has not chosen one. Asking here
                 means asking with the league already on screen behind it, rather than
                 through a modal over a page they have not seen yet. */
              <div style={{
                background: BG.card, border: `1px solid ${BORDER.hairline}`,
                padding: '20px 18px',
              }}>
                <div style={{ ...font(700, 11, 1, '0.12em'), color: TEXT.muted }}>YOUR TEAM</div>
                <div style={{ ...font(400, 13, 1.5), color: TEXT.secondary, margin: '10px 0 16px' }}>
                  Pick a team and this panel follows them all season, with their live
                  score, next fixture and recent form.
                </div>
                <button
                  onClick={() => window.dispatchEvent(new Event('floosball:show-favorite-team-picker'))}
                  style={{
                    ...font(700, 12, 1, '0.06em'), color: BG.shell, background: ACCENT.info,
                    border: 'none', padding: '10px 16px', cursor: 'pointer',
                    fontFamily: FONT, width: '100%',
                  }}
                >PICK A TEAM</button>
              </div>
            )}
            <YourNumbers cells={numbersCells} actions={numbersActions} />
            {/* Below the numbers: the slate, one game at a time. The rail is where a
                reader's own business lives, and a pick is business. */}
            {/* Same trade in the rail: there are no fixtures to pick, so the slot
                carries how the season finished instead. */}
            {isOffseason
              ? <SeasonOverCard recap={seasonRecap} userId={user?.id} />
              : <QuickPicks favoriteTeamId={favoriteTeamId} gamesActive={gamesActive} />}
          </div>
        )}
      </div>

      {modalGameId != null && (
        <GameModalNew gameId={modalGameId} onClose={closeGame} />
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
