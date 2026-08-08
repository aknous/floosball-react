import React from 'react'
import { useCoresStatus } from '@/contexts/CoresStatusContext'
import { bandVisual, CoreIcon, coreColor } from '@/utils/coresVisual'
import { BG, BORDER, TEXT, FONT, font } from '@/Components/Shell/tokens'
import { SectionHeader } from './frontPieces'

/**
 * The Cores' read on the simulation, in the rail.
 *
 * Deliberately NUMBER-FREE. `/api/cores/status` returns a qualitative band and nothing
 * else — the raw aggregate and threshold stay in the ungated debug endpoint and the
 * ephemeral control-room feed. The band IS the information here; showing a percentage
 * would turn a mood into a progress bar.
 *
 * This replaces the lone Criticality glyph that used to sit in the header, where it had
 * room to be a colour and nothing more. Here it can say who is speaking and what they
 * last said, which is the point of the Cores existing as characters.
 */
const CoresStatusPanel: React.FC = () => {
  const { status, lines, loading } = useCoresStatus()
  if (loading) return null

  const band = bandVisual(status.status)
  const label = status.label || band.label
  const description = status.description || band.fallback

  // The most recent line, whoever said it. One line, not a feed — the control room is
  // where the conversation lives.
  const latest = lines.length > 0 ? lines[0] : null

  return (
    <div style={{ fontFamily: FONT }}>
      <SectionHeader title="THE CORES" link={{ to: '/about', label: 'CONTROL ROOM →' }} rail />

      <div style={{ background: BG.card, border: `1px solid ${BORDER.hairline}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px',
          background: band.tint,
          borderBottom: `1px solid ${BORDER.hairline}`,
        }}>
          <span
            className={band.pulseMs ? 'cores-band-dot' : undefined}
            style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: band.color, flexShrink: 0,
              animationDuration: band.pulseMs ? `${band.pulseMs}ms` : undefined,
            }}
          />
          <span style={{ ...font(800, 13, 1, '0.1em'), color: band.color }}>
            {label.toUpperCase()}
          </span>
          <span style={{ flex: 1 }} />
          {status.inSuppression && (
            <span style={{ ...font(700, 9, 1, '0.1em'), color: TEXT.muted }}>CONTAINED</span>
          )}
        </div>

        <div style={{ padding: '12px 14px' }}>
          <p style={{ ...font(400, 12, 1.5), color: TEXT.secondary, margin: 0, textWrap: 'pretty' as any }}>
            {description}
          </p>
        </div>

        {latest && (
          <div style={{
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            padding: '12px 14px', borderTop: `1px solid ${BORDER.hairline}`,
            background: BG.panel,
          }}>
            <span style={{ paddingTop: '2px' }}>
              <CoreIcon core={latest.core} color={coreColor(latest.core)} size={15} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', ...font(700, 10, 1, '0.1em'), color: coreColor(latest.core) }}>
                {(latest.coreDisplayName || 'CORE').toUpperCase()}
              </span>
              <span style={{
                display: 'block', ...font(400, 12, 1.5), color: TEXT.muted, marginTop: '5px',
                textWrap: 'pretty' as any,
              }}>{latest.text}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default CoresStatusPanel
