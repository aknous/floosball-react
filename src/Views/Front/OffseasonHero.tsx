import React from 'react'
import { Link } from 'react-router-dom'
import { BG, BORDER, TEXT, ACCENT, FONT, font } from '@/Components/Shell/tokens'
import type { SeasonRecapResponse } from '@/types/recap'

/**
 * What the hero rail carries once the season is over.
 *
 * ⚠️ THE RAIL IS THE SLATE, AND IN THE OFFSEASON THERE IS NO SLATE. `LiveTicker` renders
 * the week's games; between the Floos Bowl and the next season there are none, so the
 * most prominent column on the landing page had nothing in it for the whole offseason —
 * at exactly the moment the league is at its most active. This is what goes there
 * instead: the state of the league in one line, and the way into the two pages that ARE
 * the offseason.
 *
 * It is deliberately a signpost rather than a summary. The compact recap lives in the
 * personal rail (`SeasonOverCard`); duplicating it here would make the landing page two
 * recaps and no direction.
 */

const CTA: React.CSSProperties = {
  ...font(700, 12, 1, '0.06em'),
  display: 'block',
  textAlign: 'center',
  padding: '12px 14px',
  textDecoration: 'none',
  fontFamily: FONT,
}

interface Props {
  /** Drives the headline only — the panel stands on its own before the recap lands. */
  recap: SeasonRecapResponse | null
}

/**
 * ⚠️ There is deliberately no "draft is live" flag. The front page's `gamesActive` is
 * `games.some(status === 'Active')`, which is false all offseason by definition, so
 * wiring it here would have shipped an indicator that could never light. A real one
 * needs the sim's offseason phase, which the frontend is not told (`_offseasonFlowPhase`
 * is backend-only) — worth adding when the phase is exposed, not faked before then.
 */
export const OffseasonHero: React.FC<Props> = ({ recap }) => {
  const champion = recap?.awards?.champion ?? null

  return (
    <div style={{
      background: BG.card,
      border: `1px solid ${BORDER.hairline}`,
      // The one warm edge on the page. The offseason is the league's loudest moment and
      // this is the only thing on screen announcing it.
      borderTop: `2px solid ${ACCENT.warning}`,
      padding: '18px 16px',
    }}>
      <div style={{ ...font(700, 10, 1, '0.16em'), color: ACCENT.warning }}>
        THE SEASON IS OVER
      </div>

      <div style={{ ...font(700, 17, 1.25), color: TEXT.primary, margin: '10px 0 0' }}>
        {champion
          ? `${champion.city ? `${champion.city} ` : ''}${champion.name} took the Floos Bowl.`
          : 'The Floos Bowl is decided.'}
      </div>

      <div style={{ ...font(400, 13, 1.55), color: TEXT.secondary, margin: '8px 0 16px' }}>
        Contracts are running out, veterans are retiring and every roster is being rebuilt.
        The draft runs pick by pick until the new season starts.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link
          to="/offseason?view=draft"
          style={{ ...CTA, background: ACCENT.info, color: BG.shell }}
        >
          DRAFT BOARD
        </Link>
        <Link
          to="/offseason"
          style={{
            ...CTA,
            background: 'transparent',
            color: TEXT.body,
            border: `1px solid ${BORDER.raised}`,
          }}
        >
          SEASON RECAP
        </Link>
      </div>
    </div>
  )
}

export default OffseasonHero
