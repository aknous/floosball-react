import React from 'react'
import { Link } from 'react-router-dom'
import PlayerHoverCard from './PlayerHoverCard'

interface PlayerLinkProps {
  playerId: number | null | undefined
  playerName: string
  // Inline styles applied to the rendered name. Forwarded to either the
  // <Link> (when playerId is present) or a plain <span> fallback.
  style?: React.CSSProperties
  // Optional className passthrough for callers that prefer Tailwind/etc.
  className?: string
  // When false, renders without the hover-card wrapper (still routes on click).
  hover?: boolean
}

const linkStyleBase: React.CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  cursor: 'pointer',
}

// Combined hover-card + click-to-route helper for any spot in the UI that
// shows a player's name. When playerId is provided, the name routes to
// /players/:id and shows the hover card on dwell. When playerId is missing
// (legacy events without ID enrichment), falls back to a plain styled span.
const PlayerLink: React.FC<PlayerLinkProps> = ({
  playerId, playerName, style, className, hover = true,
}) => {
  const mergedStyle: React.CSSProperties = { ...linkStyleBase, ...style }

  if (!playerId) {
    return <span style={style} className={className}>{playerName}</span>
  }

  const linkNode = (
    <Link to={`/players/${playerId}`} style={mergedStyle} className={className}>
      {playerName}
    </Link>
  )

  if (!hover) return linkNode

  return (
    <PlayerHoverCard playerId={playerId} playerName={playerName}>
      {linkNode}
    </PlayerHoverCard>
  )
}

export default PlayerLink
