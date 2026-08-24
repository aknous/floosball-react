import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { readableTeamColor } from '@/utils/colors'
import { useIsMobile } from '@/hooks/useIsMobile'
import HallOfFame from '@/Views/Players/HallOfFame'
import PlayerLink from '@/Components/PlayerLink'
import { BG, BORDER, TEXT, ACCENT, FONT, font, TABULAR } from '@/Components/Shell/tokens'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

type ViewMode = 'seasons' | 'records' | 'hall-of-fame'

/**
 * The tabs on offer.
 *
 * ⚠️ THERE IS NO SEPARATE 'team-records' TAB. Team records ARE records, and a "Record
 * Book" sitting beside a "Team Records" as equals promised a book that excluded half the
 * league. They are one tab now, split by SUBJECT inside it (`RecordBook` below).
 *
 * `TeamRecordsView` still tolerates its endpoint being absent (see its fetch), so a
 * frontend that ships ahead of the backend shows an empty state rather than breaking —
 * which it did once, when this repo deployed first.
 */
const TABS: ViewMode[] = ['seasons', 'records', 'hall-of-fame']


interface SeasonSummary {
  seasonNumber: number
  championTeamId: number | null
  championTeamName: string | null
  championTeamAbbr: string | null
  championTeamColor: string | null
  mvpPlayerId: number | null
  mvpPlayerName: string | null
  mvpPosition: string | null
  mvpTeamId: number | null
  mvpTeamAbbr: string | null
}

interface StandingsTeam {
  teamId: number
  teamName: string
  teamCity?: string | null
  teamAbbr: string
  teamColor: string | null
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  winPct: number
  elo: number | null
  /** Postseason finish, derived server-side from that season's playoff games.
   *  Null for a team that did not qualify. */
  result?: string | null
}

interface RecordEntry {
  playerId: number
  playerName: string
  teamId?: number | null
  teamAbbr?: string | null
  /** Raw team color — correct it with `readableTeamColor` before using it as text. */
  teamColor?: string | null
  value: number
  season?: number
  week?: number
  seasons?: number
}

interface RecordsResponse {
  records: {
    game: Record<string, RecordEntry[]>
    season: Record<string, RecordEntry[]>
    career: Record<string, RecordEntry[]>
  }
  labels: Record<string, string>
}

const TAB_LABEL: Record<ViewMode, string> = {
  seasons: 'SEASONS',
  records: 'RECORD BOOK',
  'hall-of-fame': 'HALL OF FAME',
}

