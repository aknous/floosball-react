import React, { useMemo, useState, useEffect } from 'react'
import { usePlayoffBracket } from '@/hooks/usePlayoffBracket'
import { useIsMobile } from '@/hooks/useIsMobile'
import { projectBracket, type Matchup } from '@/utils/bracketProjection'
import {
  ROUND_ORDER, ROUND_LABEL, ROUND_POINTS,
  type RoundKey, type BracketPredictions, type BracketSeedTeam,
} from '@/types/playoffBracket'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const avatarUrl = (teamId: number, size = 22) => `${API_BASE}/teams/${teamId}/avatar?size=${size}`

const C = {
  panel: '#1e293b', inner: '#0f172a', border: '#334155',
  text: '#e2e8f0', body: '#cbd5e1', muted: '#94a3b8',
  pick: '#3b82f6', correct: '#22c55e', wrong: '#ef4444',
}

const matchIds = (ms: Matchup[]) => new Set(ms.flatMap((m) => [m.higher.teamId, m.lower.teamId]))

/** Drop downstream picks that are no longer valid after an upstream change, by
 * cascading the projection round-by-round. */
function normalize(conferences: Record<string, BracketSeedTeam[]>, picks: BracketPredictions): BracketPredictions {
  const cur: BracketPredictions = { round1: [...(picks.round1 || [])] }
  let proj = projectBracket(conferences, cur)
  const keepIn = (ids: number[] | undefined, valid: Set<number>) => (ids || []).filter((id) => valid.has(id))

  // round1 competitors = all non-bye teams across confs
  const r1Valid = new Set(Object.values(proj.round1).flatMap((ms) => [...matchIds(ms)]))
  cur.round1 = keepIn(picks.round1, r1Valid)
  proj = projectBracket(conferences, cur)

  const r2Valid = new Set(Object.values(proj.round2).flatMap((ms) => [...matchIds(ms)]))
  cur.round2 = keepIn(picks.round2, r2Valid)
  proj = projectBracket(conferences, cur)

  const lcValid = new Set(Object.values(proj.league_championship).flatMap((ms) => [...matchIds(ms)]))
  cur.league_championship = keepIn(picks.league_championship, lcValid)
  proj = projectBracket(conferences, cur)

  cur.floosbowl = keepIn(picks.floosbowl, matchIds(proj.floosbowl))
  return cur
}

type ViewMode = 'picks' | 'results'

