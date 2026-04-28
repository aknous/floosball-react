import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useFloosball } from '@/contexts/FloosballContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAppSettings } from '@/hooks/useAppSettings'

const STORAGE_KEY = 'lastSeenSurveySeason'
const MID_SEASON_WEEK = 15

const SurveyModal: React.FC = () => {
  const { seasonState } = useFloosball()
  const isMobile = useIsMobile()
  const { survey_url } = useAppSettings()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const sn = seasonState.seasonNumber
    const week = seasonState.currentWeek
    if (!sn || sn <= 0 || !week || week < MID_SEASON_WEEK) return
    const lastSeen = localStorage.getItem(STORAGE_KEY)
    if (lastSeen !== String(sn)) {
      setVisible(true)
    }
  }, [seasonState.seasonNumber, seasonState.currentWeek])

  useEffect(() => {
    if (!visible) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [visible])

  const handleDismiss = useCallback(() => {
    const sn = seasonState.seasonNumber
    if (sn && sn > 0) {
      localStorage.setItem(STORAGE_KEY, String(sn))
    }
    setVisible(false)
  }, [seasonState.seasonNumber])

  const handleTakeSurvey = () => {
    window.open(survey_url, '_blank')
    handleDismiss()
  }

  if (!visible) return null

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        backgroundColor: 'rgba(0,0,0,0.8)',
        fontFamily: 'pressStart, monospace',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '480px',
          backgroundColor: '#1e293b',
          border: isMobile ? 'none' : '1px solid #334155',
          borderRadius: isMobile ? '14px 14px 0 0' : '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column' as const,
        }}
      >
        {/* Header */}
        <div style={{ padding: '28px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>
              Another Survey
            </h2>
            <button
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              x
            </button>
          </div>
          <div style={{
            width: '100%',
            height: '1px',
            backgroundColor: '#334155',
            marginTop: '18px',
          }} />
        </div>

        {/* Content */}
        <div style={{ padding: '22px 28px 28px' }}>
          <p style={{
            color: '#cbd5e1',
            fontSize: '13px',
            lineHeight: '1.7',
            margin: '0 0 16px',
          }}>
            We want to know what you think. Does this suck? Does it rule? Are you in love? What would you change? Please take a quick survey to help us make Floosball even better!
          </p>
          <p style={{
            color: '#94a3b8',
            fontSize: '12px',
            lineHeight: '1.6',
            margin: '0 0 24px',
          }}>
            This is a new survey! If you filled out last week's, please take this one too. Your answers help shape what comes next. Thanks to all who participated last week! Your responses helped dictate some of the changes that were implemented in the latest update.
          </p>

          <button
            onClick={handleTakeSurvey}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background-color 0.15s',
              marginBottom: '10px',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            Take the Survey
          </button>
          <button
            onClick={handleDismiss}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#cbd5e1')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default SurveyModal
