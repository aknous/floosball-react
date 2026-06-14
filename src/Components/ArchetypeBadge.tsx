import React from 'react'
import { GiBroadsword, GiShield } from 'react-icons/gi'
import HoverTooltip from './HoverTooltip'

// Player archetype — a stable "what kind of player" identity from offensive
// vs defensive ratings (computed server-side). Rendered as compact icons that
// reuse the app's offense=sword / defense=shield convention; hover for the label.
const OFFENSE = '#fb923c'
const DEFENSE = '#38bdf8'

export const ARCHETYPE_LABEL: Record<string, string> = {
  offensive_weapon: 'Offensive Weapon',
  two_way: 'Two-Way Player',
  defensive_specialist: 'Defensive Specialist',
}

export const ArchetypeBadge: React.FC<{ archetype?: string | null; size?: number }> = ({ archetype, size = 14 }) => {
  const label = archetype ? ARCHETYPE_LABEL[archetype] : null
  if (!label) return null
  let icons: React.ReactNode
  if (archetype === 'offensive_weapon') icons = <GiBroadsword size={size} color={OFFENSE} />
  else if (archetype === 'defensive_specialist') icons = <GiShield size={size} color={DEFENSE} />
  else icons = <><GiBroadsword size={size} color={OFFENSE} /><GiShield size={size} color={DEFENSE} /></>
  return (
    <HoverTooltip text={label}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', verticalAlign: 'middle', cursor: 'help' }}>
        {icons}
      </span>
    </HoverTooltip>
  )
}

export default ArchetypeBadge
