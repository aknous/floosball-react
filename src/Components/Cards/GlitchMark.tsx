import React, { useEffect, useRef, useState } from 'react'
import { GiProcessor, GiBiohazard } from 'react-icons/gi'

/**
 * The at-a-glance marker on a glitched card (docs/GLITCH_CARDS.md).
 *
 * A breathing rim alone cannot carry "this card is different" in a lineup of six — on a
 * surface that already has edition gradients, borders and art it reads as decoration. This
 * is the unmistakable part; the rim is atmosphere.
 *
 * WHY A PROCESSOR. This renders between 12 and 22 CSS pixels, and at that size detail
 * turns to mush — a virus as the resting glyph was unreadable (owner, 2026-08-07). A
 * processor is geometric and holds its silhouette down to xs. The cost is that it sits
 * inside the Cores' visual language (utils/coresVisual gives Halverson circuitry and uses
 * processor as the fallback), so the mark leans "system" rather than "infection". Swap the
 * resting glyph to GiCircuitry on the line below if that reads better in place.
 *
 * The FLICKER is where the meaning lives, and it runs the opposite way round to the first
 * attempt: the chip is the resting state and a CONTAMINATION mark flashes through it for
 * ~260ms. The chrome plan plays awakening as an SIR infection spreading via teammates and
 * tackles, so a card that caught something during a Criticality is infected — the system
 * holding, with the anomaly showing through.
 *
 * That frame was GiVirus, which reads as a SCORPION at 13px (owner, 2026-08-07). The
 * lesson is that a 260ms frame has no time to be decoded: only the silhouette lands, so
 * the glyph has to be shape, not detail. Biohazard is built for exactly that — three bold
 * lobes in rotational symmetry, legible tiny — and it keeps the contamination meaning the
 * virus was carrying. GiRadioactive is the equivalent swap if it reads better.
 *
 * On an AWAKENED card the flicker stops and the mark turns gold: that player is in
 * control, so nothing is showing through any more. Same distinction the frame carries.
 *
 * Pacing is deliberately slow. This sits on screen for as long as the collection view is
 * open, which is why it does not borrow the play-feed glitch animations (they sway, slam
 * and strobe) and why the owner asked for subtle.
 */

// Fraction of the box the glyph fills. Was driven by a font-size tuned for block
// CHARACTERS, which sit well inside their em box — an SVG does not, so the old numbers
// rendered the icon smaller than intended on top of an already-small mark.
const GLYPH_FILL = 0.72

interface Props {
  size: number
  top: number
  right: number
  awakened?: boolean
  title?: string
}

const GlitchMark: React.FC<Props> = ({ size, top, right, awakened, title }) => {
  const [jolt, setJolt] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    // An awakened card is deliberate rather than cracking, so it settles: no flicker.
    if (awakened) return undefined
    const id = setInterval(() => {
      setJolt(true)
      const t = setTimeout(() => setJolt(false), 260)
      timers.current.push(t)
    }, 2600)
    return () => {
      clearInterval(id)
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [awakened])

  const accent = awakened ? '#fde68a' : '#e9d5ff'
  const border = awakened ? 'rgba(253,224,138,0.85)' : 'rgba(196,181,253,0.9)'
  const bg = awakened ? 'rgba(253,224,138,0.18)' : 'rgba(139,92,246,0.30)'
  const Glyph = jolt ? GiBiohazard : GiProcessor
  const glyphPx = Math.round(size * GLYPH_FILL)

  return (
    <div
      title={title}
      style={{
        position: 'absolute',
        top, right, zIndex: 6,
        width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 3,
        // Chroma split only while jolting — the aberration IS the glitch tell, and
        // leaving it on permanently makes the mark look blurry rather than unstable.
        filter: jolt
          ? 'drop-shadow(-1px 0 rgba(244,114,182,0.85)) drop-shadow(1px 0 rgba(56,189,248,0.85))'
          : 'none',
        // A sub-pixel nudge on the jolt reads as a tear without moving the layout.
        transform: jolt ? 'translateX(0.5px) skewX(-4deg)' : 'none',
        opacity: jolt ? 0.88 : 1,
        pointerEvents: 'none',
      }}
    >
      <Glyph size={glyphPx} color={accent} style={{ display: 'block' }} />
    </div>
  )
}

export default GlitchMark
