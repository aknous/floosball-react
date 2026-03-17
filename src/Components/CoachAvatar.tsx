import React, { useMemo } from 'react'
import { createAvatar } from '@dicebear/core'
import { micah } from '@dicebear/collection'

interface CoachAvatarProps {
  name: string
  size?: number
  bgColor?: string | null
  style?: React.CSSProperties
  className?: string
}

const CoachAvatar: React.FC<CoachAvatarProps> = ({ name, size = 80, bgColor, style, className }) => {
  const bg = bgColor ? bgColor.replace('#', '') : '1e293b'
  const dataUri = useMemo(() => {
    return createAvatar(micah, {
      seed: `coach:${name}`,
      size,
      backgroundColor: [bg],
      backgroundType: ['solid'],
    }).toDataUri()
  }, [name, size, bg])

  return (
    <img
      src={dataUri}
      alt={name}
      width={size}
      height={size}
      style={{ borderRadius: '50%', flexShrink: 0, ...style }}
      className={className}
    />
  )
}

export default CoachAvatar
