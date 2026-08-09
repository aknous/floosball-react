import React, { useMemo } from 'react'
import { BG, BORDER, TEXT, ACCENT, FONT, TABULAR, font } from '@/Components/Shell/tokens'
import { personalityAccent } from '@/utils/personality'
import GameFeedComposer from './GameFeedComposer'

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
 * The rail: what fans shouted at this game, and what the players said on it.
 *
 * The fan half is GAME-scoped (`GameFeedComposer`), not team-scoped. Reusing the
 * club feed put season-long lines in a live game's composer and, worse, showed a
 * post made at one game in every other game's rail.
 */
const GameBleachers: React.FC<{
  entries: RailEntry[]
  watching: number | null
  gameId: number
  /** The two cheer buttons. Inside the panel rather than floating above it —
   *  rallying IS being in the stands, and as its own card it read as a
   *  separate feature that happened to sit nearby. */
  rally?: React.ReactNode
}> = ({ entries, watching, gameId, rally }) => (
  <div style={{
    background: BG.card, border: `1px solid ${BORDER.hairline}`,
    display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
  }}>
    <div style={{
      padding: '12px 16px', background: BG.panel,
      borderBottom: `1px solid ${BORDER.raised}`,
      display: 'flex', alignItems: 'center', gap: '11px', flexShrink: 0,
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

    {rally && (
      <div style={{
        padding: '12px 14px', borderBottom: `1px solid ${BORDER.hairline}`,
        display: 'flex', gap: '10px', flexShrink: 0,
      }}>{rally}</div>
    )}

    {/* The fan half: shouts at THIS game, from either stand. The player and
        sideline voices ride in the same scroller. */}
    <GameFeedComposer
      gameId={gameId}
      extraEntries={
        <>
          {entries.map(entry => <Entry key={entry.key} entry={entry} />)}
          {entries.length === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', ...font(400, 12, 1.5), color: TEXT.muted }}>
              Nobody has said anything yet.
            </div>
          )}
        </>
      }
    />
  </div>
)

export default GameBleachers

/** Merge is memoised at the call site; this is only the shaping. */
export function useRailEntries(plays: any[] | undefined): RailEntry[] {
  return useMemo(() => railEntriesFromPlays(plays), [plays])
}
