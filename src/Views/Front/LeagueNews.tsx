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
  category: string
  text: string
  week: number
  teamId: number | null
  playerId: number | null
  stats: NewsStat[]
  at: string | null
  league: string | null
}

/**
 * Category colours. Every category the backend can emit has one; anything unrecognised
 * falls back to muted rather than rendering an invisible dot.
 */
const CATEGORY_COLOR: Record<string, string> = {
  CLINCHED: ACCENT.success,
  STREAK: ACCENT.success,
  MILESTONE: ACCENT.warning,
  RECORD: ACCENT.warning,
  ERRATIC: ACCENT.anomaly,
  'RULE CHANGE': ACCENT.rules,
  SIGNING: ACCENT.info,
  INJURY: ACCENT.negative,
  CORES: ACCENT.cards,
}

const colorFor = (category: string) => CATEGORY_COLOR[category] || TEXT.muted

/**
 * League news: one lead item with four supporting numbers, then single-clause rows.
 *
 * There is no prose here by design. The lead's headline is a template the sim can fill
 * and its body is four numbers — an earlier draft with an authored headline and two
 * sentences of analysis was rejected because nothing in the system publishes at that
 * level. If a category cannot produce a full four numbers it renders as a standard row
 * instead of leading with an empty strip.
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
              {lead.league && (
                <span style={{ ...font(700, 9, 1, '0.12em'), color: TEXT.muted }}>
                  {lead.league.split(' ')[0].toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{
                  ...font(700, 9, 1, '0.12em'),
                  color: BG.shell, background: colorFor(lead.category), padding: '4px 7px',
                }}>{lead.category}</span>
                <span style={{ ...font(700, 9), color: TEXT.dim }}>WEEK {lead.week}</span>
                <span style={{ flex: 1 }} />
                <span style={{ ...font(400, 10), color: TEXT.faint }}>{timeAgo(lead.at)}</span>
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
            key={`${item.category}-${i}-${item.text.slice(0, 24)}`}
            className="row"
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px',
              borderBottom: i < items.length - 1 ? `1px solid ${BORDER.hairline}` : 'none',
            }}
          >
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: colorFor(item.category), flexShrink: 0,
            }} />
            <span style={{
              ...font(700, 10, 1, '0.1em'), color: colorFor(item.category),
              width: '104px', flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{item.category}</span>
            <span style={{ flex: 1, minWidth: 0, ...font(400, 12, 1.45), color: TEXT.body, textWrap: 'pretty' as any }}>
              {item.text}
            </span>
            <span style={{ ...font(400, 10), color: TEXT.faint, flexShrink: 0 }}>{timeAgo(item.at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LeagueNews
