import React, { useMemo, useState, useEffect } from 'react'
import { usePlayoffBracket } from '@/hooks/usePlayoffBracket'
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

const BracketView: React.FC = () => {
  const { template, mine, leaderboard, loading, submitting, submit } = usePlayoffBracket()
  const [picks, setPicks] = useState<BracketPredictions>({})

  const conferences = template?.conferences
  const locked = !!template && !template.open

  // Seed local picks from the user's saved bracket once data arrives.
  useEffect(() => {
    const saved = template?.myPredictions || mine?.predictions
    if (saved) setPicks(saved)
  }, [template, mine])

  const projected = useMemo(
    () => (conferences ? projectBracket(conferences, picks) : null),
    [conferences, picks],
  )

  const actual = mine?.actualAdvancers || {}

  if (loading) {
    return <div style={{ padding: 24, color: C.muted, fontSize: 13 }}>Loading the bracket…</div>
  }
  if (!template?.available || !conferences || !projected) {
    return (
      <div style={{ padding: 24, color: C.muted, fontSize: 13, maxWidth: 560 }}>
        <h2 style={{ color: C.text, fontSize: 18, margin: '0 0 8px' }}>Playoff Bracket</h2>
        The bracket opens once the playoffs are seeded. Check back when the regular season wraps —
        you'll pick every game through the Floos Bowl champion.
      </div>
    )
  }

  const pickWinner = (round: RoundKey, m: Matchup, teamId: number) => {
    if (locked) return
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

  const TeamPick: React.FC<{ team: BracketSeedTeam; round: RoundKey; m: Matchup }> = ({ team, round, m }) => {
    const picked = (picks[round] || []).includes(team.teamId)
    const advanced = (actual[round] || []).includes(team.teamId)
    // After lock: green if this pick actually advanced, red if it didn't.
    let border = C.border, bg = C.inner, fg = C.body
    if (picked && locked) {
      border = advanced ? C.correct : C.wrong
      bg = advanced ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'
      fg = C.text
    } else if (picked) {
      border = C.pick; bg = 'rgba(59,130,246,0.15)'; fg = C.text
    }
    return (
      <button
        onClick={() => pickWinner(round, m, team.teamId)}
        disabled={locked}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '5px 7px', backgroundColor: bg, color: fg,
          border: `1px solid ${border}`, borderRadius: 4,
          fontSize: 11, fontWeight: picked ? 700 : 500,
          cursor: locked ? 'default' : 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ color: C.muted, fontWeight: 700, minWidth: 14 }}>{team.seed}</span>
        <img src={avatarUrl(team.teamId)} alt="" width={18} height={18} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team.abbreviation || team.teamName}
        </span>
      </button>
    )
  }

  const MatchupCell: React.FC<{ round: RoundKey; m: Matchup }> = ({ round, m }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
      <TeamPick team={m.higher} round={round} m={m} />
      <TeamPick team={m.lower} round={round} m={m} />
    </div>
  )

  const RoundColumn: React.FC<{ round: RoundKey }> = ({ round }) => {
    const matchups: Array<{ conf: string; m: Matchup }> = round === 'floosbowl'
      ? projected.floosbowl.map((m) => ({ conf: '', m }))
      : Object.entries((projected as any)[round] as Record<string, Matchup[]>)
          .flatMap(([conf, ms]) => ms.map((m) => ({ conf, m })))
    return (
      <div style={{ minWidth: 150, flex: '0 0 auto' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: roundComplete(round) ? C.text : C.muted,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
          display: 'flex', justifyContent: 'space-between', gap: 6,
        }}>
          <span>{ROUND_LABEL[round]}</span>
          <span style={{ color: C.muted, fontWeight: 600 }}>{ROUND_POINTS[round]}pt</span>
        </div>
        {matchups.length === 0 ? (
          <div style={{ fontSize: 10, color: C.muted, fontStyle: 'italic' }}>Pick the prior round</div>
        ) : matchups.map(({ m }, i) => <MatchupCell key={`${round}-${i}`} round={round} m={m} />)}
      </div>
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <h2 style={{ color: C.text, fontSize: 18, margin: 0 }}>Playoff Bracket Challenge</h2>
        {mine?.hasBracket && (
          <span style={{ fontSize: 13, color: C.body }}>
            Your score: <span style={{ color: C.correct, fontWeight: 700 }}>{mine.points ?? 0}</span> pts
            {' '}<span style={{ color: C.muted }}>({mine.correctCount ?? 0} correct)</span>
          </span>
        )}
      </div>
      <p style={{ color: C.muted, fontSize: 12, margin: '0 0 16px' }}>
        {locked
          ? 'The bracket is locked — green picks advanced, red picks busted. Late rounds are worth more.'
          : 'Pick every game through the Floos Bowl. The tree reshapes as you pick — late rounds score more. Locks at Round 1 kickoff.'}
      </p>

      <div style={{
        display: 'flex', gap: 16, overflowX: 'auto', padding: 14,
        backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 16,
      }}>
        {ROUND_ORDER.map((r) => <RoundColumn key={r} round={r} />)}
      </div>

      {!locked && (
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

      <BracketStandings rows={leaderboard} />
    </div>
  )
}

const BracketStandings: React.FC<{ rows: import('@/types/playoffBracket').BracketLeaderRow[] }> = ({ rows }) => (
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
            <span style={{ color: r.isMe ? C.text : C.body, flex: 1, fontWeight: r.isMe ? 700 : 500 }}>
              {r.username}{r.isMe ? ' (you)' : ''}
            </span>
            <span style={{ color: C.muted }}>{r.correctCount} correct</span>
            <span style={{ color: C.correct, fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{r.points} pts</span>
          </div>
        ))}
      </div>
    )}
  </div>
)

export default BracketView
