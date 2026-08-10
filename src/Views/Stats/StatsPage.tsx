import { useIsMobile } from '@/hooks/useIsMobile'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PlayerHoverCard from '@/Components/PlayerHoverCard'
import TeamHoverCard from '@/Components/TeamHoverCard'
import { useAuth } from '@/contexts/AuthContext'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font, SHELL_MOBILE_MAX, AWAKENED_NAME } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import {
  Segmented, Pill, StatusChip, FilterLabel, Rule, SearchBox, CompareButton,
  SeasonPicker, StatsTable, TableSkeleton, type LeadCell,
} from './statsShell'
import { playerColumns, teamColumns, DEFAULT_SORT, TEAM_DEFAULT_SORT } from './statsColumns'
import { Stars } from '@/Components/Stars'
import ComparePanel from './ComparePanel'
import type {
  StatsPlayerRow, StatsPlayersResponse, StatsTeamRow, StatsTeamsResponse,
} from './statsTypes'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const OFFENSIVE_POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K'] as const
const DEFENSIVE_POSITIONS = ['S', 'LB', 'CB', 'DE'] as const

const STATUSES = [
  { key: 'active', label: 'Active' },
  { key: 'fa', label: 'Free agents' },
  { key: 'retired', label: 'Retired' },
  { key: 'followed', label: 'Followed' },
] as const

type Mode = 'players' | 'teams'
type Scope = 'season' | 'career'
type Status = typeof STATUSES[number]['key']
type Side = 'offense' | 'defense'

const POSITION_PLURAL: Record<string, string> = {
  ALL: 'players', QB: 'quarterbacks', RB: 'running backs', WR: 'wide receivers',
  TE: 'tight ends', K: 'kickers', S: 'safeties', LB: 'linebackers',
  CB: 'cornerbacks', DE: 'defensive ends',
}

const MAX_COMPARE = 4

/**
 * The league's stats page: players and teams under one table shell.
 *
 * What the old page could not do, and this exists for: ask about a season other
 * than the current one, ask about a career, see a defensive line at all, or see
 * a team's numbers anywhere. The sim had been recording all of it.
 *
 * Sorting and filtering are client-side. The whole league is a few hundred rows,
 * so a round trip per header click would be slower and would fight the cache.
 */
