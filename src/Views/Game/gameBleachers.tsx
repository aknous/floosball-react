import React, { useMemo } from 'react'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { personalityAccent } from '@/utils/personality'
import TeamFeed from '@/Components/Sentiment/TeamFeed'

/**
 * The Bleachers rail — the fan conversation, which the modal had nowhere to put.
 *
 * Three kinds of voice share one row shell: fans, players reacting to a play they
 * were part of, and sideline cutaways. The first comes from the team feed; the
 * other two used to render INLINE IN THE PLAY LIST and move here, so the
 * play-by-play column is only the game and this column is only the talk.
 *
 * Accent is the personality tier (`personalityAccent`): a Stoic line reads as
 * background flavour, a Prophet line is meant to stand out.
 */

export interface RailEntry {
  key: string
  kind: 'player' | 'sideline'
  text: string
  personality?: string
  speaker: string
  teamId?: number | null
  teamAbbr?: string | null
  /** The play this was said about. Cutaways fire between plays and carry none. */
  playQuote?: string | null
  when?: string | null
}

/**
 * Pull the player reactions and sideline cutaways out of the play list.
 *
 * Newest first, matching the play list's own order — the plays arrive
 * newest-first and these are read off them without re-sorting.
 */
export function railEntriesFromPlays(plays: any[] | undefined): RailEntry[] {
  if (!plays?.length) return []
  const out: RailEntry[] = []
  plays.forEach((play, i) => {
    if (play.isSidelineCutaway && play.sidelineCutaway) {
      const cutaway = play.sidelineCutaway
      out.push({
        key: `cutaway-${i}`,
        kind: 'sideline',
        text: cutaway.text,
        personality: cutaway.personality,
        speaker: cutaway.playerName || cutaway.name || cutaway.teamAbbr || 'Sideline',
        teamId: cutaway.teamId,
        teamAbbr: cutaway.teamAbbr,
        playQuote: null,
      })
      return
    }
    if (play.personalityEvent) {
      const event = play.personalityEvent
      out.push({
        key: `reaction-${i}`,
        kind: 'player',
        text: event.text,
        personality: event.personality,
        speaker: event.playerName || event.name || 'Player',
        teamId: play.teamId ?? null,
        teamAbbr: play.offensiveTeam ?? null,
        // The quote is how a right-column entry stays legible about a
        // left-column play without making the reader hunt for it.
        playQuote: play.playDescription || play.description || null,
      })
    }
  })
  return out
}

const Tag: React.FC<{ label: string; accent: string }> = ({ label, accent }) => (
  <span style={{
    ...font(700, 8, 1, '0.12em'),
    color: accent,
    border: `1px solid ${accent}99`,
    padding: '4px 5px', flexShrink: 0,
  }}>{label}</span>
)

const Entry: React.FC<{ entry: RailEntry }> = ({ entry }) => {
  const accent = entry.personality ? personalityAccent(entry.personality) : ACCENT.info
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '12px 14px', borderBottom: `1px solid ${BORDER.hairline}`,
      background: `${accent}0d`,
    }}>
      {entry.playQuote && (
        <div style={{
          padding: '7px 9px', background: BG.panel,
          borderLeft: `2px solid ${accent}`,
        }}>
          <span style={{ ...font(400, 10, 1.4), color: TEXT.muted }}>{entry.playQuote}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {entry.teamId != null && (
          <img
            src={`/avatars/${entry.teamId}.png`}
            alt=""
            width={18}
            height={18}
            style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }}
          />
        )}
        <span style={{
          ...font(700, 11), color: TEXT.strong, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{entry.speaker}</span>
        <span style={{ flex: 1 }} />
        <Tag label={entry.kind === 'sideline' ? 'SIDELINE' : 'ON THE FIELD'} accent={accent} />
      </div>
      <div style={{
        borderLeft: `2px solid ${accent}`, background: `${accent}17`,
        padding: '8px 10px',
      }}>
        <span style={{ ...font(400, 12, 1.55), color: TEXT.body, fontStyle: 'italic' }}>
          {entry.text}
        </span>
      </div>
    </div>
  )
}

const LiveDot: React.FC = () => (
  <span className="pulse" style={{
    width: '5px', height: '5px', borderRadius: '50%',
    background: ACCENT.live, flexShrink: 0, display: 'block',
  }} />
)

/**
 * The rail. `feedTeamId` is the club whose Bleachers the composer posts into —
 * you post about your OWN club, so it is only set when the signed-in fan's team
 * is one of the two playing.
 */
const GameBleachers: React.FC<{
  entries: RailEntry[]
  watching: number | null
  feedTeamId: number | null
}> = ({ entries, watching, feedTeamId }) => (
  <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
    <div style={{
      padding: '12px 16px', background: BG.panel,
      borderBottom: `1px solid ${BORDER.raised}`,
      display: 'flex', alignItems: 'center', gap: '11px',
    }}>
      <span style={{ ...font(800, 12, 1, '0.1em'), color: TEXT.strong }}>THE BLEACHERS</span>
      <span style={{ flex: 1 }} />
      {watching != null && watching > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LiveDot />
          <span style={{ ...font(600, 11), color: ACCENT.live, ...TABULAR }}>{watching} watching</span>
        </span>
      )}
    </div>

    {/* The fan composer and fan posts. Only your own club's stand will take a
        post, so a neutral watching a game they have no side in reads the two
        player voices below and nothing more. */}
    {feedTeamId != null && (
      <TeamFeed teamId={feedTeamId} bare railTone composer="dropdown" maxHeight={300} />
    )}

    <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
      {entries.map(entry => <Entry key={entry.key} entry={entry} />)}
      {entries.length === 0 && (
        <div style={{ padding: '28px 16px', textAlign: 'center', ...font(400, 12, 1.5), color: TEXT.muted }}>
          Nobody has said anything yet.
        </div>
      )}
    </div>
  </div>
)

export default GameBleachers

/** Merge is memoised at the call site; this is only the shaping. */
export function useRailEntries(plays: any[] | undefined): RailEntry[] {
  return useMemo(() => railEntriesFromPlays(plays), [plays])
}
