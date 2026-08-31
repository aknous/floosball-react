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
  size?: number | string
  color?: string
  title?: string
}> = ({ size = '1.05em', color = 'currentColor', title }) => (
  // ⚠️ SIZED IN `em` BY DEFAULT so the mark scales with whatever text it sits in. A fixed
  // pixel default made every call site pick a number, and picking one is how the mark ends
  // up smaller than the label around it.
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
  /** Omit to INHERIT the surrounding text size, which is almost always what you want. */
  size?: number
  color?: string
  bold?: boolean
}> = ({ amount, size, color = '#eab308', bold = true }) => (
  // ⚠️ INHERITS THE PARENT'S SIZE UNLESS TOLD OTHERWISE. The first version defaulted to
  // 13px and every call site passed its own number, so the amount ended up smaller than the
  // button label it replaced — reported as the figures reading too small in the shop. Text
  // that used to inherit should keep inheriting.
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '0.3em',
    color, fontWeight: bold ? 700 : 500,
    ...(size ? { fontSize: size } : null),
    // ⚠️ NO `tabular-nums`. Much of this app renders currency in `pressStart`, a PIXEL face
    // that is already monospaced and has no tabular variant — asking for one lets the
    // browser fall back to a different face for the digits, which at the same pixel size
    // draws far smaller than Press Start 2P. Reported as pack prices looking tiny against
    // their own buttons. The figures line up anyway, because the font is fixed-width.
  }}>
    <FloobitSymbol color={color} />
    {amount.toLocaleString()}
  </span>
)

export default FloobitSymbol
