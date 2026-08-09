import React from 'react'
import { BG, BORDER, TEXT, ACCENT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { SectionHeader, timeAgo } from './frontPieces'
import { CoresBand } from './CoresStatusPanel'
import { CoreIcon, coreColor } from '@/utils/coresVisual'

export interface NewsStat {
  label: string
  value: string
  positive?: boolean
}

export interface NewsItem {
  id: number
  category: string
  rawCategory: string
  text: string
  week: number
  season: number
  teamId: number | null
  playerId: number | null
  stats: NewsStat[]
  /** Which Core spoke, on `cores` rows. Drives the icon and the row's colour. */
  core?: string | null
  coreDisplayName?: string | null
  /** The text without the inline "Vera: " prefix the flat `text` field carries. */
  rawText?: string | null
  /** A multi-turn Cores exchange, already in spoken order. */
  turns?: CoreTurn[] | null
  at: string | null
}

export interface CoreTurn {
  core?: string | null
  coreDisplayName?: string | null
  text: string
}

/**
 * Category colours, keyed on the backend's raw category. Anything unrecognised falls back
 * to muted rather than rendering an invisible dot — a new publisher shipping before this
 * map knows about it should still be readable.
 */
const CATEGORY_COLOR: Record<string, string> = {
  clinched: ACCENT.success,
  streak: ACCENT.success,
  record: ACCENT.warning,
  milestone: ACCENT.warning,
  big_game: ACCENT.warning,
  upset: ACCENT.upset,
  anomaly_transition: ACCENT.anomaly,
  criticality: ACCENT.negative,
  rules: ACCENT.rules,
  signing: ACCENT.info,
  injury: ACCENT.negative,
  eliminated: TEXT.muted,
  cores: ACCENT.cards,
  schedule: ACCENT.info,
}

/** Shorter display names where the raw category reads awkwardly in a 104px column. */
const CATEGORY_LABEL: Record<string, string> = {
  anomaly_transition: 'ANOMALY',
  big_game: 'BIG GAME',
  rules: 'RULE CHANGE',
  criticality: 'INSTABILITY',
  schedule: 'SCHEDULE',
}

// A Core speaks in their OWN colour, not the generic Cores colour — with the feed now
// running several of their lines at a time, one flat colour made an exchange between two
// of them read as one voice repeating itself.
// A Cores row is the only one that speaks rather than reports, so it gets a name in the
// label column where every other row gets a category.
// ⚠️ No category label on a row (owner, 2026-08-08). A fixed 104px column reading CORES /
// UPSET / SCHEDULE down the side said less than the line beside it did, and with the feed
// now carrying Cores conversations it labelled four consecutive rows identically. The
// icon and the colour still carry the kind; the line carries the story.
const isCore = (item: NewsItem) =>
  item.rawCategory === 'cores' && !!item.core && !!item.coreDisplayName

// Every Cores item renders as a conversation, a solo line being one of length 1. Uniform
// treatment is what lets the speaker's name be coloured in both cases without a second
// code path.
//
// ⚠️ The turns arrive already ordered. They must NOT be re-sorted here by anything the
// feed knows about — the feed is newest-first, and applying that to an exchange is what
// made a conversation read backwards in the first place.
const coreTurns = (item: NewsItem): CoreTurn[] | null => {
  if (!isCore(item)) return null
  const turns = (item.turns && item.turns.length > 0)
    ? item.turns
    : [{ core: item.core, coreDisplayName: item.coreDisplayName,
         text: item.rawText || item.text }]
  return turns.map(t => ({ ...t, text: stripSpeaker(t.text, t.coreDisplayName) }))
}

// ⚠️ The flat `text` field carries the speaker inline ("Aris: ..."), because the older
// highlight feed renders attribution that way. Here the name is drawn separately in the
// Core's own colour, so a prefixed string renders it TWICE — "Aris Aris: Sodas just took
// down Classics". Stripping rather than trusting `rawText` to be present also covers rows
// written before that field existed.
const stripSpeaker = (text: string, name?: string | null) => {
  if (!name) return text
  const prefix = `${name}: `
  return text.startsWith(prefix) ? text.slice(prefix.length) : text
}

const colorFor = (item: NewsItem) =>
  (isCore(item) ? coreColor(item.core ?? undefined) : null)
  || CATEGORY_COLOR[item.rawCategory] || TEXT.muted

// The rail down the left of a row, which is what carries the KIND now that the category
// label is gone. Deliberately the category colour even on a Cores row: an exchange has
// several speakers, and tinting the whole row with the first one's colour would claim the
// conversation for whoever happened to open it.
const railFor = (item: NewsItem) => CATEGORY_COLOR[item.rawCategory] || TEXT.muted

// Rows that mark WHEN rather than report WHAT. A week starting is not a story competing
// with the others for attention — it is the line between them — so it renders as a tinted
// band instead of a row, and the feed reads as a run of weeks rather than one long list.
const DIVIDER_CATEGORIES = new Set(['schedule'])
const isDivider = (item: NewsItem) => DIVIDER_CATEGORIES.has(item.rawCategory)

// Three weights of row, and the tint is what separates them. A record falling or a rule
// changing is a thing you want to catch while scanning; an upset or a Cores line is worth
// reading but not worth stopping for; a week starting is structure.
//
// The divider tint is deliberately WEAKER than the noteworthy one — a separator that
// draws more eye than the news it separates is backwards.
// Owner's list (2026-08-08): records, awakenings, threshold crossings. `rules` rides along
// because a rule actually changing is already weighted to take the headline, so it would
// be odd for it to render as an ordinary row when it does not. A clinch is deliberately
// NOT here — it happens sixteen times a season, and highlighting the routine is how a
// highlight stops meaning anything.
const NOTEWORTHY_CATEGORIES = new Set(['record', 'anomaly_transition', 'criticality', 'rules'])
const isNoteworthy = (item: NewsItem) => NOTEWORTHY_CATEGORIES.has(item.rawCategory)

const DIVIDER_TINT = '0d'      // ~5%
const NOTEWORTHY_TINT = '1c'   // ~11%
const labelFor = (item: NewsItem) => CATEGORY_LABEL[item.rawCategory] || item.category

/**
 * League news: one lead item with four supporting numbers, then single-clause rows.
 *
 * The feed is CUMULATIVE and persisted — items are published the moment they happen and
 * stay put, so it does not clear at the week rollover. It is fixed-length, and a story
 * falls off the bottom when newer ones push it out.
 *
 * There is no prose here by design. The lead's headline is a template the sim can fill
 * and its body is four numbers — an earlier draft with an authored headline and two
 * sentences of analysis was rejected because nothing in the system publishes at that
 * level. An item without a full four numbers renders as a standard row instead of
 * leading with an empty strip.
 */
const LeagueNews: React.FC<{ lead: NewsItem | null; items: NewsItem[] }> = ({ lead, items }) => {
  if (!lead && items.length === 0) return null

  return (
    <div>
      {/* ⚠️ No ALL link. It pointed at /history, which is records and fantasy totals and
          carries no news at all — so it promised an archive and delivered a different
          page. There is no full-feed view yet; add the link back with one. */}
      <SectionHeader title="LEAGUE NEWS" />
      <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
        {/* The state of the league, at the head of the league's news. */}
        <CoresBand />
        {lead && (
          <div style={{
            display: 'flex', gap: '16px', padding: '16px',
            background: BG.panel, borderBottom: `1px solid ${BORDER.hairline}`,
          }}>
            <div style={{
              width: '104px', flexShrink: 0,
              background: BG.card, border: `1px solid ${BORDER.hairline}`,
              padding: '14px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px',
            }}>
              <Crest teamId={lead.teamId} size={44} />
              <span style={{ ...font(700, 9, 1, '0.12em'), color: TEXT.muted }}>
                WEEK {lead.week}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{
                  ...font(700, 9, 1, '0.12em'),
                  color: BG.shell, background: colorFor(lead), padding: '4px 7px',
                }}>{labelFor(lead)}</span>
                <span style={{ ...font(700, 9), color: TEXT.muted }}>SEASON {lead.season}</span>
                <span style={{ flex: 1 }} />
                <span style={{ ...font(400, 10), color: TEXT.muted }}>{timeAgo(lead.at)}</span>
              </div>

              <h2 style={{
                ...font(800, 20, 1.25, '-0.02em'), color: TEXT.primary,
                margin: '11px 0 0', textWrap: 'balance' as any,
              }}>{lead.text}</h2>

              {/* A rule change or a threshold crossing leads with no numbers under it —
                  for the anomaly a strip would be wrong, not just empty, since every
                  public surface for it is deliberately number-free. Rendering the row
                  unconditionally left 14px of dead margin under those headlines. */}
              {lead.stats.length > 0 && (
              <div style={{ display: 'flex', margin: '14px -14px 0' }}>
                {lead.stats.map((stat, i) => (
                  <div key={stat.label} style={{
                    flex: 1, minWidth: 0, padding: '0 14px',
                    borderRight: i < lead.stats.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
                  }}>
                    <div style={{
                      ...font(800, 19), ...TABULAR,
                      color: stat.positive ? ACCENT.live : TEXT.primary,
                    }}>{stat.value}</div>
                    <div style={{ ...font(700, 9, 1, '0.12em'), color: TEXT.muted, marginTop: '7px' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {items.map((item, i) => {
          if (isDivider(item)) return (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '7px 16px 7px 14px',
                // A tint of the row's own colour, not a flat grey — it stays a schedule
                // line, just one that separates rather than competes.
                background: `${railFor(item)}${DIVIDER_TINT}`,
                borderLeft: `2px solid ${railFor(item)}`,
                borderBottom: i < items.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
              }}
            >
              <span style={{
                flex: 1, minWidth: 0,
                ...font(700, 10, 1.3, '0.12em'), color: TEXT.secondary,
              }}>{item.text.toUpperCase()}</span>
              <span style={{ ...font(400, 10), color: TEXT.muted, flexShrink: 0 }}>
                {timeAgo(item.at)}
              </span>
            </div>
          )
          const turns = coreTurns(item)
          if (turns) return (
            <div
              key={item.id}
              className="row"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '12px 16px 12px 14px',
                borderLeft: `2px solid ${railFor(item)}`,
                borderBottom: i < items.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
              }}
            >
              <span style={{
                display: 'flex', flexDirection: 'column', gap: '7px', flex: 1, minWidth: 0,
              }}>
                {turns.map((turn, t) => (
                  <span key={t} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{
                      width: '20px', display: 'flex', justifyContent: 'center',
                      flexShrink: 0, paddingTop: '2px',
                    }}>
                      <CoreIcon core={turn.core ?? undefined}
                                color={coreColor(turn.core ?? undefined)} size={15} />
                    </span>
                    <span style={{ minWidth: 0, ...font(400, 12, 1.5), color: TEXT.body,
                                   textWrap: 'pretty' as any }}>
                      <span style={{ ...font(700, 12, 1.5), color: coreColor(turn.core ?? undefined) }}>
                        {turn.coreDisplayName}
                      </span>
                      {' '}{turn.text}
                    </span>
                  </span>
                ))}
              </span>
              <span style={{ ...font(400, 10), color: TEXT.muted, flexShrink: 0, paddingTop: '2px' }}>
                {timeAgo(item.at)}
              </span>
            </div>
          )
          return (
          <div
            key={item.id}
            className="row"
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 16px 12px 14px',
              background: isNoteworthy(item) ? `${railFor(item)}${NOTEWORTHY_TINT}` : undefined,
              borderLeft: `2px solid ${railFor(item)}`,
              borderBottom: i < items.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
            }}
          >
            {/* The crest where there is one — a team event carries its own, and a player
                event gets their club's, resolved server-side. The category dot stands in
                when neither applies (a Cores line, a rule change), so the column keeps its
                width and the rows stay aligned. */}
            {item.teamId ? (
              <Crest teamId={item.teamId} size={20} />
            ) : (
              <span style={{
                width: '20px', display: 'flex', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: colorFor(item),
                }} />
              </span>
            )}
            <span style={{
              flex: 1, minWidth: 0,
              ...font(isNoteworthy(item) ? 600 : 400, 12, 1.45),
              color: isNoteworthy(item) ? TEXT.primary : TEXT.body,
              textWrap: 'pretty' as any,
            }}>
              {item.text}
            </span>
            <span style={{ ...font(400, 10), color: TEXT.muted, flexShrink: 0 }}>{timeAgo(item.at)}</span>
          </div>
          )
        })}
      </div>
    </div>
  )
}

export default LeagueNews
