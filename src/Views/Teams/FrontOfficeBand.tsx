import React, { useCallback, useState } from 'react'

import HoverTooltip from '@/Components/HoverTooltip'
import FacilitiesSection, { FrontOfficeSummary } from '@/Views/FrontOffice/FacilitiesSection'
import SupporterCard from '@/Components/FrontOffice/SupporterCard'
import { appealRank } from '@/utils/facilities'
import { readableOnDark } from '@/utils/colors'

/**
 * FRONT OFFICE — the fan-controls band on the team page.
 *
 * Named for what the app already calls this: `/front-office` redirects here,
 * the vote surfaces are FrontOfficePanel/FrontOfficeModal, and the sim itself
 * talks about the Front Office opening at week 22. Reusing that word makes the
 * merge legible instead of introducing a second name for one thing.
 *
 * Everything above this on the page is REPORTAGE: public, read-only, true for
 * whoever is looking. Everything in here is YOURS: private, transactional, and
 * only meaningful for the one team you follow. Those are different kinds of
 * thing, and previously they ran together with nothing but a heading between
 * them — which is what made the controls read as tacked on rather than placed.
 *
 * So the seam is drawn on purpose. The band is full-bleed and tinted, the same
 * device the trophy case uses to say "this strip is a different register", and
 * the contents are restyled into the page's own language (radius 0, #131e2f on
 * #0b1220) instead of arriving with the Front Office's 8px cards.
 *
 * The summary strip carries the three numbers a fan actually acts on, with
 * DIVIDEND kept visually apart from Treasury and Appeal: your dividend is
 * income you collect, the other two are the team's standing you spend into.
 * Reading them as one row implied a relationship that isn't there.
 */

const BAND_BG = 'rgba(56,189,248,0.05)'
const BAND_RULE = 'rgba(56,189,248,0.22)'

const StatLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
    color: '#cbd5e1', textTransform: 'uppercase',
  }}>{children}</div>
)

const StatValue: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <div style={{
    fontSize: '23px', lineHeight: 1.15, fontWeight: 800, color,
    marginTop: '4px', fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }}>{children}</div>
)

interface Props {
  pad: number
  pageMax: string
  stacked: boolean
  /** The team's own colour, already lifted to be legible on the dark page. */
  accent: string
}

const FrontOfficeBand: React.FC<Props> = ({ pad, pageMax, stacked, accent }) => {
  const [summary, setSummary] = useState<FrontOfficeSummary | null>(null)

  // Stable identity: FacilitiesSection calls this from an effect, so a fresh
  // function each render would loop it.
  const onSummary = useCallback((s: FrontOfficeSummary) => setSummary(s), [])

  const tint = readableOnDark(accent)

  return (
    <div id="tp-frontoffice" className="tp-section" style={{
      backgroundColor: BAND_BG,
      borderTop: `1px solid ${BAND_RULE}`,
      borderBottom: `1px solid ${BAND_RULE}`,
      marginTop: '44px',
    }}>
      <div style={{ maxWidth: pageMax, margin: '0 auto', padding: `20px ${pad}px 26px` }}>

        <div style={{
          display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px',
        }}>
          <span style={{
            fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em',
            color: '#0b1220', backgroundColor: '#38bdf8', padding: '3px 9px',
          }}>Front office</span>
          <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
            Only you see these controls
          </span>
          <span style={{ flex: 1, height: '2px', backgroundColor: 'rgba(56,189,248,0.18)' }} />
        </div>

        {/* Summary strip. Treasury and Appeal are the team's standing; the
            dividend is yours, so it sits past a divider rather than as a third
            equal column. */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: stacked ? '1fr' : 'minmax(0,1fr) minmax(0,1fr) 1px minmax(0,1.2fr)',
          gap: stacked ? '18px' : '22px',
          alignItems: 'start',
          paddingBottom: '20px',
          borderBottom: '1px solid #1e293b',
        }}>
          <div>
            <HoverTooltip
              text="Floobits your fanbase has banked. At season end it covers unfunded upkeep first, then active projects."
              color="#fbbf24"
            >
              <StatLabel>Treasury</StatLabel>
            </HoverTooltip>
            <StatValue color="#fbbf24">
              {summary ? `${summary.treasury.toLocaleString()} F` : '—'}
            </StatValue>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              The project fund
            </div>
          </div>

          <div>
            <HoverTooltip
              text="How strong your facilities are overall, from your combined facility levels."
              color="#34d399"
            >
              <StatLabel>Appeal</StatLabel>
            </HoverTooltip>
            <StatValue color={tint}>
              {summary ? appealRank(summary.appeal) : '—'}
            </StatValue>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Facility quality
            </div>
          </div>

          {!stacked && <span style={{ width: '1px', alignSelf: 'stretch', backgroundColor: '#1e293b' }} />}

          {/* Your income, not the team's. Kept as its own strip. */}
          <div>
            <SupporterCard square />
          </div>
        </div>

        {/* Spending: upkeep, projects, the ballot. */}
        <div style={{ marginTop: '22px' }}>
          <FacilitiesSection variant="band" onSummary={onSummary} />
        </div>
      </div>
    </div>
  )
}

export default FrontOfficeBand
