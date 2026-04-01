import React, { useEffect, useState, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import { TutorialStep } from './useTutorial'

interface TutorialOverlayProps {
  steps: TutorialStep[]
  currentStep: number
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  onHelp?: () => void
}

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

const PAD = 8

function getTargetRect(step: TutorialStep): TargetRect | null {
  const el = document.querySelector(`[data-tour="${step.target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
    bottom: r.bottom + PAD,
    right: r.right + PAD,
  }
}

function computePlacement(rect: TargetRect, preferred?: string): 'top' | 'bottom' | 'left' | 'right' {
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (preferred) {
    // Validate preferred placement has enough room
    if (preferred === 'bottom' && vh - rect.bottom > 180) return 'bottom'
    if (preferred === 'top' && rect.top > 180) return 'top'
    if (preferred === 'left' && rect.left > 340) return 'left'
    if (preferred === 'right' && vw - rect.right > 340) return 'right'
  }

  // Auto: prefer bottom, then top, then right, then left
  if (vh - rect.bottom > 180) return 'bottom'
  if (rect.top > 180) return 'top'
  if (vw - rect.right > 340) return 'right'
  if (rect.left > 340) return 'left'
  return 'bottom'
}

function getTooltipStyle(rect: TargetRect, placement: string): React.CSSProperties {
  const tooltipWidth = 320
  const arrowGap = 16

  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10005,
    width: tooltipWidth,
    maxWidth: 'calc(100vw - 32px)',
  }

  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  if (placement === 'bottom') {
    let left = centerX - tooltipWidth / 2
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
    return { ...base, top: rect.bottom + arrowGap, left }
  }
  if (placement === 'top') {
    let left = centerX - tooltipWidth / 2
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
    return { ...base, bottom: window.innerHeight - rect.top + arrowGap, left }
  }
  if (placement === 'right') {
    let top = centerY - 60
    top = Math.max(16, Math.min(top, window.innerHeight - 200))
    return { ...base, top, left: rect.right + arrowGap }
  }
  // left
  let top = centerY - 60
  top = Math.max(16, Math.min(top, window.innerHeight - 200))
  return { ...base, top, right: window.innerWidth - rect.left + arrowGap }
}

function getArrowStyle(rect: TargetRect, placement: string): React.CSSProperties {
  const size = 8
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
  }

  if (placement === 'bottom') {
    return {
      ...base,
      top: -size * 2,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderBottom: `${size * 2}px solid #1e293b`,
    }
  }
  if (placement === 'top') {
    return {
      ...base,
      bottom: -size * 2,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderTop: `${size * 2}px solid #1e293b`,
    }
  }
  if (placement === 'right') {
    return {
      ...base,
      left: -size * 2,
      top: 60,
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderRight: `${size * 2}px solid #1e293b`,
    }
  }
  // left
  return {
    ...base,
    right: -size * 2,
    top: 60,
    borderTop: `${size}px solid transparent`,
    borderBottom: `${size}px solid transparent`,
    borderLeft: `${size * 2}px solid #1e293b`,
  }
}

function buildClipPath(rect: TargetRect): string {
  const { top, left, width, height } = rect
  const r = 8 // border radius for cutout
  const b = left + width
  const btm = top + height

  // Full screen outer, inner cutout with rounded corners approximated by extra polygon points
  return `polygon(
    0 0, 100% 0, 100% 100%, 0 100%, 0 0,
    ${left + r}px ${top}px,
    ${left}px ${top + r}px,
    ${left}px ${btm - r}px,
    ${left + r}px ${btm}px,
    ${b - r}px ${btm}px,
    ${b}px ${btm - r}px,
    ${b}px ${top + r}px,
    ${b - r}px ${top}px,
    ${left + r}px ${top}px
  )`
}

