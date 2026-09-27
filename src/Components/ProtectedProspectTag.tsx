import React from 'react'
import HoverTooltip from '@/Components/HoverTooltip'

/**
 * A promoted prospect still on the contract he was promoted onto.
 *
 * Until that contract ends his team can keep him or trade him, and nothing else: no
 * cut to make room for a trade, an upgrade or another prospect (owner, 2026-09-27).
 * The contract runs at least the seasons he had left in the pipeline, so the tag is
 * the reason a team with a weak starter at his position is not simply replacing him.
 *
 * Teal, the color the Transactions page uses for a promotion.
 */
const ProtectedProspectTag: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'sm' }) => (
  <HoverTooltip text="Promoted prospect. His team can keep him or trade him, but can't cut him until this contract ends.">
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: size === 'md' ? '11px' : '10px',
      fontWeight: 800,
      letterSpacing: '0.02em',
      color: '#2dd4bf',
      backgroundColor: 'rgba(45,212,191,0.12)',
      padding: size === 'md' ? '3px 8px' : '2px 6px',
      borderRadius: '3px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {/* A shield: protected. */}
      <svg width={size === 'md' ? 11 : 10} height={size === 'md' ? 11 : 10} viewBox="0 0 20 20"
           fill="currentColor" aria-hidden="true">
        <path d="M10 1l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V4l7-3z" />
      </svg>
      PROSPECT
    </span>
  </HoverTooltip>
)

export default ProtectedProspectTag
