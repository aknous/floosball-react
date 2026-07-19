import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { calcStars, STAR_COLORS } from '@/Components/Stars'
import { useIsMobile } from '@/hooks/useIsMobile'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Inject card animation keyframes once
if (typeof document !== 'undefined' && !document.getElementById('card-fx-keyframes')) {
  const style = document.createElement('style')
  style.id = 'card-fx-keyframes'
  style.textContent = `
    @keyframes matchGlowPulse {
      0%, 100% { box-shadow: 0 0 8px var(--glow-color), 0 0 18px var(--glow-color-soft); }
      50% { box-shadow: 0 0 14px var(--glow-color-bright), 0 0 28px var(--glow-color); }
    }
    @keyframes cardShimmer {
      0% { transform: translateX(-100%) rotate(25deg); }
      100% { transform: translateX(200%) rotate(25deg); }
    }
    @keyframes holoSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes editionGlow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    @keyframes holoEdge {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes sparkle {
      0%, 100% { opacity: 0; transform: scale(0); }
      50% { opacity: 1; transform: scale(1); }
    }
    @keyframes diamondBorder {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
  `
  document.head.appendChild(style)
}

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Edition visual config ─────────────────────────────────────────────────
export const EDITION_STYLES: Record<string, {
  borderColor: string
  bgGradient: string
  labelColor: string
  label: string
  rarity: string
  glowColor?: string
}> = {
  // Sub-base "no-effect" print — the plain floor card that just fields the player
  // for their FP. Flattest/mattest treatment, no foil (see edition FX gating).
  standard: {
    borderColor: '#414a5c',
    bgGradient: 'linear-gradient(140deg, #2b3242 0%, #232a36 60%, #2a313f 100%)',
    labelColor: '#8895a9',
    label: 'Standard',
    rarity: 'No Effect',
  },
  base: {
    borderColor: '#5b6b83',
    bgGradient: 'linear-gradient(140deg, #3a475c 0%, #28303f 55%, #333d4f 100%)',
    labelColor: '#aebacd',
    label: 'Base',
    rarity: 'Common',
  },
  holographic: {
    borderColor: '#a78bfa',
    bgGradient: 'linear-gradient(140deg, #241a5e 0%, #3a1673 48%, #221a52 100%)',
    labelColor: '#c4b5fd',
    label: 'Holographic',
    rarity: 'Uncommon',
    glowColor: 'rgba(167,139,250,0.35)',
  },
  prismatic: {
    borderColor: '#ec4899',
    bgGradient: 'linear-gradient(140deg, #3a1173 0%, #8a1f52 38%, #1e3a5f 70%, #075e4b 100%)',
    labelColor: '#f9a8d4',
    label: 'Prismatic',
    rarity: 'Rare',
    glowColor: 'rgba(236,72,153,0.4)',
  },
  diamond: {
    borderColor: '#67e8f9',
    bgGradient: 'linear-gradient(140deg, #0c4a6e 0%, #136a86 38%, #1e3a5f 68%, #0e7490 100%)',
    labelColor: '#a5f3fc',
    label: 'Diamond',
    rarity: 'Ultra-Rare',
    glowColor: 'rgba(103,232,249,0.45)',
  },
}

const POSITION_LABELS: Record<number, string> = {
  1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K',
}

// Category colors for the effect badge
const CATEGORY_COLORS: Record<string, string> = {
  flat_fp: '#4ade80',      // green
  multiplier: '#a78bfa',   // purple
  floobits: '#eab308',     // gold
  conditional: '#60a5fa',  // blue
  streak: '#fb923c',       // orange
}

// Behavior tags — shown on cards so users know which modifiers affect them
const BEHAVIOR_TAGS: Record<string, {
  label: string
  color: string
  tooltip: string
}> = {
  chance: {
    label: 'Chance',
    color: '#c084fc',      // light purple
    tooltip: 'Chance — Has a random trigger roll. Boosted by Fortunate modifier.',
  },
  conditional: {
    label: 'Conditional',
    color: '#60a5fa',      // blue
    tooltip: 'Conditional — Triggers when a game condition is met. Doubled by Longshot modifier.',
  },
  streak: {
    label: 'Streak',
    color: '#fb923c',      // orange
    tooltip: 'Streak — Grows each week a condition holds, resets when broken. Protected by Ironclad modifier.',
  },
}

// Classification badge config (perks from card classifications)
const CLASSIFICATION_CONFIG: Record<string, {
  label: string
  abbr: string
  color: string
  bgColor: string
  borderColor: string
  tooltip: string
}> = {
  // Solid deep-jewel fills with near-white ink — legible on any edition (incl.
  // MVP on the diamond). `bgColor` is the fill, `color` the ink, `borderColor` a
  // subtle light rim.
  rookie: {
    label: 'Rookie', abbr: 'R', color: '#f8fafc',
    bgColor: '#a16207', borderColor: 'rgba(255,255,255,0.2)',
    tooltip: 'Rookie — Sells for 2x Floobits',
  },
  mvp: {
    label: 'MVP', abbr: 'MVP', color: '#f8fafc',
    bgColor: '#2563eb', borderColor: 'rgba(255,255,255,0.2)',
    tooltip: 'MVP — unlocks the FLEX lineup slot',
  },
  champion: {
    label: 'Champion', abbr: 'CH', color: '#f8fafc',
    bgColor: '#c2410c', borderColor: 'rgba(255,255,255,0.2)',
    tooltip: 'Champion — prior-season title winner',
  },
  all_pro: {
    label: 'All-Pro', abbr: 'AP', color: '#f8fafc',
    bgColor: '#7c3aed', borderColor: 'rgba(255,255,255,0.2)',
    tooltip: 'All-Pro — prior-season All-Pro selection',
  },
}

