import React, { useState, useRef, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { createAvatar } from '@dicebear/core'
import { micah } from '@dicebear/collection'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Inject match glow pulse animation once
if (typeof document !== 'undefined' && !document.getElementById('match-glow-keyframes')) {
  const style = document.createElement('style')
  style.id = 'match-glow-keyframes'
  style.textContent = `
    @keyframes matchGlowPulse {
      0%, 100% { box-shadow: 0 0 8px var(--glow-color), 0 0 18px var(--glow-color-soft); }
      50% { box-shadow: 0 0 14px var(--glow-color-bright), 0 0 28px var(--glow-color); }
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
  chrome: {
    borderColor: '#a1a1aa',
    bgGradient: 'linear-gradient(135deg, #27272a 0%, #3f3f46 50%, #27272a 100%)',
    labelColor: '#d4d4d8',
    label: 'Chrome',
    rarity: 'Uncommon',
    glowColor: 'rgba(161,161,170,0.25)',
  },
  holographic: {
    borderColor: '#a78bfa',
    bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e3a5f 70%, #1e1b4b 100%)',
    labelColor: '#c4b5fd',
    label: 'Holographic',
    rarity: 'Uncommon',
    glowColor: 'rgba(167,139,250,0.3)',
  },
  gold: {
    borderColor: '#eab308',
    bgGradient: 'linear-gradient(135deg, #422006 0%, #713f12 50%, #422006 100%)',
    labelColor: '#fbbf24',
    label: 'Gold',
    rarity: 'Rare',
    glowColor: 'rgba(234,179,8,0.25)',
  },
  prismatic: {
    borderColor: '#f472b6',
    bgGradient: 'linear-gradient(135deg, #4c1d95 0%, #831843 40%, #1e3a5f 70%, #065f46 100%)',
    labelColor: '#f9a8d4',
    label: 'Prismatic',
    rarity: 'Rare',
    glowColor: 'rgba(244,114,182,0.3)',
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
    tooltip: 'Conditional — Triggers when a game condition is met. Boosted by Longshot modifier.',
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

// Edition secondary bonuses — mirrors backend EDITION_SECONDARY in cardEffects.py
const EDITION_SECONDARY: Record<string, { flatFP: number; floobits: number; mult: number } | null> = {
  base: null,
  chrome: { flatFP: 3, floobits: 0, mult: 0 },
  holographic: { flatFP: 0, floobits: 0, mult: 1.2 },
  gold: { flatFP: 0, floobits: 5, mult: 0 },
  prismatic: { flatFP: 0, floobits: 0, mult: 1.3 },
  diamond: null, // Diamond secondary is randomized at equip — read from effectConfig
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

function getSecondaryBonusLines(edition: string, effectConfig?: any): string[] {
  let secondary = EDITION_SECONDARY[edition]
  if (edition === 'diamond' && effectConfig?.secondary) {
    secondary = effectConfig.secondary
  }
  if (!secondary) return []

  const lines: string[] = []
  if (secondary.flatFP > 0) lines.push(`+${secondary.flatFP} FP`)
  if (secondary.mult > 1) lines.push(`${secondary.mult.toFixed(1)}x FPx`)
  if (secondary.floobits > 0) lines.push(`+${secondary.floobits} Floobits`)
  return lines
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
  size?: 'sm' | 'md' | 'lg'
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
  const secondaryLines = getSecondaryBonusLines(card.edition, card.effectConfig)
  const behaviorKey = getBehaviorTag(card)
  const behaviorTag = behaviorKey ? BEHAVIOR_TAGS[behaviorKey] : null

  const stars = Math.min(5, Math.max(1, Math.round((card.playerRating - 50) / 10)))
  const tierColor = getTierColor(card.playerRating)

  const playerAvatarUri = useMemo(() => {
    return createAvatar(micah, {
      seed: card.playerName,
      size: d.avatar,
      backgroundColor: [(card.teamColor || tierColor).replace('#', '')],
      backgroundType: ['solid'],
    }).toDataUri()
  }, [card.playerName, d.avatar, card.teamColor, tierColor])

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
    transition: 'transform 0.15s, box-shadow 0.15s',
    transform: !noHoverLift && hovered ? 'translateY(-4px)' : 'none',
    boxShadow: selected
      ? '0 0 0 2px #3b82f6, 0 4px 20px rgba(59,130,246,0.3)'
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
      {/* Header: edition + season + rookie */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${d.pad - 2}px ${d.pad}px`,
        borderBottom: `1px solid ${edStyle.borderColor}40`,
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
            minHeight: 0, overflow: 'hidden',
          }}>
            {/* Player avatar */}
            <div style={{
              width: d.avatar, height: d.avatar,
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

          {/* Secondary effect (Chrome+) */}
          {secondaryLines.length > 0 && (
            <div style={{
              fontSize: d.font - 2, color: edStyle.labelColor,
              textAlign: 'center',
              borderTop: `1px solid ${edStyle.borderColor}40`,
              paddingTop: '6px',
            }}>
              <div style={{ fontWeight: '700', marginBottom: '3px' }}>{edStyle.label} Bonus</div>
              {secondaryLines.map((line, i) => (
                <div key={i} style={{ color: edStyle.labelColor }}>{colorizeEffectText(line, edStyle.labelColor)}</div>
              ))}
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
              - Primary effect boosted to <span style={{ color: '#60a5fa' }}>1.5x</span>
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
