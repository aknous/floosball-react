import React from 'react'

/**
 * The Floobit currency symbol: a blocky F struck through, in the manner of ₣ or ¥.
 *
 * ⚠️ DRAWN, NOT TYPED. The obvious shortcut is the Unicode franc sign ₣ (U+20A3), and it
 * is the wrong call here: the app renders currency in `pressStart`, a pixel face with no
 * glyph at that codepoint, so it would fall back to a system font and the symbol would be
 * the one character on screen in the wrong typeface — or a tofu box. An SVG renders
 * identically everywhere and scales with the number beside it.
 *
 * ⚠️ ONE COMPONENT BECAUSE THERE ARE 106 CALL SITES. Currency is currently written out as
 * "1,240 Floobits", "60 F", or a filled circle plus an F, depending on the file. Those
 * drifted because nothing owned the rendering.
 */
export const FloobitSymbol: React.FC<{
  size?: number
  color?: string
  title?: string
}> = ({ size = 14, color = 'currentColor', title }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       role={title ? 'img' : 'presentation'} aria-label={title}
       style={{ flexShrink: 0, display: 'block' }}>
    {title && <title>{title}</title>}
    {/* Stem */}
    <rect x="8" y="3" width="3.5" height="18" fill={color} />
    {/* Top arm */}
    <rect x="8" y="3" width="10" height="3.5" fill={color} />
    {/* Middle arm, shorter — the F */}
    <rect x="8" y="10" width="7.5" height="3.5" fill={color} />
    {/* The strike: what turns a letter into a currency mark. Crosses the stem below the
        middle arm and overhangs both sides so it reads as a bar rather than a serif. */}
    <rect x="4.5" y="15.5" width="12" height="2.6" fill={color} />
  </svg>
)

/**
 * A Floobit amount: the symbol and the number, spaced and aligned as one unit.
 *
 * ⚠️ The symbol leads, like $ and £ and unlike the trailing "F" this replaces — a trailing
 * mark reads as a unit of measurement ("60 kg") rather than as money.
 */
export const Floobits: React.FC<{
  amount: number
  size?: number
  color?: string
  bold?: boolean
}> = ({ amount, size = 13, color = '#eab308', bold = true }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.3),
    color, fontWeight: bold ? 700 : 500, fontSize: size,
    fontVariantNumeric: 'tabular-nums',
  }}>
    <FloobitSymbol size={Math.round(size * 1.05)} color={color} />
    {amount.toLocaleString()}
  </span>
)

export default FloobitSymbol