const BracketView: React.FC = () => {
  const { template, mine, leaderboard, loading, submitting, submit } = usePlayoffBracket()
  const [picks, setPicks] = useState<BracketPredictions>({})
  // null = follow the default (results once locked, picks while open); set by
  // the toggle to override.
  const [viewOverride, setViewOverride] = useState<ViewMode | null>(null)
  const isMobile = useIsMobile()

  const conferences = template?.conferences
  const locked = !!template && !template.open
  const mode: ViewMode = viewOverride ?? (locked ? 'results' : 'picks')

  // Seed local picks from the user's saved bracket once data arrives.
  useEffect(() => {
    const saved = template?.myPredictions || mine?.predictions
    if (saved) setPicks(saved)
  }, [template, mine])

  // The user's hypothetical tree (reshapes as they pick).
  const projected = useMemo(
    () => (conferences ? projectBracket(conferences, picks) : null),
    [conferences, picks],
  )
  // The REAL bracket: re-seed from whoever actually advanced. Fills in round by
  // round as results land, so every round stays reviewable even if you miss it.
  const actualProjected = useMemo(
    () => (conferences ? projectBracket(conferences, mine?.actualAdvancers || {}) : null),
    [conferences, mine],
  )
  // Final score of each matchup, keyed by the team pair (single-elimination,
  // so a pair meets at most once).
  const scoreByPair = useMemo(() => {
    const map = new Map<string, Record<number, number>>()
    for (const g of mine?.gameResults || []) {
      const key = g.homeTeamId < g.awayTeamId ? `${g.homeTeamId}-${g.awayTeamId}` : `${g.awayTeamId}-${g.homeTeamId}`
      map.set(key, { [g.homeTeamId]: g.homeScore, [g.awayTeamId]: g.awayScore })
    }
    return map
  }, [mine])
  // Round index (0-based, matching ROUND_ORDER) at which each team lost a real
  // game. Drives the My Picks view: once your pick is out, it stays red for the
  // rest of the tree, not just the round it lost.
  const eliminatedRound = useMemo(() => {
    const m: Record<number, number> = {}
    for (const g of mine?.gameResults || []) {
      const loserId = g.homeScore > g.awayScore ? g.awayTeamId : g.homeTeamId
      m[loserId] = g.round - 1
    }
    return m
  }, [mine])

  if (loading) {
    return <div style={{ padding: 24, color: C.muted, fontSize: 13 }}>Loading the bracket…</div>
  }
  if (!template?.available || !conferences || !projected) {
    return (
      <div style={{ padding: 24, color: C.muted, fontSize: 13, maxWidth: 560 }}>
        <h2 style={{ color: C.text, fontSize: 18, margin: '0 0 8px' }}>Playoff Bracket</h2>
        The bracket opens once the playoffs are seeded. Check back when the regular season wraps. You'll
        pick every game through the Floos Bowl champion.
      </div>
    )
  }

  const actual = mine?.actualAdvancers || {}
  const roundResolved = (round: RoundKey) => (actual[round] || []).length > 0
  const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const displayTree = (mode === 'results' && actualProjected) ? actualProjected : projected

  // Dual-sided (March Madness) layout: each league funnels inward to the
  // Floos Bowl in the center. One league on the left, the other mirrored on the
  // right. Per-league rounds run R1 → R2 → League Championship toward center.
  const leagues = Object.keys(conferences)
  const leagueLeft = leagues[0]
  const leagueRight = leagues[1]
  const perLeagueRounds = ROUND_ORDER.filter((r) => r !== 'floosbowl')

  const pickWinner = (round: RoundKey, m: Matchup, teamId: number) => {
    if (locked || mode === 'results') return
    const others = (picks[round] || []).filter((id) => id !== m.higher.teamId && id !== m.lower.teamId)
    setPicks(normalize(conferences, { ...picks, [round]: [...others, teamId] }))
  }

  const roundComplete = (round: RoundKey): boolean => {
    const ms = round === 'floosbowl'
      ? projected.floosbowl
      : Object.values((projected as any)[round] as Record<string, Matchup[]>).flat()
    const chosen = new Set(picks[round] || [])
    return ms.length > 0 && ms.every((m) => chosen.has(m.higher.teamId) || chosen.has(m.lower.teamId))
  }
  const allComplete = ROUND_ORDER.every(roundComplete)

  const TeamPick: React.FC<{ team: BracketSeedTeam; round: RoundKey; m: Matchup; side?: 'left' | 'right' }> = ({ team, round, m, side = 'left' }) => {
    const picked = (picks[round] || []).includes(team.teamId)
    const advanced = (actual[round] || []).includes(team.teamId)
    const resolved = roundResolved(round)
    let border = C.border, bg = C.inner, fg = C.body

    if (mode === 'results') {
      // Pure results: winners green (with scores), eliminated teams dimmed,
      // not-yet-played matchups neutral. No pick overlay.
      if (advanced) { border = C.correct; bg = 'rgba(34,197,94,0.12)'; fg = C.text }
      else if (resolved) { fg = C.muted }
    } else if (picked && locked) {
      // My Picks after lock: green = this pick advanced; red = the team is out
      // by this round (it lost here or earlier, so the pick is dead for the
      // rest of the tree); blue = still alive, not yet decided.
      const elimR = eliminatedRound[team.teamId]
      if (advanced) { border = C.correct; bg = 'rgba(34,197,94,0.12)'; fg = C.text }
      else if (elimR !== undefined && elimR <= ROUND_ORDER.indexOf(round)) {
        border = C.wrong; bg = 'rgba(239,68,68,0.12)'; fg = C.text
      } else { border = C.pick; bg = 'rgba(59,130,246,0.10)'; fg = C.text }
    } else if (picked) {
      border = C.pick; bg = 'rgba(59,130,246,0.15)'; fg = C.text
    }

    const score = mode === 'results'
      ? scoreByPair.get(pairKey(m.higher.teamId, m.lower.teamId))?.[team.teamId]
      : undefined
    const bold = advanced || (mode === 'picks' && picked)
    const interactive = mode === 'picks' && !locked
    const mirror = side === 'right'

    // Secondary stat line: real W-L + ELO when the payload carries them, else
    // fall back to the seeding stats we always have (win% as a record proxy
    // and point differential).
    const pct = team.winPct ?? 0
    const recordText = (team.wins != null && team.losses != null)
      ? `${team.wins}-${team.losses}`
      : (pct >= 1 ? '1.000' : `.${Math.round(pct * 1000).toString().padStart(3, '0')}`)
    const diff = Math.round(team.scoreDiff ?? 0)
    const eloText = team.elo != null ? `${Math.round(team.elo)} ELO` : null
    const subLine = [recordText, `${diff >= 0 ? '+' : ''}${diff}`, eloText].filter(Boolean).join('  ·  ')

    return (
      <button
        onClick={() => pickWinner(round, m, team.teamId)}
        disabled={!interactive}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, width: '100%',
          flexDirection: mirror ? 'row-reverse' : 'row',
          padding: isMobile ? '8px 9px' : '8px 11px', backgroundColor: bg, color: fg,
          border: `1px solid ${border}`, borderRadius: 5,
          cursor: interactive ? 'pointer' : 'default',
        }}
      >
        <span style={{ color: C.muted, fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: 'center' }}>{team.seed}</span>
        <img src={avatarUrl(team.teamId, 26)} alt="" width={26} height={26} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, alignItems: mirror ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {team.teamName}
          </span>
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {subLine}
          </span>
        </span>
        {score != null && (
          <span style={{ fontWeight: 800, fontSize: 15, color: advanced ? C.correct : C.body, minWidth: 18, textAlign: 'center' }}>
            {score}
          </span>
        )}
      </button>
    )
  }

  const MatchupCell: React.FC<{ round: RoundKey; m: Matchup; side?: 'left' | 'right' }> = ({ round, m, side }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <TeamPick team={m.higher} round={round} m={m} side={side} />
      <TeamPick team={m.lower} round={round} m={m} side={side} />
    </div>
  )

  const ColHeader: React.FC<{ round: RoundKey; side: 'left' | 'right' }> = ({ round, side }) => {
    const pr = mine?.perRound?.[round]
    return (
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.text,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10,
        display: 'flex', justifyContent: 'space-between', gap: 6,
        flexDirection: side === 'right' ? 'row-reverse' : 'row',
      }}>
        <span>{ROUND_LABEL[round]}</span>
        <span style={{ color: C.muted, fontWeight: 600 }}>
          {mode === 'results' && pr && pr.predicted > 0 ? `${pr.correct}/${pr.predicted} · ` : ''}{ROUND_POINTS[round]}pt
        </span>
      </div>
    )
  }

  // One league's column for a single round. The matchup area flexes and uses
  // space-around so later rounds (fewer games) sit centered against the round
  // that feeds them — the bracket funnel — without explicit connector lines.
  const LeagueRoundColumn: React.FC<{ round: RoundKey; conf: string; side: 'left' | 'right' }> = ({ round, conf, side }) => {
    const ms = ((displayTree as any)[round] as Record<string, Matchup[]>)[conf] || []
    return (
      <div style={{ minWidth: isMobile ? 168 : 200, flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
        <ColHeader round={round} side={side} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 14 }}>
          {ms.length === 0 ? (
            <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic', textAlign: side === 'right' ? 'right' : 'left' }}>
              {mode === 'results' ? 'Awaiting results' : 'Pick the prior round'}
            </div>
          ) : ms.map((m, i) => <MatchupCell key={`${round}-${conf}-${i}`} round={round} m={m} side={side} />)}
        </div>
      </div>
    )
  }

  // The center finale — both league champions meet. Vertically centered and
  // gold-accented as the bracket's focal point.
  const FloosBowlColumn: React.FC = () => {
    const ms = displayTree.floosbowl
    const pr = mine?.perRound?.floosbowl
    return (
      <div style={{ minWidth: isMobile ? 176 : 216, flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {ROUND_LABEL.floosbowl}
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 2 }}>
            {mode === 'results' && pr && pr.predicted > 0 ? `${pr.correct}/${pr.predicted} · ` : ''}{ROUND_POINTS.floosbowl}pt
          </div>
        </div>
        {ms.length === 0 ? (
          <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic', textAlign: 'center' }}>
            {mode === 'results' ? 'Awaiting the finalists' : 'Pick the league championships'}
          </div>
        ) : ms.map((m, i) => (
          <div key={`fb-${i}`} style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            border: '1px solid rgba(245,158,11,0.4)', borderRadius: 7, padding: 7,
            backgroundColor: 'rgba(245,158,11,0.06)',
          }}>
            <TeamPick team={m.higher} round="floosbowl" m={m} />
            <TeamPick team={m.lower} round="floosbowl" m={m} />
          </div>
        ))}
      </div>
    )
  }

  const ToggleBtn: React.FC<{ mk: ViewMode; label: string }> = ({ mk, label }) => (
    <button
      onClick={() => setViewOverride(mk)}
      style={{
        padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
        border: `1px solid ${mode === mk ? C.pick : C.border}`,
        backgroundColor: mode === mk ? 'rgba(59,130,246,0.15)' : 'transparent',
        color: mode === mk ? C.text : C.muted,
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ padding: isMobile ? '14px 10px' : 20, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <h2 style={{ color: C.text, fontSize: isMobile ? 16 : 18, margin: 0 }}>Playoff Bracket Challenge</h2>
        {mine?.hasBracket && (
          <span style={{ fontSize: 13, color: C.body }}>
            Your score: <span style={{ color: C.correct, fontWeight: 700 }}>{mine.points ?? 0}</span> pts
            {' '}<span style={{ color: C.muted }}>({mine.correctCount ?? 0} correct)</span>
          </span>
        )}
      </div>

      {locked && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <ToggleBtn mk="results" label="Results" />
          <ToggleBtn mk="picks" label="My Picks" />
        </div>
      )}

      <p style={{ color: C.muted, fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>
        {mode === 'results'
          ? 'The real bracket.'
          : locked
            ? 'Your bracket. Green picks advanced, red picks lost, blue picks are still live. Hit Results for the real outcomes.'
            : 'Pick every game to the Floos Bowl. Later rounds are worth more. Locks when Round 1 starts.'}
      </p>

      <div style={{
        display: 'flex', alignItems: 'stretch', gap: isMobile ? 8 : 12, overflowX: 'auto',
        padding: isMobile ? 12 : 18, WebkitOverflowScrolling: 'touch',
        backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 16,
      }}>
        {/* Left league funnels inward */}
        {perLeagueRounds.map((r) => (
          <LeagueRoundColumn key={`L-${r}`} round={r} conf={leagueLeft} side="left" />
        ))}
        {/* Center finale */}
        <FloosBowlColumn />
        {/* Right league mirrored (League Championship innermost → Round 1 outermost) */}
        {leagueRight && [...perLeagueRounds].reverse().map((r) => (
          <LeagueRoundColumn key={`R-${r}`} round={r} conf={leagueRight} side="right" />
        ))}
      </div>

      {mode === 'picks' && !locked && (
        <button
          onClick={() => submit(picks)}
          disabled={!allComplete || submitting}
          style={{
            padding: '9px 18px', backgroundColor: allComplete ? C.pick : '#1e293b',
            color: allComplete ? '#fff' : C.muted, border: 'none', borderRadius: 6,
            fontSize: 13, fontWeight: 700, cursor: allComplete && !submitting ? 'pointer' : 'not-allowed',
            marginBottom: 20,
          }}
        >
          {submitting ? 'Submitting…' : mine?.hasBracket ? 'Update Bracket' : 'Submit Bracket'}
        </button>
      )}

      <BracketStandings rows={leaderboard} isMobile={isMobile} />
    </div>
  )
}

const BracketStandings: React.FC<{ rows: import('@/types/playoffBracket').BracketLeaderRow[]; isMobile?: boolean }> = ({ rows, isMobile }) => (
  <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
      Standings
    </div>
    {rows.length === 0 ? (
      <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No brackets scored yet.</div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.slice(0, 25).map((r) => (
          <div key={r.userId} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', borderRadius: 4,
            backgroundColor: r.isMe ? 'rgba(59,130,246,0.12)' : 'transparent', fontSize: 12,
          }}>
            <span style={{ color: C.muted, fontWeight: 700, minWidth: 22 }}>{r.rank}</span>
            <span style={{
              color: r.isMe ? C.text : C.body, flex: 1, fontWeight: r.isMe ? 700 : 500,
              minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {r.username}{r.isMe ? ' (you)' : ''}
            </span>
            {!isMobile && <span style={{ color: C.muted }}>{r.correctCount} correct</span>}
            <span style={{ color: C.correct, fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{r.points} pts</span>
          </div>
        ))}
      </div>
    )}
  </div>
)

export default BracketView
