import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'

interface LoginModalProps {
  visible: boolean
  onClose: () => void
}

type Tab = 'signin' | 'register'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#64748b',
  marginBottom: '5px',
  fontWeight: '600',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

export const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose }) => {
  const { login, register } = useAuth()
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  // Focus email field when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => emailRef.current?.focus(), 50)
      setError('')
    }
  }, [visible])

  // Reset form when tab changes
  useEffect(() => { setError('') }, [tab])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  const handleSubmit = async () => {
    if (submitting) return
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }
    setSubmitting(true)
    try {
      if (tab === 'signin') {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password, username.trim() || undefined)
      }
      // Success — parent closes modal via user state change
      onClose()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  if (!visible) return null

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '360px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          fontFamily: 'pressStart',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>Floosball</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px' }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #334155', margin: '16px 0 0' }}>
          {(['signin', 'register'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', fontSize: '12px', fontWeight: '600',
                color: tab === t ? '#e2e8f0' : '#64748b',
                backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ padding: '20px' }} onKeyDown={handleKeyDown}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Email</label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: tab === 'register' ? '14px' : '0' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {tab === 'register' && (
            <div>
              <label style={labelStyle}>Username <span style={{ color: '#475569', fontWeight: '400' }}>(optional)</span></label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. floosmaster"
                style={inputStyle}
                autoComplete="username"
              />
            </div>
          )}

          {error && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#ef4444', padding: '8px 10px', backgroundColor: '#7f1d1d22', borderRadius: '5px', border: '1px solid #7f1d1d44' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%', marginTop: '18px',
              padding: '11px 0', fontSize: '13px', fontWeight: '700',
              color: '#fff', backgroundColor: submitting ? '#1d4ed8' : '#3b82f6',
              border: 'none', borderRadius: '6px', cursor: submitting ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'background-color 0.15s',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
