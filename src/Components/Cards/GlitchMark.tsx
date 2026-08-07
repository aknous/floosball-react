import React, { useEffect, useRef, useState } from 'react'

/**
 * The at-a-glance marker on a glitched card (docs/GLITCH_CARDS.md).
 *
 * A breathing rim alone cannot carry "this card is different" in a lineup of six — on a
 * surface that already has edition gradients, borders and art it reads as decoration. This
 * is the unmistakable part; the rim is atmosphere.
 *
 * The glyph itself flickers, because a static block would look like a UI chip rather than
 * something wrong with the card. It swaps character on a slow cycle with a short hold, so
 * it reads as unstable while you are looking at it and stays quiet when you are not. That
 * pacing matters: this sits on screen for as long as the collection view is open, which is
 * why it does not use the play-feed glitch animations (they sway, slam and strobe).
 *
 * Gold once the depicted player is AWAKENED — a player in control, matching the treatment
 * the card frame converges on.
 */

const MARKS = '▓▒░█▚▞▛▜'

interface Props {
  size: number
  font: number
  top: number
  right: number
  awakened?: boolean
  title?: string
}

const GlitchMark: React.FC<Props> = ({ size, font, top, right, awakened, title }) => {
  const [glyph, setGlyph] = useState(MARKS[0])
  const [jolt, setJolt] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    // An awakened card is deliberate rather than cracking, so it settles: slower cycle,
    // no jolt. The marker carries the same distinction the frame does.
    const period = awakened ? 3200 : 1700
    const hold = awakened ? 200 : 320
    const id = setInterval(() => {
      setGlyph(MARKS[Math.floor(Math.random() * MARKS.length)])
      if (!awakened) setJolt(true)
      const t = setTimeout(() => {
        setGlyph(MARKS[0])
        setJolt(false)
      }, hold)
      timers.current.push(t)
    }, period)
    return () => {
      clearInterval(id)
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [awakened])

  const accent = awakened ? '#fde68a' : '#e9d5ff'
  const border = awakened ? 'rgba(253,224,138,0.85)' : 'rgba(196,181,253,0.9)'
  const bg = awakened ? 'rgba(253,224,138,0.18)' : 'rgba(139,92,246,0.30)'

  return (
    <div
      title={title}
      style={{
        position: 'absolute',
        top, right, zIndex: 6,
        width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: font, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1,
        color: accent,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 3,
        // Chroma split only while jolting — the aberration IS the glitch tell, and
        // leaving it on permanently makes the glyph look blurry rather than unstable.
        textShadow: jolt
          ? `-1px 0 rgba(244,114,182,0.9), 1px 0 rgba(56,189,248,0.9), 0 0 8px ${accent}`
          : `0 0 6px ${accent}`,
        opacity: jolt ? 0.85 : 1,
        pointerEvents: 'none',
      }}
    >
      {glyph}
    </div>
  )
}

export default GlitchMark
