import React, { useState, useRef, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { createAvatar } from '@dicebear/core'
import { openPeeps } from '@dicebear/collection'

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
  base: {
    borderColor: '#475569',
    bgGradient: 'linear-gradient(135deg, #334155 0%, #283548 50%, #334155 100%)',
    labelColor: '#94a3b8',
    label: 'Base',
    rarity: 'Common',
  },
  holographic: {
    borderColor: '#a78bfa',
    bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 50%, #1e1b4b 100%)',
    labelColor: '#c4b5fd',
    label: 'Holographic',
    rarity: 'Uncommon',
    glowColor: 'rgba(167,139,250,0.15)',
  },
  prismatic: {
    borderColor: '#db2777',
    bgGradient: 'linear-gradient(135deg, #2e1065 0%, #701a3e 40%, #1e3a5f 70%, #064e3b 100%)',
    labelColor: '#f472b6',
    label: 'Prismatic',
    rarity: 'Rare',
    glowColor: 'rgba(219,39,119,0.3)',
  },
  diamond: {
    borderColor: '#67e8f9',
    bgGradient: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 35%, #1e3a5f 65%, #0e7490 100%)',
    labelColor: '#a5f3fc',
    label: 'Diamond',
    rarity: 'Ultra-Rare',
    glowColor: 'rgba(103,232,249,0.35)',
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
  rookie: {
    label: 'Rookie', abbr: 'R', color: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)',
    tooltip: 'Rookie — Sells for 2x Floobits',
  },
  mvp: {
    label: 'MVP', abbr: 'MVP', color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)',
    tooltip: 'MVP — +1 card equip slot',
  },
  champion: {
    label: 'Champion', abbr: 'CH', color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)',
    tooltip: 'Champion — +1 FLEX roster spot',
  },
  all_pro: {
    label: 'All-Pro', abbr: 'AP', color: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.3)',
    tooltip: 'All-Pro — +1 roster swap on equip',
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
  const pattern = /([+-]?\d+\.?\d*x?\s*)?(\+?FPx|FP\b|Floobits\b|F\b)/g
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    const kw = m[2]
    const color = (kw === 'FPx' || kw === '+FPx') ? TYPE_COLORS.mult
      : (kw === 'Floobits' || kw === 'F') ? TYPE_COLORS.floobits
      : TYPE_COLORS.fp
    parts.push(<span key={m.index} style={{ color }}>{m[0]}</span>)
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
  position: number
  edition: string
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
  acquiredAt: string | null
  acquiredVia: string
}

interface TradingCardProps {
  card: CardData
  size?: 'xs' | 'sm' | 'md' | 'lg'
  selected?: boolean
  onSelect?: () => void
  onClick?: () => void
  showSellValue?: boolean
  glowColor?: string  // persistent outline/glow (e.g. team color for roster match)
  staticGlow?: boolean  // if true, glow without pulse animation (for deck cards)
  noHoverLift?: boolean  // disable translateY on hover (parent handles it)
  onHoverChange?: (hovered: boolean) => void
}

const SIZES = {
  xs: { width: 105, height: 178, font: 9, nameFont: 11, avatar: 50, pad: 6, starSize: 16 },
  sm: { width: 160, height: 270, font: 12, nameFont: 14, avatar: 76, pad: 8, starSize: 22 },
  md: { width: 200, height: 340, font: 14, nameFont: 17, avatar: 100, pad: 12, starSize: 28 },
  lg: { width: 260, height: 430, font: 16, nameFont: 20, avatar: 128, pad: 16, starSize: 34 },
}

const getTierColor = (rating: number): string => {
  if (rating >= 95) return '#f59e0b' // 5★ gold
  if (rating >= 85) return '#22c55e' // 4★ green
  if (rating >= 75) return '#3b82f6' // 3★ blue
  if (rating >= 65) return '#94a3b8' // 2★ gray
  return '#ef4444'                   // 1★ red
}

