import React from 'react'

interface CoachAvatarProps {
  name?: string
  teamId?: number | null
  size?: number
  style?: React.CSSProperties
  className?: string
}

// Coach "avatar" — same direction as PlayerAvatar: render the team
// identity rather than a generated face or initials. Falls back to a
// neutral gray circle when there's no team (unsigned coach pool).
const CoachAvatar: React.FC<CoachAvatarProps> = ({ name, teamId, size = 80, style, className }) => {
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

export default CoachAvatar
