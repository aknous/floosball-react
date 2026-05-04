import React from 'react'

interface PlayerAvatarProps {
  name?: string
  teamId?: number | null
  size?: number
  style?: React.CSSProperties
  className?: string
}

// Player "avatar" — renders the team avatar PNG so the visual identity
// belongs to the team, not a generated face / initials. Falls back to a
// neutral gray circle when there's no team (free agents, retired with
// missing team metadata, etc.).
const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ name, teamId, size = 32, style, className }) => {
  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: '50%',
    objectFit: 'contain',
    ...style,
  }

  if (teamId) {
    return (
      <img
        className={className}
        title={name}
        alt=""
        src={`/avatars/${teamId}.png`}
        style={baseStyle}
      />
    )
  }

  // No team → neutral placeholder
  return (
    <div
      className={className}
      title={name}
      style={{
        ...baseStyle,
        backgroundColor: '#334155',
      }}
    />
  )
}

export default PlayerAvatar
