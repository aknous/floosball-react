import React from 'react'
import HoverTooltip from './HoverTooltip'

export type TeamFormState =
  | 'HOT_STREAK'
  | 'GETTING_HOT'
  | 'STEADY'
  | 'SHAKY'
  | 'COOLING_OFF'
  | 'SPIRALING'
  | 'COMPLACENT'
  | 'RESOLUTE'
  | 'UNKNOWN'

interface FormConfig {
  label: string
  color: string
  bg: string
  blurb: string
}

// One source of truth for label / color / hover blurb. Mirrors the
// TeamResponseBuilder.computeFormState backend rules.
const FORM_CONFIG: Record<TeamFormState, FormConfig> = {
  HOT_STREAK:  { label: 'Hot Streak',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  blurb: '3+ wins in a row' },
  GETTING_HOT: { label: 'Getting Hot', color: '#f97316', bg: 'rgba(249,115,22,0.15)', blurb: 'Building momentum' },
  STEADY:      { label: 'Steady',      color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', blurb: 'Holding the line' },
  SHAKY:       { label: 'Shaky',       color: '#eab308', bg: 'rgba(234,179,8,0.15)',  blurb: 'Recent slip' },
  COOLING_OFF: { label: 'Cooling Off', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',  blurb: 'Cracks showing' },
  SPIRALING:   { label: 'Spiraling',   color: '#7c3aed', bg: 'rgba(124,58,237,0.18)', blurb: '3+ losses, no resolve' },
  COMPLACENT:  { label: 'Complacent',  color: '#a855f7', bg: 'rgba(168,85,247,0.15)', blurb: 'Winning, but cracking' },
  RESOLUTE:    { label: 'Resolute',    color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  blurb: 'Battling back' },
  UNKNOWN:     { label: '',            color: '',        bg: '',                       blurb: '' },
}

interface Props {
  state: TeamFormState | string | undefined | null
  size?: 'dot' | 'small' | 'medium'
}

const TeamFormBadge: React.FC<Props> = ({ state, size = 'medium' }) => {
  if (!state || state === 'UNKNOWN') return null
  const config = FORM_CONFIG[state as TeamFormState]
  if (!config) return null

  // Dot variant: compact colored circle for tight rows (standings, etc).
  // Hover surfaces the label only — the dot is meant to be glanceable.
  if (size === 'dot') {
    return (
      <HoverTooltip text={config.label} color={config.color}>
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.color,
          boxShadow: `0 0 6px ${config.color}80`,
          flexShrink: 0,
        }} />
      </HoverTooltip>
    )
  }

  const padding = size === 'small' ? '1px 6px' : '2px 8px'
  const fontSize = size === 'small' ? '10px' : '11px'
  return (
    <HoverTooltip text={config.blurb} color={config.color}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        borderRadius: '3px',
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}55`,
      }}>
        {config.label}
      </span>
    </HoverTooltip>
  )
}

export default TeamFormBadge