function parseClassifications(classification?: string | null, isRookie?: boolean): string[] {
  if (classification) {
    return ['rookie', 'mvp', 'champion', 'all_pro'].filter(
      key => classification.includes(key)
    )
  }
  // Backward compat: fall back to isRookie flag
  if (isRookie) return ['rookie']
  return []
}

// FP-type colors for colorizing effect text
const TYPE_COLORS: Record<string, string> = {
  fp: '#4ade80',       // green
  mult: '#f472b6',     // pink — FPx
  floobits: '#eab308', // gold
}

/**
 * Parse text for FP-type keywords and wrap them + their numeric prefix in colored spans.
 */
function colorizeEffectText(text: string, baseColor: string): React.ReactNode {
  // Determine dominant color from keywords in the text
  const dominantColor = /FPx|\+FPx/.test(text) ? TYPE_COLORS.mult
    : /Floobits/.test(text) ? TYPE_COLORS.floobits
    : /FP\b/.test(text) ? TYPE_COLORS.fp
    : null
  // Match: keyword with optional leading number/range, OR standalone signed numbers
  const pattern = /([+-]?\d+\.?\d*x?[–\-]\d+\.?\d*x?\s*|[+-]?\d+\.?\d*x?\s*)?(\+?FPx|FP\b|Floobits\b|F\b)|(?<=[,\s]|^)([+-]\d+\.?\d*x?)(?=\s|$|,)/g
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    if (m[2]) {
      // Keyword match — color by keyword type
      const kw = m[2]
      const color = (kw === 'FPx' || kw === '+FPx') ? TYPE_COLORS.mult
        : (kw === 'Floobits' || kw === 'F') ? TYPE_COLORS.floobits
        : TYPE_COLORS.fp
      parts.push(<span key={m.index} style={{ color }}>{m[0]}</span>)
    } else if (m[3]) {
      // Standalone signed number — use dominant color
      const color = dominantColor || TYPE_COLORS.fp
      parts.push(<span key={m.index} style={{ color }}>{m[3]}</span>)
    }
    lastIdx = m.index + m[0].length
  }
  if (parts.length === 0) return text
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
  return <>{parts}</>
}

export interface CardData {
  id: number
  templateId: number
  playerId: number
  playerName: string
  teamId: number | null
  teamColor: string | null
  playerRating: number
  ratingStars?: number  // precomputed star count (falls back to calcStars)
  position: number
  edition: string
  tier?: number  // Upgrade tier 1-4 (I-IV); ribbon shown for 2+, gold ring at 4
  tierNote?: string | null  // distinct line, e.g. "Tier 4: +90 FP" or "Tier 4: ×1.5 output"
  seasonCreated: number
  isRookie: boolean
  classification?: string | null
  effectConfig: any
  effectName?: string
  displayName?: string
  category?: string
  outputType?: string
  tagline?: string
  tooltip?: string
  detail?: string
  sellValue: number
  isActive: boolean
  isEquipped?: boolean
  vaulted?: boolean  // permanently in the Vault — can't equip/sell/combine
  // Player's stat line for the card's season — shown on the back of a vaulted
  // card (which drops its effect and becomes a keepsake player card).
  playerStats?: {
    season: number
    teamName?: string | null
    teamColor?: string | null
    fantasyPoints: number
    lines: { label: string; value: number | string }[]
  } | null
  acquiredAt: string | null
  acquiredVia: string
  // Pack-reveal only: how many of this effect the user already owns (non-vaulted).
  // >0 means keeping this card yields a same-effect duplicate (Level Up fuel).
  ownedEffectCount?: number
  // Showcase-context only: this card's scoring breakdown + its Floobit share of
  // the weekly dividend (attached by the showcase endpoints).
  showcase?: {
    editionPoints: number
    classificationPoints: number
    recency: number
    tierMult: number
    points: number
    dividend: number
  }
}

interface TradingCardProps {
  card: CardData
  size?: 'xs' | 'sm' | 'md' | 'lg'
  selected?: boolean
  onSelect?: () => void
  onClick?: () => void
  onLevelUp?: () => void  // shows a "Level Up" affordance (collection view)
  onTrash?: () => void    // shows a "Trash" affordance (vault view — permanent delete)
  showSellValue?: boolean
  glowColor?: string  // persistent outline/glow (e.g. team color for roster match)
  staticGlow?: boolean  // if true, glow without pulse animation (for deck cards)
  noHoverLift?: boolean  // disable translateY on hover (parent handles it)
  onHoverChange?: (hovered: boolean) => void
  forceFlipped?: boolean  // externally control flip state (e.g. tutorial)
  // For All-Pro cards in equipped context: 'active' = swap grant available,
  // 'used' = grant already consumed. Undefined for non-equipped cards or
  // non-All-Pro cards — badge renders normally.
  apSwapState?: 'active' | 'used'
}