const StatsPage: React.FC = () => {
  const narrow = useIsMobile(SHELL_MOBILE_MAX)
  const { user } = useAuth()

  const [mode, setMode] = useState<Mode>('players')
  const [scope, setScope] = useState<Scope>('season')
  const [per, setPer] = useState<'total' | 'game'>('total')
  const [season, setSeason] = useState<number | null>(null)
  const [currentSeason, setCurrentSeason] = useState<number>(1)

  const [position, setPosition] = useState<string>('ALL')
  const [status, setStatus] = useState<Status>('active')
  const [side, setSide] = useState<Side>('offense')
  const [teamPer, setTeamPer] = useState<'game' | 'total'>('game')
  const [search, setSearch] = useState('')

  const [players, setPlayers] = useState<StatsPlayersResponse | null>(null)
  const [teams, setTeams] = useState<StatsTeamRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [sortKey, setSortKey] = useState<string>(DEFAULT_SORT.ALL)
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  // The comparison is OPENED, not implied by the selection: ticking a fourth row
  // should not make a panel appear under the reader's cursor.
  const [comparing, setComparing] = useState(false)

  const careerScope = scope === 'career'

  // ── Fetching ───────────────────────────────────────────────────────────────

  const loadPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        season: careerScope ? 'career' : String(season ?? 'current'),
        per, position, status,
      })
      const res = await fetch(`${API_BASE}/stats/players?${params}`, { credentials: 'omit' })
      const json = await res.json()
      if (!json?.success) { setError(true); return }
      setPlayers(json.data)
      setCurrentSeason(json.data.currentSeason)
      if (season == null) setSeason(json.data.currentSeason)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [careerScope, season, per, position, status])

  const loadTeams = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        season: String(season ?? 'current'),
        side, per: teamPer,
      })
      const res = await fetch(`${API_BASE}/stats/teams?${params}`)
      const json = await res.json()
      if (!json?.success) { setError(true); return }
      const data: StatsTeamsResponse = json.data
      setTeams(data.rows.map(row => ({ ...row, id: row.teamId })))
      setCurrentSeason(data.currentSeason)
      if (season == null) setSeason(data.currentSeason)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [season, side, teamPer])

  useEffect(() => {
    if (mode === 'players') loadPlayers()
    else loadTeams()
  }, [mode, loadPlayers, loadTeams])

  // ── Sorting ────────────────────────────────────────────────────────────────

  const columns = mode === 'players'
    ? playerColumns(position, careerScope)
    : teamColumns(side, teamPer === 'game')

  // A sort survives a filter change when the new column set still has that
  // column. The old page reset to fantasy points on every change, which is what
  // made it feel like it was throwing your place away.
  useEffect(() => {
    const available = (mode === 'players'
      ? playerColumns(position, careerScope)
      : teamColumns(side, teamPer === 'game')) as { key: string; sort?: unknown; lowerIsBetter?: boolean }[]
    if (available.some(c => c.key === sortKey && c.sort)) return
    const fallback = mode === 'players'
      ? (DEFAULT_SORT[position] ?? 'pts')
      : TEAM_DEFAULT_SORT[side]
    const col = available.find(c => c.key === fallback)
    setSortKey(fallback)
    setSortAsc(!!col?.lowerIsBetter)
  }, [mode, position, side, teamPer, careerScope, sortKey])

  const onSort = (key: string) => {
    if (key === sortKey) { setSortAsc(a => !a); return }
    const col = (columns as { key: string; lowerIsBetter?: boolean }[]).find(c => c.key === key)
    setSortKey(key)
    // Fewest-yards-allowed first for a column where low is good; otherwise best first.
    setSortAsc(!!col?.lowerIsBetter)
  }

  /**
   * ⚠️ Each mode sorts with ITS OWN column set, never the shared `columns`.
   *
   * On the render where the mode flips, the other mode's rows are still in
   * state — so sorting players with a team comparator reached for
   * `row.offense.totalYards` on a player and took the page down with it.
   */
  const sortRows = <Row extends { id: number }>(
    rows: Row[],
    cols: { key: string; sort?: (r: Row) => number }[],
  ): Row[] => {
    const col = cols.find(c => c.key === sortKey)
    if (!col?.sort) return rows
    const pick = col.sort
    return [...rows].sort((a, b) => (sortAsc ? pick(a) - pick(b) : pick(b) - pick(a)))
  }

  // ── Rows ───────────────────────────────────────────────────────────────────

  const needle = search.trim().toLowerCase()

  const playerRows = useMemo(() => {
    const rows = (players?.rows ?? []).filter(r => !needle || r.name.toLowerCase().includes(needle))
    return sortRows(rows, playerColumns(position, careerScope))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, needle, sortKey, sortAsc, position, careerScope])

  const teamRows = useMemo(() => {
    const rows = (teams ?? []).filter(r =>
      !needle || r.name.toLowerCase().includes(needle) || r.abbr.toLowerCase().includes(needle))
    return sortRows(rows, teamColumns(side, teamPer === 'game'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, needle, sortKey, sortAsc, side, teamPer])

  const toggle = (id: number) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else if (next.size < MAX_COMPARE) next.add(id)
    return next
  })

  // Switching modes keeps season and career scope; everything else resets.
  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setSelected(new Set())
    setSearch('')
  }

  /**
   * A side switch re-derives the sort DIRECTION even though the key survives.
   *
   * `YDS/G` exists on both sides but means opposite things — yards gained, then
   * yards allowed — so carrying the direction over ranked the worst defence in
   * the league first. Keeping the column is right; keeping the direction is not.
   */
  const switchSide = (next: Side) => {
    if (next === side) return
    setSide(next)
    setSelected(new Set())
    const col = teamColumns(next, teamPer === 'game').find(c => c.key === sortKey)
    if (col?.sort) setSortAsc(!!col.lowerIsBetter)
  }

  const resetFilters = () => {
    setPosition('ALL')
    setStatus('active')
    setSearch('')
    setSelected(new Set())
  }

  // ── Lead cells ─────────────────────────────────────────────────────────────

  const playerLeads: LeadCell<StatsPlayerRow>[] = [
    {
      header: 'PLAYER', width: 268,
      render: row => (
        <PlayerHoverCard playerId={row.id} playerName={row.name}>
          <Link to={`/players/${row.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, textDecoration: 'none',
          }}>
            {/* A player's mark IS their club's crest — identity here belongs to
                the team, and the same circle appears on every other surface. */}
            <Crest teamId={row.teamId} size={17} />
            <span style={{
              ...font(600, 13), color: TEXT.primary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              minWidth: 0,
              ...(row.awakened ? AWAKENED_NAME : {}),
            }}>{row.name}</span>
            {/* Stars BESIDE the name, not under it (owner) — the lead column has the
                width for both on one line, and stacking them made every row two lines
                tall for a five-glyph band. flexShrink 0 so a long name truncates and
                the rating survives, which is the same order of sacrifice the rest of
                the app uses. */}
            <Stars stars={row.ratingStars} size={12} tracking={1.5} />
          </Link>
        </PlayerHoverCard>
      ),
    },
    {
      header: 'TEAM', width: 52,
      // Neutral, not the club colour: the avatar carries identity, and thirty-two
      // brand colours down a dense table is noise.
      render: row => (
        <span style={{ ...font(600, 10, 1, '0.04em'), color: TEXT.muted }}>
          {row.teamAbbr || (row.status === 'retired' ? '—' : 'FA')}
        </span>
      ),
    },
  ]

  const teamLeads: LeadCell<StatsTeamRow>[] = [
    {
      header: '#', width: 34,
      render: row => (
        <span style={{ ...font(600, 11), color: TEXT.muted, ...TABULAR }}>
          {teamRows.findIndex(r => r.id === row.id) + 1}
        </span>
      ),
    },
    {
      header: 'TEAM', width: 240,
      render: row => (
        <TeamHoverCard teamId={row.teamId}>
          <Link to={`/team/${row.teamId}`} style={{
            display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, textDecoration: 'none',
          }}>
            <Crest teamId={row.teamId} size={17} />
            <span style={{
              ...font(600, 12), color: TEXT.primary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{row.name}</span>
          </Link>
        </TeamHoverCard>
      ),
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  const seasons = useMemo(
    () => Array.from({ length: currentSeason }, (_, i) => currentSeason - i),
    [currentSeason],
  )

  // Capitalised here rather than with `text-transform`, which would also
  // capitalise the word after the separator ("192 Shown").
  const positionWord = POSITION_PLURAL[position] ?? 'players'
  const contextLine = mode === 'players'
    ? `${positionWord.charAt(0).toUpperCase()}${positionWord.slice(1)} · ${playerRows.length} shown`
    : `${side === 'offense' ? 'Offense' : 'Defense'} · ${teamRows.length} teams`

  return (
    <div style={{ fontFamily: FONT }}>

      {/* Title row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: narrow ? '12px 12px 10px' : '17px 24px 15px', background: BG.shell,
        borderBottom: `1px solid ${BORDER.hairline}`, flexWrap: 'wrap',
      }}>
        <h1 style={{ ...font(800, 22, 1, '-0.025em'), color: TEXT.primary, margin: 0 }}>Stats</h1>
        <Segmented
          options={[{ key: 'players', label: 'PLAYERS' }, { key: 'teams', label: 'TEAMS' }]}
          value={mode}
          onChange={switchMode}
        />
        <span style={{ ...font(400, 12), color: TEXT.muted }}>{contextLine}</span>
        <span style={{ flex: 1 }} />
        <SeasonPicker
          season={season ?? currentSeason}
          seasons={seasons}
          disabled={careerScope}
          onChange={setSeason}
        />
        {mode === 'players' && (
          <Segmented
            options={[{ key: 'season', label: 'SEASON' }, { key: 'career', label: 'CAREER' }]}
            value={scope}
            onChange={setScope}
          />
        )}
        {mode === 'players' && careerScope && (
          <Segmented
            options={[{ key: 'total', label: 'TOTALS' }, { key: 'game', label: 'PER GAME' }]}
            value={per}
            onChange={setPer}
          />
        )}
      </div>

      {mode === 'players' ? (
        <>
          {/* Filter row 1 — position */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
            padding: '12px 24px', background: '#0d1526',
            borderBottom: `1px solid ${BORDER.hairline}`,
          }}>
            <FilterLabel>POSITION</FilterLabel>
            <span style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {OFFENSIVE_POSITIONS.map(p => (
                <Pill key={p} label={p} active={position === p} onClick={() => setPosition(p)} />
              ))}
            </span>
            <Rule />
            <FilterLabel width={54}>DEFENSE</FilterLabel>
            <span style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {DEFENSIVE_POSITIONS.map(p => (
                <Pill key={p} label={p} active={position === p} onClick={() => setPosition(p)} />
              ))}
            </span>
            <span style={{ flex: 1 }} />
            {selected.size > 0 && (
              <span style={{ ...font(600, 11, 1, '0.06em'), color: ACCENT.info }}>
                {selected.size} SELECTED
              </span>
            )}
            <CompareButton count={selected.size} onClick={() => setComparing(true)} />
          </div>

          {/* Filter row 2 — status and search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
            padding: '12px 24px', background: '#0d1526',
            borderBottom: `1px solid ${BORDER.raised}`,
          }}>
            <FilterLabel>STATUS</FilterLabel>
            <span style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                (s.key !== 'followed' || user) && (
                  <StatusChip
                    key={s.key}
                    label={s.label}
                    count={players?.facets?.[s.key] ?? 0}
                    active={status === s.key}
                    onClick={() => setStatus(s.key)}
                  />
                )
              ))}
            </span>
            <Rule />
            <SearchBox value={search} onChange={setSearch} placeholder="Find a player" />
            <span style={{ flex: 1 }} />
            <button
              onClick={resetFilters}
              style={{
                ...font(600, 11), color: TEXT.muted, background: 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: FONT,
              }}
            >Reset all filters</button>
          </div>
        </>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
          padding: '12px 24px', background: '#0d1526',
          borderBottom: `1px solid ${BORDER.raised}`,
        }}>
          <FilterLabel width={34}>SIDE</FilterLabel>
          <span style={{ display: 'flex', gap: '5px' }}>
            <Pill label="OFFENSE" active={side === 'offense'} onClick={() => switchSide('offense')} />
            <Pill label="DEFENSE" active={side === 'defense'} onClick={() => switchSide('defense')} />
          </span>
          <Rule />
          <FilterLabel width={40}>SHOW</FilterLabel>
          <Segmented
            options={[{ key: 'game', label: 'PER GAME' }, { key: 'total', label: 'TOTALS' }]}
            value={teamPer}
            onChange={setTeamPer}
          />
          <Rule />
          <SearchBox value={search} onChange={setSearch} placeholder="Find a team" />
          <span style={{ flex: 1 }} />
          {selected.size > 0 && (
            <span style={{ ...font(600, 11, 1, '0.06em'), color: ACCENT.info }}>
              {selected.size} SELECTED
            </span>
          )}
          <CompareButton count={selected.size} onClick={() => setComparing(true)} />
        </div>
      )}

      {comparing && selected.size > 0 && (
        mode === 'players' ? (
          <ComparePanel
            rows={playerRows.filter(r => selected.has(r.id))}
            columns={playerColumns(position, careerScope)}
            subject="players"
            onClose={() => setComparing(false)}
            title={row => (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <Crest teamId={row.teamId} size={17} />
                <span style={{ minWidth: 0 }}>
                  <span style={{
                    display: 'block', ...font(700, 12), color: TEXT.primary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    ...(row.awakened ? AWAKENED_NAME : {}),
                  }}>{row.name}</span>
                  <span style={{ ...font(500, 10), color: TEXT.muted }}>
                    {row.position}{row.teamAbbr ? ` · ${row.teamAbbr}` : ''}
                  </span>
                </span>
              </span>
            )}
          />
        ) : (
          <ComparePanel
            rows={teamRows.filter(r => selected.has(r.id))}
            columns={teamColumns(side, teamPer === 'game')}
            subject="teams"
            onClose={() => setComparing(false)}
            title={row => (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <Crest teamId={row.id} size={17} />
                <span style={{
                  ...font(700, 12), color: TEXT.primary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{row.name}</span>
              </span>
            )}
          />
        )
      )}

      {error ? (
        <div style={{ padding: '46px 24px', textAlign: 'center', ...font(400, 13), color: TEXT.muted }}>
          Stats are unavailable right now.
        </div>
      ) : loading ? (
        <TableSkeleton />
      ) : mode === 'players' ? (
        <StatsTable
          rows={playerRows}
          columns={playerColumns(position, careerScope)}
          leads={playerLeads}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={onSort}
          selected={selected}
          onToggle={toggle}
          selectionFull={selected.size >= MAX_COMPARE}
          emptyMessage={`No ${POSITION_PLURAL[position] ?? 'players'} match these filters.`}
        />
      ) : (
        <StatsTable
          rows={teamRows}
          columns={teamColumns(side, teamPer === 'game')}
          leads={teamLeads}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={onSort}
          selected={selected}
          onToggle={toggle}
          selectionFull={selected.size >= MAX_COMPARE}
          emptyMessage={
            // ⚠️ Two different emptinesses. "No teams match" is a lie when the season
            // simply has not been played yet — which is exactly what a reader sees
            // right after a fresh season starts, and it reads as a broken page.
            teamRows.length === 0 && !search.trim()
              ? 'No games have been played this season yet.'
              : 'No teams match this search.'
          }
        />
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '13px 24px' }}>
          <span style={{ ...font(400, 11), color: TEXT.muted }}>
            Showing {mode === 'players' ? playerRows.length : teamRows.length} of{' '}
            {mode === 'players' ? (players?.total ?? 0) : (teams?.length ?? 0)}{' '}
            {mode === 'players' ? (POSITION_PLURAL[position] ?? 'players') : 'teams'}
            {mode === 'players' && careerScope ? ' · career' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

export default StatsPage
