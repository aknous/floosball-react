import React from 'react'
import { BG, BORDER, TEXT, ACCENT, TABULAR, font } from '@/Components/Shell/tokens'
import { Crest } from '@/Views/GameBoard/boardPieces'
import { SectionHeader, timeAgo } from './frontPieces'

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
  at: string | null
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

const colorFor = (item: NewsItem) => CATEGORY_COLOR[item.rawCategory] || TEXT.muted
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
      <SectionHeader title="LEAGUE NEWS" link={{ to: '/history', label: 'ALL →' }} />
      <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
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
            </div>
          </div>
        )}

        {items.map((item, i) => (
          <div
            key={item.id}
            className="row"
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px',
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
              ...font(700, 10, 1, '0.1em'), color: colorFor(item),
              width: '104px', flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{labelFor(item)}</span>
            <span style={{ flex: 1, minWidth: 0, ...font(400, 12, 1.45), color: TEXT.body, textWrap: 'pretty' as any }}>
              {item.text}
            </span>
            <span style={{ ...font(400, 10), color: TEXT.muted, flexShrink: 0 }}>{timeAgo(item.at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LeagueNews