const SIZES = {
  xs: { width: 105, height: 178, font: 9, nameFont: 11, avatar: 50, pad: 6, starSize: 16 },
  sm: { width: 160, height: 270, font: 12, nameFont: 14, avatar: 76, pad: 8, starSize: 22 },
  md: { width: 200, height: 340, font: 14, nameFont: 17, avatar: 100, pad: 12, starSize: 28 },
  lg: { width: 260, height: 430, font: 16, nameFont: 20, avatar: 128, pad: 16, starSize: 34 },
}

// Tier badge (hexagon) dimensions per card size. Pinned just under the header
// divider, top-left of the body. `top` clears the header (≈ 2×(pad-2) + label).
const TIER_BADGE_DIMS = {
  xs: { top: 25, left: 6, w: 20, h: 17, font: 7 },
  sm: { top: 32, left: 8, w: 23, h: 20, font: 8 },
  md: { top: 42, left: 10, w: 27, h: 23, font: 10 },
  lg: { top: 53, left: 13, w: 32, h: 27, font: 12 },
}

const TIER_ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' }
const HEX_CLIP = 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)'

// Delegate to calcStars + STAR_COLORS so the card's tier color can't drift out
// of sync with the star count it displays. Previously hardcoded thresholds here
// used different cutoffs (95/85/75/65) than the backend star bands (92/84/76/68),
// which caused e.g. an 84-rated player to render 4 stars but in 3-star blue.
const getTierColor = (rating: number): string => STAR_COLORS[calcStars(rating)]