export default function TutorialOverlay({ steps, currentStep, onNext, onBack, onSkip, onHelp }: TutorialOverlayProps) {
  const [rect, setRect] = useState<TargetRect | null>(null)
  const [visible, setVisible] = useState(false)
  const rafRef = useRef<number>(0)

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  // Check if there's a visible next step
  const hasVisibleNext = (() => {
    for (let i = currentStep + 1; i < steps.length; i++) {
      if (document.querySelector(`[data-tour="${steps[i].target}"]`)) return true
    }
    return false
  })()
  const actuallyLast = !hasVisibleNext

  const updatePosition = useCallback(() => {
    if (!step) return
    const newRect = getTargetRect(step)
    setRect(newRect)
  }, [step])

  // Fire onEnter/onLeave callbacks on step change
  const prevStepRef = useRef<TutorialStep | null>(null)
  useEffect(() => {
    if (prevStepRef.current && prevStepRef.current !== step) {
      prevStepRef.current.onLeave?.()
    }
    step?.onEnter?.()
    prevStepRef.current = step
    return () => {
      // On unmount (tour ends), fire onLeave for the last active step
      if (step) step.onLeave?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Scroll into view + position on step change
  useEffect(() => {
    if (!step) return
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Give layout time to settle (e.g. expanding a collapsed section)
      const timer = setTimeout(() => {
        updatePosition()
        setVisible(true)
      }, 450)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [step, updatePosition])

  // Resize/scroll listener
  useEffect(() => {
    const handleUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updatePosition)
    }
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)
    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [updatePosition])

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onSkip(); return }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { actuallyLast ? (onHelp || onSkip)() : onNext(); return }
      if (e.key === 'ArrowLeft' && !isFirst) { onBack(); return }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onNext, onBack, onSkip, isFirst, actuallyLast])

  if (!step || !rect || !visible) return null

  const placement = computePlacement(rect, step.placement)
  const tooltipStyle = getTooltipStyle(rect, placement)
  const arrowStyle = getArrowStyle(rect, placement)
  const clipPath = buildClipPath(rect)

  // Count visible steps for progress display
  const visibleSteps = steps.filter(s => document.querySelector(`[data-tour="${s.target}"]`))
  const visibleIndex = visibleSteps.findIndex(s => s.target === step.target)
  const totalVisible = visibleSteps.length

  return ReactDOM.createPortal(
    <>
      {/* Backdrop with cutout */}
      <div
        onClick={onSkip}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10004,
          backgroundColor: 'rgba(0,0,0,0.75)',
          clipPath,
          transition: 'clip-path 0.3s ease',
        }}
      />

      {/* Highlight border around target */}
      <div style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: '8px',
        border: '2px solid rgba(59,130,246,0.5)',
        boxShadow: '0 0 20px rgba(59,130,246,0.15)',
        pointerEvents: 'none',
        zIndex: 10004,
        transition: 'all 0.3s ease',
      }} />

      {/* Tooltip */}
      <div style={{
        ...tooltipStyle,
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '16px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        transition: 'all 0.3s ease',
      }}>
        {/* Arrow */}
        <div style={arrowStyle} />

        {/* Progress bar */}
        <div style={{
          display: 'flex', gap: '3px', marginBottom: '14px',
        }}>
          {visibleSteps.map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: '3px',
              borderRadius: '2px',
              backgroundColor: i <= visibleIndex ? '#3b82f6' : '#334155',
              transition: 'background-color 0.3s',
            }} />
          ))}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: 'pressStart',
          fontSize: '14px',
          fontWeight: '700',
          color: '#e2e8f0',
          marginBottom: '10px',
          lineHeight: '1.5',
        }}>
          {step.title}
        </div>

        {/* Body */}
        <div style={{
          fontFamily: 'pressStart',
          fontSize: '13px',
          color: '#cbd5e1',
          lineHeight: '1.9',
          marginBottom: '16px',
        }}>
          {step.content}
        </div>

        {/* Footer: step count + nav */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: 'pressStart',
            fontSize: '10px',
            color: '#64748b',
          }}>
            {visibleIndex + 1} / {totalVisible}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Skip */}
            <button
              onClick={onSkip}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '4px 8px',
                fontFamily: 'pressStart',
              }}
            >
              Skip
            </button>

            {/* Help — skip straight to the full help guide */}
            {onHelp && (
              <button
                onClick={onHelp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontFamily: 'pressStart',
                }}
              >
                Help
              </button>
            )}

            {/* Back */}
            {!isFirst && (
              <button
                onClick={onBack}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  fontSize: '11px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontFamily: 'pressStart',
                }}
              >
                Back
              </button>
            )}

            {/* Next / Finish */}
            <button
              onClick={actuallyLast ? (onHelp || onSkip) : onNext}
              style={{
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '11px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontFamily: 'pressStart',
                fontWeight: '700',
              }}
            >
              {actuallyLast ? 'Help Guide' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