const ClassificationBadge: React.FC<{
  abbr: string
  color: string
  bgColor: string
  borderColor: string
  tooltip: string
  fontSize: number
}> = ({ abbr, color, bgColor, borderColor, tooltip, fontSize }) => {
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
          backgroundColor: bgColor, padding: '1px 5px',
          borderRadius: '3px', border: `1px solid ${borderColor}`,
          cursor: 'default',
        }}
      >
        {abbr}
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
          {tooltip}
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

function getBehaviorTag(card: CardData): keyof typeof BEHAVIOR_TAGS | null {
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
  card, size = 'md', selected = false, onSelect, onClick, showSellValue = false, glowColor, staticGlow, noHoverLift, onHoverChange,
}) => {
  const [hovered, setHovered] = useState(false)
  const [flipped, setFlipped] = useState(false)
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

  const stars = Math.min(5, Math.max(1, Math.round((card.playerRating - 50) / 10)))
  const tierColor = getTierColor(card.playerRating)

  const playerAvatarUri = useMemo(() => {
    return createAvatar(openPeeps, {
      seed: card.playerName,
      size: d.avatar,
      backgroundColor: [(card.teamColor || tierColor).replace('#', '')],
      backgroundType: ['solid'],
      maskProbability: 0,
      facialHairProbability: 40,
      accessoriesProbability: 40,
      accessories: ['glasses', 'glasses2', 'glasses3', 'glasses4', 'glasses5', 'sunglasses', 'sunglasses2'],
      headContrastColor: ['2c1b18', '4a312c', 'a55728', 'b58143', 'c93305', 'd6b370', 'cb8442', 'deb777', 'e8e1e1', '8d4a43'],
    }).toDataUri()
  }, [card.playerName, d.avatar, card.teamColor, tierColor])

  const edition = card.edition
  const glowConfig = GLOW_CONFIGS[edition]
  const hasGlow = !!glowConfig

  const containerStyle: React.CSSProperties = {
    width: d.width,
    height: d.height,
    borderRadius: '12px',
    border: `2px solid ${selected ? '#3b82f6' : edStyle.borderColor}`,
    background: edStyle.bgGradient,
    fontFamily: 'pressStart',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.15s, box-shadow 0.25s',
    transform: !noHoverLift && hovered ? 'translateY(-4px)' : 'none',
    boxShadow: selected
      ? '0 0 0 2px #3b82f6, 0 4px 20px rgba(59,130,246,0.3)'
      : hasGlow && hovered
        ? `0 0 12px ${glowConfig.color}, 0 0 28px ${glowConfig.softColor}, 0 4px 20px ${glowConfig.color}`
        : hasGlow
          ? `0 0 6px ${glowConfig.softColor}, 0 2px 8px rgba(0,0,0,0.3)`
          : edStyle.glowColor && hovered
            ? `0 4px 20px ${edStyle.glowColor}`
            : '0 2px 8px rgba(0,0,0,0.3)',
    opacity: card.isActive ? 1 : 0.7,
    flexShrink: 0,
  }

  return (
    <div
      style={containerStyle}
      onClick={() => { if (onClick) { onClick(); return; } setFlipped(f => !f); }}
      onMouseEnter={() => { setHovered(true); onHoverChange?.(true) }}
      onMouseLeave={() => { setHovered(false); onHoverChange?.(false) }}
    >
      {/* Edition FX overlays */}
      {edition === 'holographic' && <ShimmerOverlay edition={edition} />}
      {edition === 'prismatic' && <><HoloBackgroundOverlay /><HoloEdgeShimmer /></>}
      {edition === 'diamond' && <><DiamondEdgeShimmer /><SparkleOverlay /></>}

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
              />
            )
          })}
          <span style={{ fontSize: d.font - 3, color: '#64748b' }}>S{card.seasonCreated}</span>
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
            {/* Player avatar */}
            <div style={{
              width: d.avatar, height: d.avatar,
              flexShrink: 0,
              borderRadius: '50%',
              border: glowColor
                ? `2.5px solid ${hexToRgba(glowColor, 0.85)}`
                : `2px solid ${edStyle.borderColor}80`,
              boxShadow: glowColor
                ? `0 0 8px ${hexToRgba(glowColor, 0.6)}, 0 0 18px ${hexToRgba(glowColor, 0.3)}`
                : 'none',
              animation: glowColor && !staticGlow ? 'matchGlowPulse 2.5s ease-in-out infinite' : 'none',
              ['--glow-color' as any]: glowColor ? hexToRgba(glowColor, 0.6) : undefined,
              ['--glow-color-soft' as any]: glowColor ? hexToRgba(glowColor, 0.3) : undefined,
              ['--glow-color-bright' as any]: glowColor ? hexToRgba(glowColor, 0.9) : undefined,
              marginBottom: '2px',
              background: 'transparent',
              overflow: 'hidden',
            }}>
              <img
                src={playerAvatarUri}
                alt={card.playerName}
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* Position badge */}
            <span style={{
              fontSize: d.font - 1, fontWeight: '800', color: '#94a3b8',
              backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px',
              borderRadius: '4px',
            }}>
              {posLabel}
            </span>

            {/* Stars (colored by tier) */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '2px', justifyContent: 'center' }}>
              {Array.from({ length: stars }, (_, i) => (
                <span key={i} style={{
                  fontSize: d.starSize,
                  color: tierColor,
                }}>
                  ★
                </span>
              ))}
            </div>

            {/* Player name — shrink font for long names to avoid clipping */}
            <div style={{
              fontSize: card.playerName.length > 18 ? d.nameFont - 4
                : card.playerName.length > 14 ? d.nameFont - 2
                : d.nameFont,
              fontWeight: '700', color: '#e2e8f0',
              lineHeight: 1.3, maxWidth: '100%',
              wordBreak: 'break-word',
            }}>
              {card.playerName}
            </div>
          </div>

          {/* Effect footer */}
          <div style={{
            padding: `${d.pad - 2}px ${d.pad + 18}px`,
            borderTop: `1px solid ${edStyle.borderColor}40`,
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
          </div>

          {/* Small team avatar accent */}
          {card.teamId && (
            <img
              src={`${API_BASE}/teams/${card.teamId}/avatar?size=20&v=2`}
              alt=""
              style={{
                position: 'absolute',
                bottom: d.pad,
                left: d.pad,
                width: 18,
                height: 18,
                opacity: 1,
              }}
            />
          )}

          {/* Sell value / expired / equipped badges */}
          {(showSellValue || !card.isActive || card.isEquipped) && (
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
              {!card.isActive && (
                <span style={{
                  fontSize: d.font - 4, color: '#ef4444',
                  backgroundColor: 'rgba(239,68,68,0.15)', padding: '1px 4px',
                  borderRadius: '3px', border: '1px solid rgba(239,68,68,0.3)',
                }}>
                  Expired
                </span>
              )}
              {showSellValue && !card.isEquipped && (
                <span style={{ fontSize: d.font - 3, color: '#eab308', fontWeight: '600' }}>
                  {card.sellValue}
                </span>
              )}
            </div>
          )}

          {/* Select overlay for collection selling — visible on hover or when selected */}
          {onSelect && !card.isEquipped && (hovered || selected) && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect() }}
              style={{
                position: 'absolute',
                top: d.pad - 2,
                right: d.pad - 2,
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
        </>
      )}

      {/* ── Card back (details) ── */}
      {flipped && (
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

          {/* Roster match section */}
          <div style={{
            fontSize: d.font - 2, color: '#cbd5e1',
            lineHeight: 1.8, textAlign: 'center',
            borderTop: `1px solid ${edStyle.borderColor}40`,
            paddingTop: '6px',
          }}>
            <div style={{ color: '#e2e8f0', fontWeight: '700', marginBottom: '6px' }}>
              Roster Match
            </div>
            <div>
              If {card.playerName} is on your fantasy roster:
            </div>
            <div style={{ color: edStyle.labelColor }}>
              - Effect boosted to <span style={{ color: '#60a5fa' }}>1.5x</span>
            </div>
            {card.effectConfig?.conditional && (
              <div style={{ color: edStyle.labelColor }}>
                - <span style={{ color: TYPE_COLORS.fp }}>+{card.effectConfig.conditional.bonus} FP</span> for {card.effectConfig.conditional.label}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default TradingCard