const ClassificationBadge: React.FC<{
  abbr: string
  color: string
  bgColor: string
  borderColor: string
  tooltip: string
  fontSize: number
  // For All-Pro badges in equipped context: 'active' = unused swap available,
  // 'used' = swap consumed this game day. Undefined = no swap state to show.
  swapState?: 'active' | 'used'
}> = ({ abbr, color, bgColor, borderColor, tooltip, fontSize, swapState }) => {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShow(true)
  }

  // Dim the badge when the All-Pro swap grant has already been used this
  // game day so users can see at a glance which AP cards still carry an
  // unused swap.
  const isUsed = swapState === 'used'
  const badgeOpacity = isUsed ? 0.45 : 1
  // Tooltip override for AP swap state
  const effectiveTooltip = swapState === 'active' ? 'All-Pro — Swap available'
    : swapState === 'used' ? 'All-Pro — Swap used this game day'
    : tooltip
  // Dot color: green for active, gray for used
  const dotColor = swapState === 'active' ? '#22c55e'
    : swapState === 'used' ? '#64748b'
    : null

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        style={{
          fontSize, fontWeight: '800', color,
          backgroundColor: bgColor, padding: '2px 5px',
          borderRadius: '4px', border: `1px solid ${borderColor}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22)',
          cursor: 'default',
          opacity: badgeOpacity,
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          transition: 'opacity 0.2s',
        }}
      >
        {abbr}
        {dotColor && (
          <span
            style={{
              width: '5px', height: '5px',
              borderRadius: '50%',
              backgroundColor: dotColor,
              display: 'inline-block',
              boxShadow: swapState === 'active' ? `0 0 4px ${dotColor}` : 'none',
              flexShrink: 0,
            }}
          />
        )}
      </span>
      {show && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#0f172a',
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '11px',
          color,
          lineHeight: '1',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 10010,
          pointerEvents: 'none',
          fontFamily: 'pressStart',
          whiteSpace: 'nowrap',
        }}>
          {effectiveTooltip}
        </div>,
        document.body
      )}
    </>
  )
}

const EditionBadge: React.FC<{
  label: string
  rarity: string
  color: string
  fontSize: number
}> = ({ label, rarity, color, fontSize }) => {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShow(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        style={{
          fontSize, fontWeight: '700', color,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          cursor: 'default',
        }}
      >
        {label}
      </span>
      {show && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '11px',
          color,
          lineHeight: '1',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 10010,
          pointerEvents: 'none',
          fontFamily: 'pressStart',
          whiteSpace: 'nowrap',
        }}>
          {rarity}
        </div>,
        document.body
      )}
    </>
  )
}

export function getBehaviorTag(card: CardData): keyof typeof BEHAVIOR_TAGS | null {
  if (card.effectConfig?.isChanceEffect || card.effectConfig?.primary?.isChanceEffect) return 'chance'
  const cat = card.category || card.effectConfig?.category || ''
  if (cat === 'conditional') return 'conditional'
  if (cat === 'streak') return 'streak'
  return null
}

const BehaviorTag: React.FC<{
  label: string
  color: string
  tooltip: string
  fontSize: number
}> = ({ label, color, tooltip, fontSize }) => {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShow(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        style={{
          fontSize: fontSize - 1, color,
          backgroundColor: `${color}18`,
          padding: '1px 5px',
          borderRadius: '3px',
          border: `1px solid ${color}40`,
          cursor: 'default',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {show && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#0f172a',
          border: `1px solid ${color}40`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '10px',
          color: '#e2e8f0',
          lineHeight: '1.5',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 10010,
          pointerEvents: 'none',
          fontFamily: 'pressStart',
          maxWidth: '260px',
          textAlign: 'center',
        }}>
          {tooltip}
        </div>,
        document.body
      )}
    </>
  )
}

const EffectNameBadge: React.FC<{
  name: string
  tooltip: string
  color: string
  fontSize: number
}> = ({ name, tooltip, color, fontSize }) => {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (!ref.current || !tooltip) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
    setShow(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        style={{
          fontSize, fontWeight: '700', color,
          cursor: tooltip ? 'help' : 'default',
        }}
      >
        {name}
      </span>
      {show && tooltip && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#0f172a',
          border: `1px solid ${color}40`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '10px',
          color: '#e2e8f0',
          lineHeight: '1.5',
          whiteSpace: 'pre-line',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 10010,
          pointerEvents: 'none',
          fontFamily: 'pressStart',
          maxWidth: '280px',
          textAlign: 'center',
        }}>
          {tooltip}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Edition FX Overlays ──────────────────────────────────────────────────
/// Layered visual effects: Holo=subtle shimmer, Prismatic=iridescent+edge, Diamond=edge+sparkles

const SHIMMER_CONFIGS: Record<string, {
  gradient: string
  duration: string
  opacity: number
}> = {
  holographic: {
    gradient: 'linear-gradient(105deg, transparent 35%, rgba(167,139,250,0.06) 45%, rgba(255,255,255,0.08) 50%, rgba(167,139,250,0.06) 55%, transparent 65%)',
    duration: '4.5s',
    opacity: 1,
  },
  prismatic: {
    gradient: 'linear-gradient(105deg, transparent 30%, rgba(244,114,182,0.08) 40%, rgba(167,139,250,0.12) 45%, rgba(96,165,250,0.08) 50%, rgba(52,211,153,0.08) 55%, transparent 65%)',
    duration: '4s',
    opacity: 1,
  },
  diamond: {
    gradient: 'linear-gradient(105deg, transparent 25%, rgba(103,232,249,0.1) 35%, rgba(255,255,255,0.2) 45%, rgba(103,232,249,0.12) 55%, rgba(255,255,255,0.08) 65%, transparent 75%)',
    duration: '3s',
    opacity: 1,
  },
}

const ShimmerOverlay: React.FC<{ edition: string }> = ({ edition }) => {
  const config = SHIMMER_CONFIGS[edition]
  if (!config) return null
  return (
    <div style={{
      position: 'absolute', inset: 0,
      overflow: 'hidden', borderRadius: '11px',
      pointerEvents: 'none', zIndex: 1,
    }}>
      <div style={{
        position: 'absolute',
        top: '-50%', left: '-50%',
        width: '200%', height: '200%',
        background: config.gradient,
        animation: `cardShimmer ${config.duration} ease-in-out infinite`,
        opacity: config.opacity,
      }} />
    </div>
  )
}

const GLOW_CONFIGS: Record<string, {
  color: string
  softColor: string
  duration: string
}> = {
  holographic: {
    color: 'rgba(167,139,250,0.2)',
    softColor: 'rgba(167,139,250,0.08)',
    duration: '4s',
  },
  prismatic: {
    color: 'rgba(244,114,182,0.3)',
    softColor: 'rgba(244,114,182,0.12)',
    duration: '3.5s',
  },
  diamond: {
    color: 'rgba(103,232,249,0.35)',
    softColor: 'rgba(103,232,249,0.15)',
    duration: '2.5s',
  },
}

const SPARKLE_POSITIONS = [
  { top: '12%', left: '18%', delay: '0s', size: 3 },
  { top: '25%', left: '78%', delay: '0.8s', size: 2 },
  { top: '45%', left: '12%', delay: '1.6s', size: 2.5 },
  { top: '60%', left: '85%', delay: '0.4s', size: 3 },
  { top: '75%', left: '35%', delay: '2.0s', size: 2 },
  { top: '88%', left: '65%', delay: '1.2s', size: 2.5 },
  { top: '35%', left: '50%', delay: '2.4s', size: 3 },
  { top: '15%', left: '55%', delay: '1.8s', size: 2 },
]

const SparkleOverlay: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0,
    pointerEvents: 'none', zIndex: 2,
    borderRadius: '11px', overflow: 'hidden',
  }}>
    {SPARKLE_POSITIONS.map((sp, i) => (
      <div key={i} style={{
        position: 'absolute',
        top: sp.top, left: sp.left,
        width: sp.size, height: sp.size,
        borderRadius: '50%',
        backgroundColor: '#fff',
        boxShadow: '0 0 4px 1px rgba(103,232,249,0.5), 0 0 8px rgba(255,255,255,0.6)',
        animation: `sparkle 2.8s ease-in-out ${sp.delay} infinite`,
        opacity: 0,
      }} />
    ))}
  </div>
)

// Holographic iridescent background overlay — subtle color shift
const HoloBackgroundOverlay: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0,
    borderRadius: '11px', overflow: 'hidden',
    pointerEvents: 'none', zIndex: 1,
    filter: 'blur(20px)',
  }}>
    <div style={{
      position: 'absolute',
      top: '-25%', left: '-25%',
      width: '150%', height: '150%',
      background: 'conic-gradient(from 0deg, rgba(244,114,182,0.12), rgba(167,139,250,0.25), rgba(96,165,250,0.05), rgba(52,211,153,0.25), rgba(250,204,21,0.12), rgba(244,114,182,0.05))',
      animation: 'holoSpin 10s linear infinite',
      transformOrigin: 'center center',
    }} />
  </div>
)

const HoloEdgeShimmer: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0,
    borderRadius: '11px', overflow: 'hidden',
    pointerEvents: 'none', zIndex: 2,
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    maskComposite: 'exclude',
    WebkitMaskComposite: 'xor',
    padding: '3px',
  }}>
    <div style={{
      position: 'absolute',
      top: '-50%', left: '-50%',
      width: '200%', height: '200%',
      background: 'conic-gradient(from 0deg, transparent 0%, rgba(244,114,182,0.7) 10%, transparent 20%, transparent 50%, rgba(167,139,250,0.7) 60%, transparent 70%)',
      animation: 'holoEdge 4s linear infinite',
      transformOrigin: 'center center',
    }} />
  </div>
)

const DiamondEdgeShimmer: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0,
    borderRadius: '11px', overflow: 'hidden',
    pointerEvents: 'none', zIndex: 2,
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    maskComposite: 'exclude',
    WebkitMaskComposite: 'xor',
    padding: '3px',
  }}>
    <div style={{
      position: 'absolute',
      top: '-50%', left: '-50%',
      width: '200%', height: '200%',
      background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.9) 8%, rgba(103,232,249,0.7) 12%, transparent 20%, transparent 45%, rgba(103,232,249,0.8) 53%, rgba(255,255,255,0.9) 58%, transparent 65%)',
      animation: 'holoEdge 3s linear infinite',
      transformOrigin: 'center center',
    }} />
  </div>
)

const TradingCard: React.FC<TradingCardProps> = ({
  card, size = 'md', selected = false, onSelect, onClick, onLevelUp, onTrash, showSellValue = false, glowColor, staticGlow, noHoverLift, onHoverChange, forceFlipped, apSwapState,
}) => {
  const [hovered, setHovered] = useState(false)
  const [flipped, setFlipped] = useState(false)
  // Touch devices have no hover, so hover-gated affordances (select / level-up /
  // trash) must show without it.
  const isMobile = useIsMobile()
  const showActions = hovered || isMobile

  // Sync with external forceFlipped prop (tutorial)
  useEffect(() => {
    if (forceFlipped !== undefined) setFlipped(forceFlipped)
  }, [forceFlipped])
  const edStyle = EDITION_STYLES[card.edition] || EDITION_STYLES.base
  const d = SIZES[size]
  const posLabel = POSITION_LABELS[card.position] || '??'
  const effectDisplayName = card.displayName || card.effectConfig?.displayName || ''
  const effectTagline = card.tagline || card.effectConfig?.tagline || ''
  const effectTooltip = card.tooltip || card.effectConfig?.tooltip || ''
  const effectDetail = card.detail || card.effectConfig?.detail || ''
  const category = card.category || card.effectConfig?.category || ''
  const categoryColor = CATEGORY_COLORS[category] || '#94a3b8'
  const outputType = card.outputType || card.effectConfig?.outputType || ''
  const outputTypeColor = TYPE_COLORS[outputType] || categoryColor
  const behaviorKey = getBehaviorTag(card)
  const behaviorTag = behaviorKey ? BEHAVIOR_TAGS[behaviorKey] : null

  const stars = card.ratingStars || calcStars(card.playerRating)
  const tierColor = getTierColor(card.playerRating)

  // Vaulted cards drop their effect and become keepsake player cards: no effect
  // text, no behavior tags, no upgrade-tier chrome — just the player + stats.
  const isVaulted = !!card.vaulted

  // Upgrade tier: hexagon badge shown for tier 2+ (un-upgraded base cards stay
  // clean), full gold ring added at the max tier (IV) to flag a fully-upgraded card.
  const cardTier = card.tier || 1
  const showTierBadge = cardTier >= 2 && !isVaulted
  const isMaxTier = cardTier >= 4
  const tb = TIER_BADGE_DIMS[size]
  // Gold ring (box-shadow, sits just outside the edition border) for max tier.
  const tier4Ring = (isMaxTier && !isVaulted)
    ? '0 0 0 2px #fbbf24, 0 0 16px rgba(251,191,36,0.55), '
    : ''

  const edition = card.edition
  const glowConfig = GLOW_CONFIGS[edition]
  const hasGlow = !!glowConfig

  // Depth: a top light-sheen over the edition gradient + inset highlight/vignette
  // so the card reads as a physical print rather than a flat panel.
  const depthInset = 'inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -34px 54px -22px rgba(0,0,0,0.55), '

  const containerStyle: React.CSSProperties = {
    width: d.width,
    height: d.height,
    borderRadius: '12px',
    border: `2px solid ${selected ? '#3b82f6' : edStyle.borderColor}`,
    background: `radial-gradient(120% 70% at 50% -10%, rgba(255,255,255,0.10), transparent 60%), ${edStyle.bgGradient}`,
    fontFamily: 'pressStart',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.15s, box-shadow 0.25s',
    transform: !noHoverLift && hovered ? 'translateY(-4px)' : 'none',
    boxShadow: depthInset + tier4Ring + (selected
      ? '0 0 0 2px #3b82f6, 0 4px 20px rgba(59,130,246,0.3)'
      : hasGlow && hovered
        ? `0 0 12px ${glowConfig.color}, 0 0 28px ${glowConfig.softColor}, 0 4px 20px ${glowConfig.color}`
        : hasGlow
          ? `0 0 6px ${glowConfig.softColor}, 0 2px 8px rgba(0,0,0,0.3)`
          : edStyle.glowColor && hovered
            ? `0 4px 20px ${edStyle.glowColor}`
            : '0 2px 8px rgba(0,0,0,0.3)'),
    opacity: (card.isActive || card.vaulted) ? 1 : 0.7,
    flexShrink: 0,
  }

  // When an onClick prop is provided (e.g. pack-selection flow), reserve
  // the rightmost 25% of the card as a flip-only zone so the user can still
  // inspect the back without losing access to whatever the parent wired up.
  // No onClick prop ⇒ legacy behavior: click anywhere flips.
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) {
      setFlipped(f => !f)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    if (relX >= 0.75) {
      setFlipped(f => !f)
    } else {
      onClick()
    }
  }

  return (
    <div
      style={containerStyle}
      onClick={handleCardClick}
      onMouseEnter={() => { setHovered(true); onHoverChange?.(true) }}
      onMouseLeave={() => { setHovered(false); onHoverChange?.(false) }}
    >
      {/* Flip-zone affordance — only when an external onClick is wired up.
          Subtle vertical strip on the right edge with a flip glyph so users
          discover the zone without ugly visual noise. */}
      {onClick && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: '25%',
          pointerEvents: 'none',
          zIndex: 4,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          padding: '6px',
          opacity: hovered ? 0.8 : 0.4,
          transition: 'opacity 0.15s',
        }}>
          <div style={{
            fontSize: '11px',
            color: '#94a3b8',
            background: 'rgba(15,23,42,0.7)',
            border: '1px solid rgba(148,163,184,0.3)',
            borderRadius: '4px',
            padding: '2px 5px',
            lineHeight: 1,
          }}>
            ↻
          </div>
        </div>
      )}

      {/* Edition FX overlays */}
      {edition === 'holographic' && <ShimmerOverlay edition={edition} />}
      {edition === 'prismatic' && <><HoloBackgroundOverlay /><HoloEdgeShimmer /></>}
      {edition === 'diamond' && <><DiamondEdgeShimmer /><SparkleOverlay /></>}

      {/* Upgrade-tier hexagon badge (tier 2+), pinned under the header divider.
          Brighter + glowing at max tier, which also gets a full gold ring
          (see tier4Ring on the container). */}
      {showTierBadge && (
        <div style={{
          position: 'absolute', top: tb.top, left: tb.left, zIndex: 5,
          width: tb.w, height: tb.h,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: tb.font, fontWeight: 800, fontFamily: 'pressStart',
          color: '#1a1206', letterSpacing: '0.5px',
          clipPath: HEX_CLIP, WebkitClipPath: HEX_CLIP,
          background: isMaxTier
            ? 'linear-gradient(135deg, #fde68a 0%, #f59e0b 60%, #d97706 100%)'
            : 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
          filter: isMaxTier
            ? 'drop-shadow(0 0 4px rgba(251,191,36,0.85))'
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
          pointerEvents: 'none',
        }}>
          {TIER_ROMAN[cardTier] || cardTier}
        </div>
      )}

      {/* Header: edition + season + rookie */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${d.pad - 2}px ${d.pad}px`,
        borderBottom: `1px solid ${edStyle.borderColor}40`,
        position: 'relative', zIndex: 3,
      }}>
        <EditionBadge
          label={edStyle.label}
          rarity={edStyle.rarity}
          color={edStyle.labelColor}
          fontSize={d.font - 2}
        />
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {parseClassifications(card.classification, card.isRookie).map(key => {
            const cfg = CLASSIFICATION_CONFIG[key]
            if (!cfg) return null
            return (
              <ClassificationBadge
                key={key}
                abbr={cfg.abbr}
                color={cfg.color}
                bgColor={cfg.bgColor}
                borderColor={cfg.borderColor}
                tooltip={cfg.tooltip}
                fontSize={d.font - 3}
                swapState={key === 'all_pro' ? apSwapState : undefined}
              />
            )
          })}
          <span style={{
            fontSize: d.font - 3, fontWeight: 700, color: '#cbd5e1',
            backgroundColor: 'rgba(148,163,184,0.18)',
            border: '1px solid rgba(148,163,184,0.35)',
            borderRadius: '3px', padding: '1px 4px', lineHeight: 1.2,
          }}>S{card.seasonCreated}</span>
        </div>
      </div>

      {/* ── Card front ── */}
      {!flipped && (
        <>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: `${d.pad}px`,
            textAlign: 'center',
            gap: '4px',
            position: 'relative', zIndex: 3,
            minHeight: 0, overflow: 'hidden',
          }}>
            {/* Team avatar — center medallion (replaces player initials) */}
            <div style={{
              width: d.avatar, height: d.avatar,
              flexShrink: 0,
              borderRadius: '50%',
              boxShadow: glowColor
                ? `0 0 8px ${hexToRgba(glowColor, 0.6)}, 0 0 18px ${hexToRgba(glowColor, 0.3)}`
                : 'none',
              animation: glowColor && !staticGlow ? 'matchGlowPulse 2.5s ease-in-out infinite' : 'none',
              ['--glow-color' as any]: glowColor ? hexToRgba(glowColor, 0.6) : undefined,
              ['--glow-color-soft' as any]: glowColor ? hexToRgba(glowColor, 0.3) : undefined,
              ['--glow-color-bright' as any]: glowColor ? hexToRgba(glowColor, 0.9) : undefined,
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {card.teamId ? (
                <img
                  src={`/avatars/${card.teamId}.png`}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '90%', height: '90%', objectFit: 'contain' }}
                />
              ) : null}
            </div>

            {/* Position badge */}
            <span style={{
              fontSize: d.font - 1, fontWeight: '800', color: '#94a3b8',
              backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px',
              borderRadius: '4px',
            }}>
              {posLabel}
            </span>

            {/* Stars — filled (tier color) over a faint 5-track so quality reads at a glance */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '2px', justifyContent: 'center' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} style={{
                  fontSize: d.starSize,
                  color: i < stars ? tierColor : '#1e3a52',
                }}>
                  ★
                </span>
              ))}
            </div>

          </div>

          {/* Nameplate band — the player's name as a bold, edition-tinted banner */}
          <div style={{
            padding: `${d.pad - 3}px ${d.pad}px`,
            background: `linear-gradient(90deg, ${edStyle.borderColor}30, rgba(5,8,14,0.5))`,
            borderTop: `1px solid ${edStyle.borderColor}55`,
            textAlign: 'center', position: 'relative', zIndex: 3, flexShrink: 0,
          }}>
            <div style={{
              fontSize: card.playerName.length > 18 ? d.nameFont - 4
                : card.playerName.length > 14 ? d.nameFont - 2
                : d.nameFont,
              fontWeight: '800', color: '#fff',
              lineHeight: 1.05, maxWidth: '100%', wordBreak: 'break-word',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}>
              {card.playerName}
            </div>
          </div>

          {/* Effect footer — hidden on vaulted (effect gone) and on the sub-base
              "standard" (no-effect) print, which just fields the player for their FP. */}
          {!isVaulted && edition !== 'standard' && (
          <div style={{
            padding: `${d.pad - 2}px ${d.pad + 18}px`,
            textAlign: 'center',
            position: 'relative', zIndex: 3,
            flexShrink: 0,
          }}>
            {effectDisplayName && (
              <div style={{ marginBottom: '2px' }}>
                <EffectNameBadge
                  name={effectDisplayName}
                  tooltip={behaviorTag ? `${effectTooltip}\n\n${behaviorTag.tooltip}` : effectTooltip}
                  color={outputTypeColor}
                  fontSize={d.font - 1}
                />
              </div>
            )}
            {effectTagline && (
              <div style={{
                fontSize: d.font - 3, color: edStyle.labelColor,
                lineHeight: 1.3,
              }}>
                {colorizeEffectText(effectTagline, edStyle.labelColor)}
              </div>
            )}
            {/* tierNote intentionally not shown on the front (badge covers tier);
                it appears on the back/detail only. */}
          </div>
          )}

          {/* Sell value / expired / equipped badges */}
          {(showSellValue || (!card.isActive && !card.vaulted) || card.isEquipped) && (
            <div style={{
              position: 'absolute', bottom: d.pad - 2, right: d.pad,
              display: 'flex', gap: '4px', alignItems: 'center',
            }}>
              {card.isEquipped && (
                <span style={{
                  fontSize: d.font - 4, color: '#60a5fa',
                  backgroundColor: 'rgba(96,165,250,0.15)', padding: '1px 4px',
                  borderRadius: '3px', border: '1px solid rgba(96,165,250,0.3)',
                }}>
                  Equipped
                </span>
              )}
              {!card.isActive && !card.vaulted && (
                <span style={{
                  fontSize: d.font - 4, color: '#ef4444',
                  backgroundColor: 'rgba(239,68,68,0.15)', padding: '1px 4px',
                  borderRadius: '3px', border: '1px solid rgba(239,68,68,0.3)',
                }}>
                  Expired
                </span>
              )}
              {showSellValue && !card.isEquipped && !card.vaulted && (
                <span style={{ fontSize: d.font - 3, color: '#eab308', fontWeight: '600' }}>
                  {card.sellValue}
                </span>
              )}
            </div>
          )}

          {/* Select overlay for collection selling — visible on hover or when selected */}
          {onSelect && !card.isEquipped && !card.vaulted && (showActions || selected) && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect() }}
              style={{
                position: 'absolute',
                top: d.pad - 2,
                right: d.pad - 2,
                zIndex: 4,
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                border: `2px solid ${selected ? '#3b82f6' : '#475569'}`,
                backgroundColor: selected ? '#3b82f6' : 'rgba(15,23,42,0.7)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.15s',
              }}
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          )}

          {/* Level-Up affordance (collection) — gold pill, bottom-left on hover */}
          {onLevelUp && !card.vaulted && showActions && (
            <button
              onClick={(e) => { e.stopPropagation(); onLevelUp() }}
              aria-label="Level Up"
              style={{
                position: 'absolute',
                bottom: d.pad - 2,
                left: d.pad - 2,
                zIndex: 4,
                display: 'flex', alignItems: 'center', gap: '3px',
                padding: '3px 7px',
                borderRadius: '5px',
                border: '1px solid rgba(251,191,36,0.6)',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.9), rgba(217,119,6,0.9))',
                color: '#1a1206',
                fontSize: d.font - 3, fontWeight: 800,
                fontFamily: 'pressStart', cursor: 'pointer',
                boxShadow: '0 0 8px rgba(251,191,36,0.4)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M6 2L3 5M6 2l3 3" stroke="#1a1206" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Level Up
            </button>
          )}

          {/* Trash affordance (vault) — red icon button, bottom-right on hover */}
          {onTrash && showActions && (
            <button
              onClick={(e) => { e.stopPropagation(); onTrash() }}
              aria-label="Remove from vault (permanent)"
              style={{
                position: 'absolute',
                bottom: d.pad - 2,
                right: d.pad - 2,
                zIndex: 4,
                width: '24px', height: '24px', borderRadius: '5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(239,68,68,0.55)',
                background: 'rgba(15,23,42,0.85)',
                color: '#ef4444', cursor: 'pointer',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </>
      )}

      {/* ── Card back: player stats (vaulted keepsake) ── */}
      {flipped && isVaulted && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: `${d.pad}px`, gap: '6px',
          overflowY: 'auto', position: 'relative', zIndex: 3,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: d.font, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>
              {card.playerName}
            </div>
            <div style={{ fontSize: d.font - 3, color: edStyle.labelColor, marginTop: '2px' }}>
              {posLabel}
              {card.playerStats?.teamName && (
                <>
                  {' · '}
                  <span style={{ color: card.playerStats.teamColor || edStyle.labelColor }}>
                    {card.playerStats.teamName}
                  </span>
                </>
              )}
            </div>
            {/* Player star rating */}
            <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '4px' }}>
              {Array.from({ length: stars }, (_, i) => (
                <span key={i} style={{ fontSize: d.starSize - 8, color: tierColor }}>★</span>
              ))}
            </div>
            <div style={{
              fontSize: d.font - 3, fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px',
            }}>
              Season {card.playerStats?.season ?? card.seasonCreated} Stats
            </div>
          </div>

          {card.playerStats ? (
            <>
              {/* Season fantasy points */}
              <div style={{
                textAlign: 'center',
                borderTop: `1px solid ${edStyle.borderColor}40`,
                borderBottom: `1px solid ${edStyle.borderColor}40`,
                padding: '6px 0', margin: '2px 0',
              }}>
                <div style={{ fontSize: d.font + 1, fontWeight: 700, color: TYPE_COLORS.fp }}>
                  {card.playerStats.fantasyPoints}
                </div>
                <div style={{ fontSize: d.font - 4, color: '#94a3b8' }}>Season Fantasy Points</div>
              </div>

              {/* Stat lines */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                {card.playerStats.lines.map((ln, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    fontSize: d.font - 1,
                  }}>
                    <span style={{ color: '#94a3b8' }}>{ln.label}</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{ln.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: d.font - 1, color: '#64748b', textAlign: 'center', lineHeight: 1.6,
            }}>
              No stats recorded for Season {card.seasonCreated}
            </div>
          )}
        </div>
      )}

      {/* ── Card back (effect details) ── */}
      {flipped && !isVaulted && (
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            padding: `${d.pad}px`,
            gap: '8px',
            overflowY: 'auto',
            position: 'relative', zIndex: 3,
          }}
        >
          {/* Header — effect name */}
          {effectDisplayName && (
            <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <EffectNameBadge
                name={effectDisplayName}
                tooltip={effectTooltip}
                color={outputTypeColor}
                fontSize={d.font - 1}
              />
              {behaviorTag && (
                <BehaviorTag
                  label={behaviorTag.label}
                  color={behaviorTag.color}
                  tooltip={behaviorTag.tooltip}
                  fontSize={d.font - 2}
                />
              )}
            </div>
          )}

          {/* Detail */}
          {effectDetail && (
            <div style={{
              fontSize: d.font - 1, color: '#cbd5e1',
              lineHeight: 1.6, textAlign: 'center',
            }}>
              {colorizeEffectText(effectDetail, '#cbd5e1')}
            </div>
          )}

          {/* Upgrade-tier line (own distinct line) */}
          {card.tierNote && (
            <div style={{
              fontSize: d.font - 1, fontWeight: 700, color: '#fbbf24',
              textAlign: 'center', lineHeight: 1.3,
            }}>
              {card.tierNote}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default TradingCard