const HistoryPage: React.FC = () => {
  const isMobile = useIsMobile()
  const [mode, setMode] = useState<ViewMode>('seasons')

  return (
    <div style={{ backgroundColor: BG.shell, minHeight: '100%' }}>
      {/* ── PAGE HEAD ─────────────────────────────────────────────────────
          The tabs move OUT of the pill row and up beside the title: three views of
          one subject is a segmented control, not three buttons under a heading. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
        padding: isMobile ? '14px' : '17px 24px 15px',
        borderBottom: `1px solid ${BORDER.hairline}`,
      }}>
        <h1 style={{ ...font(800, 24, 1, '-0.025em'), color: TEXT.primary, margin: 0 }}>History</h1>
        <div style={{ display: 'flex' }}>
          {TABS.map(m => (
            <Segment key={m} active={mode === m} onClick={() => setMode(m)}>
              {TAB_LABEL[m]}
            </Segment>
          ))}
        </div>
      </div>

      <div style={{ padding: isMobile ? '14px' : '20px 24px 34px' }}>
        {mode === 'seasons' && <SeasonsView isMobile={isMobile} />}
        {mode === 'records' && <RecordBook isMobile={isMobile} />}
        {mode === 'hall-of-fame' && <HallOfFame />}
      </div>
    </div>
  )
}

// ─── Seasons view ──────────────────────────────────────────────────────────

const ST_TH: React.CSSProperties = { padding: '10px 12px', whiteSpace: 'nowrap' }
const ST_TD: React.CSSProperties = {
  padding: '9px 12px', ...font(500, 13), ...TABULAR, whiteSpace: 'nowrap',
}

const SeasonsView: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const [seasons, setSeasons] = useState<SeasonSummary[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [standings, setStandings] = useState<StandingsTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStandings, setLoadingStandings] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/history/seasons`)
      .then(r => r.json())
      .then(j => {
        const list: SeasonSummary[] = j?.data?.seasons || j?.seasons || []
        setSeasons(list)
        if (list.length > 0 && selectedSeason == null) setSelectedSeason(list[0].seasonNumber)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedSeason == null) return
    setLoadingStandings(true)
    fetch(`${API_BASE}/history/standings?season=${selectedSeason}`)
      .then(r => r.json())
      .then(j => setStandings(j?.data?.teams || j?.teams || []))
      .finally(() => setLoadingStandings(false))
  }, [selectedSeason])

  if (loading) return <div style={{ color: '#94a3b8', padding: '20px' }}>Loading…</div>
  if (seasons.length === 0) {
    return (
      <div style={{ color: '#94a3b8', padding: '40px 20px', textAlign: 'center', fontStyle: 'italic' }}>
        No completed seasons yet.
      </div>
    )
  }

  const selected = seasons.find(s => s.seasonNumber === selectedSeason) ?? null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '220px 1fr',
      gap: isMobile ? '16px' : '20px', alignItems: 'flex-start',
    }}>
      {/* Season picker */}
      <div style={{ backgroundColor: BG.card, border: `1px solid ${BORDER.hairline}` }}>
        <div style={{
          padding: '8px 11px', ...font(800, 11, 1, '0.12em'), color: TEXT.strong,
          backgroundColor: BG.panel, borderBottom: `1px solid ${BORDER.hairline}`,
        }}>
          COMPLETED SEASONS
        </div>
        <div style={{ maxHeight: isMobile ? '200px' : '400px', overflowY: 'auto' }}>
          {seasons.map(s => {
            const active = s.seasonNumber === selectedSeason
            return (
              <button
                key={s.seasonNumber}
                onClick={() => setSelectedSeason(s.seasonNumber)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '8px', width: '100%', padding: '8px 11px',
                  backgroundColor: active ? BG.shell : 'transparent',
                  border: 'none', borderLeft: `3px solid ${active ? ACCENT.warning : 'transparent'}`,
                  color: active ? TEXT.strong : TEXT.secondary,
                  cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
                  ...font(active ? 700 : 500, 12), ...TABULAR,
                }}
              >
                <span>Season {s.seasonNumber}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  {s.championTeamId != null && <Crest teamId={s.championTeamId} size={16} />}
                  {s.championTeamAbbr && (
                    // ⚠️ NOT gold. Gold means champion elsewhere in the app, but every row
                    // in this panel is a champion, so it marked nothing and simply read as
                    // a highlight. The team's own colour is what an abbr wears everywhere
                    // else, and here it agrees with the crest beside it.
                    <span style={{
                      ...font(700, 11, 1, '0.04em'),
                      color: s.championTeamColor
                        ? readableTeamColor(s.championTeamColor, BG.card)
                        : TEXT.muted,
                    }}>
                      {s.championTeamAbbr}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail */}
      <div>
        {selected && (
          <div style={{
            backgroundColor: BG.card, border: `1px solid ${BORDER.hairline}`,
            padding: '13px 14px', marginBottom: '13px',
            display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center',
          }}>
            <div>
              <div style={{ ...font(700, 11, 1, '0.1em'), color: TEXT.muted }}>
                FLOOSBOWL {selected.seasonNumber} CHAMPION
              </div>
              {selected.championTeamId ? (
                <Link
                  to={`/team/${selected.championTeamId}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    marginTop: '4px', textDecoration: 'none',
                  }}
                >
                  <Crest teamId={selected.championTeamId} size={26} />
                  <span style={{
                    ...font(800, 22, 1, '-0.02em'),
                    color: selected.championTeamColor
                      ? readableTeamColor(selected.championTeamColor, BG.card)
                      : '#fbbf24',
                  }}>
                    {selected.championTeamName}
                  </span>
                </Link>
              ) : (
                <div style={{ ...font(400, 13), color: TEXT.muted }}>—</div>
              )}
            </div>
            {selected.mvpPlayerId && (
              <div style={{
                borderLeft: isMobile ? 'none' : `1px solid ${BORDER.hairline}`,
                paddingLeft: isMobile ? 0 : '16px',
              }}>
                <div style={{ ...font(700, 11, 1, '0.1em'), color: TEXT.muted }}>
                  MOST VALUABLE PLAYER
                </div>
                <Link
                  to={`/players/${selected.mvpPlayerId}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    marginTop: '4px',
                    textDecoration: 'none', color: TEXT.body,
                  }}
                >
                  {selected.mvpTeamId != null && <Crest teamId={selected.mvpTeamId} size={22} />}
                  <span style={{ ...font(700, 18) }}>{selected.mvpPlayerName}</span>
                  {selected.mvpPosition && (
                    <span style={{
                      ...font(700, 11, 1, '0.1em'), color: TEXT.muted,
                      backgroundColor: BG.panel, border: `1px solid ${BORDER.hairline}`,
                      padding: '2px 6px',
                    }}>
                      {selected.mvpPosition}
                    </span>
                  )}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Standings table */}
        <div style={{ backgroundColor: BG.card, border: `1px solid ${BORDER.hairline}` }}>
          <div style={{
            padding: '8px 11px', ...font(800, 11, 1, '0.12em'), color: TEXT.strong,
            backgroundColor: BG.panel, borderBottom: `1px solid ${BORDER.hairline}`,
          }}>
            FINAL STANDINGS
          </div>
          {loadingStandings ? (
            <div style={{ padding: '20px', color: TEXT.muted, ...font(400, 13) }}>Loading…</div>
          ) : standings.length === 0 ? (
            <div style={{ padding: '20px', color: TEXT.muted, ...font(400, 13) }}>
              No standings data for this season.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '420px' : 'auto' }}>
                <thead>
                  <tr style={{ ...font(700, 11, 1, '0.1em'), color: TEXT.muted }}>
                    <th style={{ ...ST_TH, width: '34px', textAlign: 'right' }}>#</th>
                    <th style={{ ...ST_TH, textAlign: 'left' }}>TEAM</th>
                    <th style={{ ...ST_TH, textAlign: 'right' }}>W</th>
                    <th style={{ ...ST_TH, textAlign: 'right' }}>L</th>
                    <th style={{ ...ST_TH, textAlign: 'right' }}>PCT</th>
                    <th style={{ ...ST_TH, textAlign: 'right' }}>ELO</th>
                    <th style={{ ...ST_TH, textAlign: 'right' }}>RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((t, i) => (
                    <tr key={t.teamId} style={{ borderTop: `1px solid ${BORDER.hairline}` }}>
                      <td style={{ ...ST_TD, width: '34px', textAlign: 'right', color: TEXT.muted }}>{i + 1}</td>
                      <td style={ST_TD}>
                        <Link
                          to={`/team/${t.teamId}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            color: TEXT.body, textDecoration: 'none',
                          }}
                        >
                          <Crest teamId={t.teamId} size={18} />
                          {t.teamCity && !isMobile ? (
                            <>
                              <span style={{ color: TEXT.muted }}>{t.teamCity}</span>{' '}
                              <span>{t.teamName}</span>
                            </>
                          ) : t.teamName}
                        </Link>
                      </td>
                      <td style={{ ...ST_TD, textAlign: 'right', color: TEXT.body }}>{t.wins}</td>
                      <td style={{ ...ST_TD, textAlign: 'right', color: TEXT.body }}>{t.losses}</td>
                      <td style={{ ...ST_TD, textAlign: 'right', color: TEXT.secondary }}>{t.winPct.toFixed(3)}</td>
                      <td style={{ ...ST_TD, textAlign: 'right', color: t.elo != null ? TEXT.secondary : TEXT.muted }}>
                        {t.elo != null ? t.elo : '—'}
                      </td>
                      {/* ⚠️ A team that missed the postseason gets an em dash, not a blank —
                          a blank cell reads as data the page failed to load. */}
                      <td style={{
                        ...ST_TD, textAlign: 'right',
                        ...font(700, 11, 1, '0.08em'),
                        color: t.result === 'CHAMPION' ? ACCENT.warning
                          : t.result ? TEXT.secondary : TEXT.muted,
                      }}>{t.result || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Record book view ──────────────────────────────────────────────────────

// ─── Record book ───────────────────────────────────────────────────────────

/**
 * The Record Book: players, teams and owners, one tab.
 *
 * ⚠️ SCOPE IS THE SECTION, NOT A CONTROL. It used to be a pill row (`CAREER` /
 * `SINGLE SEASON` / `SINGLE GAME`) with ~25 category cards running underneath as one
 * undifferentiated grid, so finding "the single-season receiving record" meant picking a
 * pill and then reading every card. Scope now runs down the page as section headers and
 * CATEGORY became the filter — the axis with few enough values to be a chip row.
 *
 * ⚠️ ONE RENDERER FOR ALL THREE SUBJECTS. Players, teams and owners were three components
 * with three copies of the tie-ranking loop, three card layouts and three sets of colours.
 * The ranking rule in particular MUST be identical between them — a tie sharing a rank in
 * the player book and not in the owner book is a bug the reader can see — so each subject
 * now normalises into `Section[]` and everything below that is shared.
 *
 * ⚠️ CHIPS ARE BUILT FROM THE DATA, not from a hardcoded list. The backend's `groups` map
 * says which category each record belongs to; a category with no lists gets no chip,
 * because a chip leading to a blank page is worse than an absent one. There are no player
 * DEFENSE or SCORING records today, so players show four chips, not six.
 */
const SUBJECTS = ['players', 'teams', 'fantasy'] as const
type Subject = typeof SUBJECTS[number]

/** Scope order down the page, broadest first. `allTime` is teams only. */
const SCOPE_LABEL: Record<string, string> = {
  career: 'CAREER',
  allTime: 'ALL-TIME',
  season: 'SINGLE SEASON',
  game: 'SINGLE GAME',
  week: 'SINGLE WEEK',
}
const SCOPE_ORDER = ['career', 'allTime', 'season', 'week', 'game']

/**
 * The unit a value is measured in, shown at the right of each list header.
 *
 * ⚠️ SUBSTRING ORDER IS LOAD-BEARING, and got it wrong once: `points` CONTAINS `int`
 * ("po-int-s"), so testing for interceptions first labelled FANTASY POINTS as `INT`.
 * Points is therefore tested before interceptions, and interceptions matches `ints` /
 * `interception` rather than the bare three letters.
 */
const UNIT_FOR = (key: string): string => {
  const k = key.toLowerCase()
  if (k.includes('yards')) return 'YDS'
  if (k.includes('tds')) return 'TD'
  if (k.includes('receptions')) return 'REC'
  if (k.includes('sack')) return 'SK'
  if (k.includes('picks')) return 'PICKS'
  if (k.includes('fantasypoints') || k.includes('fp')) return 'FP'
  if (k.includes('points')) return 'PTS'
  if (k === 'ints' || k.includes('interception')) return 'INT'
  if (k.includes('fg')) return 'FG'
  return ''   // titles and championships are bare counts
}

/** A single row, whatever the subject. Owners have no team, so those cells are absent. */
interface BookRow {
  key: string
  name: string
  /** Set for a PLAYER row. Routes through `PlayerLink`, which carries the app's hover
   *  card — a record book is exactly where you want to check who someone was. */
  playerId?: number
  href?: string
  teamId?: number | null
  teamAbbr?: string | null
  teamColor?: string | null

  value: number
  season?: number | null
  week?: number | null
}

interface BookList { key: string; label: string; unit: string; group: string; rows: BookRow[] }
interface BookSection { key: string; label: string; lists: BookList[] }

/**
 * Seven-figure fantasy totals exist in the data (a season-1 card-multiplier artifact),
 * and the value column is sized for three digits. Abbreviate rather than widen: the
 * column is shared with every other record list, and the full number stays on the row's
 * title attribute.
 *
 * ⚠️ ONLY AT A MILLION. A 100K threshold was tried and is wrong — career passing yards
 * legitimately reach six figures, so it rendered a leaderboard reading 101K, 100K,
 * 95,302: the same column in two different units, with the abbreviated rows losing the
 * precision that separates them.
 */
const formatValue = (v: number): string => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  return v.toLocaleString()
}

/**
 * Golf-style ties: a tie SHARES a rank and the next distinct value skips ahead.
 * ⚠️ One implementation, used by every subject — see the note on RecordBook.
 */
const rankRows = (rows: BookRow[]) => {
  let prev: number | null = null
  let rank = 0
  return rows.slice(0, 10).map((r, idx) => {
    if (prev === null || r.value !== prev) rank = idx + 1
    prev = r.value
    return { row: r, idx, rank }
  })
}

const RecordBook: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const [subject, setSubject] = useState<Subject>('players')
  const [category, setCategory] = useState('all')
  const [scope, setScope] = useState('')
  const { sections, loading } = useRecordSource(subject)

  // Switching subject resets both filters — the category AND scope sets differ per
  // subject (a team has no career, an owner has no single game), so anything carried
  // across would select something the new subject has never heard of.
  const pickSubject = (s: Subject) => { setSubject(s); setCategory('all'); setScope('') }

  const chips = useMemo(() => {
    const present = new Set<string>()
    sections.forEach(sec => sec.lists.forEach(l => l.group && present.add(l.group)))
    const ordered = ['passing', 'rushing', 'receiving', 'kicking', 'fantasy',
                     'offense', 'defense', 'titles'].filter(g => present.has(g))
    return ordered.length > 1 ? ['all', ...ordered] : []
  }, [sections])

  const shown = useMemo(() => sections
    .map(sec => ({
      ...sec,
      lists: category === 'all' ? sec.lists : sec.lists.filter(l => l.group === category),
    }))
    // A category with no lists in a scope drops that scope's TOGGLE, not just its cards.
    .filter(sec => sec.lists.length > 0), [sections, category])

  // ⚠️ SCOPE IS A TOGGLE, NOT A STACK (owner, 2026-08-23). Every scope rendered at once
  // was three screens of lists for one question, and the reader had to scroll past two
  // of them to reach the third. The section headers went with it — a header naming what
  // the active toggle already names is the same label twice.
  //
  // Derived from what is actually on offer AFTER the category filter, so a scope can
  // never be selectable and empty; if the current one falls away the first takes over.
  const active = shown.find(sec => sec.key === scope) ?? shown[0] ?? null

  return (
    <div>
      {/* Control row: subject, then category, then the ranking note. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        marginBottom: '22px',
      }}>
        <div style={{ display: 'flex' }}>
          {SUBJECTS.map(sub => (
            <Segment key={sub} active={subject === sub} onClick={() => pickSubject(sub)}>
              {sub === 'players' ? 'PLAYERS' : sub === 'teams' ? 'TEAMS' : 'FANTASY'}
            </Segment>
          ))}
        </div>
        {shown.length > 1 && (
          <>
            <span style={{ width: '1px', height: '18px', backgroundColor: BORDER.raised }} />
            <div style={{ display: 'flex' }}>
              {shown.map(sec => (
                <Segment
                  key={sec.key}
                  active={active?.key === sec.key}
                  onClick={() => setScope(sec.key)}
                >{sec.label}</Segment>
              ))}
            </div>
          </>
        )}
        {chips.length > 0 && (
          <>
            <span style={{ width: '1px', height: '18px', backgroundColor: BORDER.raised }} />
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {chips.map(c => (
                <Segment key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c.toUpperCase()}
                </Segment>
              ))}
            </div>
          </>
        )}
      </div>

      {loading && <div style={{ ...font(400, 13), color: TEXT.muted, padding: '20px 0' }}>Loading…</div>}
      {!loading && !active && (
        <div style={{ ...font(400, 13), color: TEXT.muted, padding: '20px 0' }}>No records yet.</div>
      )}

      {active && (
        <div style={{
          display: 'grid',
          // ⚠️ A FLOOR, not a preference: rank + crest + abbr + value + when + gaps
          // + padding eat most of a narrow card, and at 280 most of the book was
          // ellipsis. Raised with the type scale — the cells grew with it.
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(430px, 1fr))',
          gap: '14px', alignItems: 'start',
        }}>
          {active.lists.map(list => <RecordList key={list.key} list={list} />)}
        </div>
      )}
    </div>
  )
}

/** Squared segmented-control button, shared by the subject switch and the chips. */
const Segment: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> =
  ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      style={{
        ...font(700, 11, 1, '0.1em'),
        padding: '7px 13px', cursor: 'pointer',
        border: `1px solid ${active ? TEXT.secondary : BORDER.hairline}`,
        backgroundColor: active ? TEXT.secondary : 'transparent',
        color: active ? BG.shell : TEXT.muted,
        fontFamily: FONT,
      }}
    >{children}</button>
  )

const NAME_CELL: React.CSSProperties = {
  ...font(500, 13), color: TEXT.body, display: 'block',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}

const RecordList: React.FC<{ list: BookList }> = ({ list }) => (
  <div style={{ backgroundColor: BG.card, border: `1px solid ${BORDER.hairline}` }}>
    {/* ⚠️ The header mirrors the ROW's cell structure — same gap, same 62px value slot,
        same 56px when slot. With `justify-content: space-between` the unit sat hard right,
        which is above the season/week column, not above the numbers it names. */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: '9px',
      padding: '9px 14px', backgroundColor: BG.panel,
      borderBottom: `1px solid ${BORDER.hairline}`,
    }}>
      <span style={{
        flex: 1, minWidth: 0,
        ...font(800, 11, 1, '0.12em'), color: TEXT.strong, textTransform: 'uppercase',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {list.label}
      </span>
      <span style={{
        width: '62px', textAlign: 'right',
        ...font(700, 11, 1, '0.1em'), color: TEXT.muted,
      }}>{list.unit}</span>
      <span style={{ width: '56px' }} />
    </div>
    <div>
      {rankRows(list.rows).map(({ row, idx, rank }) => (
        <div
          key={`${row.key}-${idx}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '8px 14px',
            // ⚠️ `hairline`, not `subtle`. At #16202f on the #131e2f panel the rule was
            // technically present and invisible, so ten rows read as one block of text.
            borderTop: idx > 0 ? `1px solid ${BORDER.hairline}` : 'none',
          }}
        >
          <span style={{
            width: '16px', textAlign: 'right', ...font(700, 13), ...TABULAR,
            color: rank === 1 ? ACCENT.warning : TEXT.muted,
          }}>{rank}</span>
          {/* The team LEADS the row — mark, then abbr, then the name. A team's own row
              carries no abbr (it would restate its name), and an owner has no team at
              all, so neither cell renders rather than leaving a hole. */}
          {row.teamId != null && <Crest teamId={row.teamId} size={20} />}
          {row.teamAbbr && (
            <span style={{
              width: '32px', flexShrink: 0, ...font(700, 11, 1, '0.04em'),
              color: row.teamColor ? readableTeamColor(row.teamColor, BG.card) : TEXT.muted,
            }}>{row.teamAbbr}</span>
          )}
          {/* ⚠️ A PLAYER goes through PlayerLink, not a bare <Link> — that is what carries
              the hover card the rest of the app uses. A team links plainly, and an owner
              is not a link at all. */}
          {row.playerId != null ? (
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <PlayerLink playerId={row.playerId} playerName={row.name} style={NAME_CELL} />
            </span>
          ) : row.href ? (
            <Link to={row.href} style={{ ...NAME_CELL, flex: 1, minWidth: 0, textDecoration: 'none' }}>
              {row.name}
            </Link>
          ) : (
            <span style={{ ...NAME_CELL, flex: 1, minWidth: 0 }}>{row.name}</span>
          )}
          <span
            title={Math.abs(row.value) >= 1_000_000 ? row.value.toLocaleString() : undefined}
            style={{
              width: '62px', textAlign: 'right', ...font(700, 13), ...TABULAR, color: TEXT.strong,
            }}>{formatValue(row.value)}</span>
          <span style={{
            width: '56px', textAlign: 'right', ...font(400, 11), ...TABULAR, color: TEXT.muted,
          }}>
            {row.season != null && (row.week != null ? `S${row.season} W${row.week}` : `S${row.season}`)}
          </span>
        </div>
      ))}
    </div>
  </div>
)

// ─── Sources ───────────────────────────────────────────────────────────────

interface TeamRecordEntry {
  teamId: number
  teamName: string
  teamAbbr: string | null
  teamColor?: string | null
  value: number
  season?: number | null
  week?: number | null
}

interface UserRecordEntry {
  userId: number
  username: string
  value: number
  season: number
  week?: number
}

/**
 * Fetch a subject and normalise it into sections.
 *
 * ⚠️ Each endpoint is tolerated being ABSENT or SHORT. `groups` and the team `allTime`
 * scope are additions — a frontend deployed ahead of the backend falls back to one `ALL`
 * category and simply misses a section, rather than rendering an empty page. This repo
 * has shipped ahead of the backend before.
 */
function useRecordSource(subject: Subject) {
  const [sections, setSections] = useState<BookSection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setSections([])
    const path = subject === 'players' ? 'records'
      : subject === 'teams' ? 'team-records' : 'user-records'
    fetch(`${API_BASE}/history/${path}`)
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        const d = j?.data || j
        const g: Record<string, string> = d?.groups || {}
        setSections(subject === 'fantasy' ? fantasySections(d) : statSections(d, g, subject))
      })
      .catch(() => { if (alive) setSections([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [subject])

  return { sections, loading }
}

function statSections(d: any, groups: Record<string, string>, subject: Subject): BookSection[] {
  const records = d?.records || {}
  const labels: Record<string, string> = d?.labels || {}
  return SCOPE_ORDER
    .filter(scope => records[scope])
    .map(scope => ({
      key: scope,
      label: SCOPE_LABEL[scope] ?? scope.toUpperCase(),
      lists: Object.keys(records[scope])
        .filter(k => (records[scope][k] ?? []).length > 0)
        .map(k => ({
          key: `${scope}-${k}`,
          label: labels[k] ?? k,
          unit: UNIT_FOR(k),
          group: groups[k] || 'all',
          rows: (records[scope][k] as any[]).map((e, i) => subject === 'teams'
            ? teamRow(e as TeamRecordEntry, i)
            : playerRow(e as RecordEntry, i, scope)),
        })),
    }))
    .filter(sec => sec.lists.length > 0)
}

/**
 * ⚠️ A CAREER ROW CARRIES NO TEAM (owner, 2026-08-23). A career total spans however many
 * teams the player turned out for, so a single mark beside it is not where the record was
 * set — it is wherever they happen to be now, which is a different claim. The payload
 * only fills `teamId` for some career entries anyway, so the book was showing a crest on
 * some rows and not others, which reads as missing data rather than as a deliberate
 * omission. Season and game rows DO belong to one team and keep theirs.
 */
const playerRow = (e: RecordEntry, i: number, scope: string): BookRow => {
  const careerScope = scope === 'career'
  return {
    key: `${e.playerId}-${i}`,
    name: e.playerName,
    playerId: e.playerId,
    teamId: careerScope ? null : (e.teamId ?? null),
    teamAbbr: careerScope ? null : (e.teamAbbr ?? null),
    teamColor: careerScope ? null : (e.teamColor ?? null),
    value: e.value,
    season: e.season ?? null,
    week: e.week ?? null,
  }
}

const teamRow = (e: TeamRecordEntry, i: number): BookRow => ({
  key: `${e.teamId}-${i}`,
  name: e.teamName,
  href: `/team/${e.teamId}`,
  teamId: e.teamId,
  teamAbbr: null,
  teamColor: e.teamColor ?? null,
  value: e.value,
  season: e.season ?? null,
  week: e.week ?? null,
})

/**
 * Owner records. Two scopes, and only the arrays that actually arrive — `weeklyPicks`
 * and `seasonPicks` are newer than `weeklyFP`/`seasonFP`, so a backend without them
 * yields a book with two lists rather than an error.
 */
function fantasySections(d: any): BookSection[] {
  const ownerRow = (e: UserRecordEntry, i: number): BookRow => ({
    key: `${e.userId}-${i}`,
    name: e.username,
    value: e.value,
    season: e.season ?? null,
    week: e.week ?? null,
  })
  const list = (key: string, label: string, unit: string, arr?: UserRecordEntry[]): BookList | null =>
    arr && arr.length
      ? { key, label, unit, group: 'all', rows: arr.map(ownerRow) }
      : null

  const week = [
    list('weeklyFP', 'Best Weekly Fantasy Points', 'FP', d?.weeklyFP),
    list('weeklyPicks', 'Most Correct Picks, Week', 'PICKS', d?.weeklyPicks),
  ].filter(Boolean) as BookList[]
  const season = [
    list('seasonFP', 'Best Season Fantasy Points', 'FP', d?.seasonFP),
    list('seasonPicks', 'Most Correct Picks, Season', 'PICKS', d?.seasonPicks),
  ].filter(Boolean) as BookList[]

  return [
    { key: 'week', label: SCOPE_LABEL.week, lists: week },
    { key: 'season', label: SCOPE_LABEL.season, lists: season },
  ].filter(sec => sec.lists.length > 0)
}

export default HistoryPage
