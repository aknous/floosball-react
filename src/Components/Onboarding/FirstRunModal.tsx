import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { BG, BORDER, TEXT, ACCENT, FONT, font } from '@/Components/Shell/tokens'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * First run: pick a name, then optionally pick a club.
 *
 * ⚠️ This REPLACES a multi-step tour that also explained the game (owner: the tour
 * went, this stayed). Two things belong here and nothing else does — a name, because
 * every leaderboard row and feed post carries it, and the offer of a club, because
 * the front page's own panel is otherwise the only route to one.
 *
 * ⚠️ The name step is NOT a blocker. Provisioning generates a username, so a reader
 * who closes this is named already rather than nameless — which is what the old flow
 * risked and why it had to force the step. Closing is a choice to keep the generated
 * name, not a way to end up without one.
 *
 * Shown once, off `hasCompletedOnboarding` — a real column, not localStorage, so it
 * follows the account rather than the browser.
 */

const NAME_MIN = 3
const NAME_MAX = 20
const NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/

/** Mirrors api/auth.validateUsername so a bad name fails as you type. The server
 *  re-checks everything and its message wins if the two ever disagree. */
const localNameError = (name: string): string | null => {
  const n = name.trim()
  if (!n) return null
  if (n.length < NAME_MIN) return `At least ${NAME_MIN} characters`
  if (n.length > NAME_MAX) return `${NAME_MAX} characters or fewer`
  if (!NAME_RE.test(n)) return 'Letters, numbers and underscores, starting with a letter'
  return null
}

const Btn: React.FC<{
  onClick: () => void; children: React.ReactNode
  kind?: 'primary' | 'quiet'; disabled?: boolean
}> = ({ onClick, children, kind = 'primary', disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      ...font(700, 12, 1, '0.06em'),
      color: kind === 'primary' ? BG.shell : TEXT.secondary,
      background: kind === 'primary' ? ACCENT.info : 'transparent',
      border: kind === 'primary' ? 'none' : `1px solid ${BORDER.raised}`,
      padding: '10px 16px', cursor: disabled ? 'default' : 'pointer',
      fontFamily: FONT, opacity: disabled ? 0.5 : 1,
    }}
  >{children}</button>
)

export const FirstRunModal: React.FC = () => {
  const { user, getToken, refetchUser } = useAuth()
  const [step, setStep] = useState<'name' | 'team'>('name')
  const [dismissed, setDismissed] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const open = !!user && !user.hasCompletedOnboarding && !dismissed

  useEffect(() => {
    if (!open || options.length) return
    let cancelled = false
    ;(async () => {
      try {
        const tok = await getToken()
        const res = await fetch(`${API_BASE}/users/me/username-options`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        const json = await res.json()
        if (!cancelled) setOptions(json?.options ?? [])
      } catch { /* free entry still works without suggestions */ }
    })()
    return () => { cancelled = true }
  }, [open, options.length, getToken])

  /** Mark it done so this never reappears, then close. Best-effort: a reader who
   *  got this far should not be trapped by a failed write. */
  const finish = useCallback(async () => {
    setDismissed(true)
    try {
      const tok = await getToken()
      await fetch(`${API_BASE}/users/me/onboarding-complete`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok}` },
      })
      refetchUser()
    } catch { /* the flag is a convenience, not a gate */ }
  }, [getToken, refetchUser])

  const saveName = async (chosen: string) => {
    const local = localNameError(chosen)
    if (local) { setError(local); return }
    setSaving(true); setError(null)
    try {
      const tok = await getToken()
      const res = await fetch(`${API_BASE}/users/me/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ username: chosen.trim() }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) { setError(json?.detail || 'That name did not take'); return }
      refetchUser()
      setStep('team')
    } catch {
      setError('That name did not take')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const body = (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 90, padding: '20px', fontFamily: FONT,
    }}>
      <div style={{
        background: BG.card, border: `1px solid ${BORDER.raised}`,
        width: '100%', maxWidth: '460px', padding: '26px 26px 22px',
      }}>
        {step === 'name' ? (
          <>
            <div style={{ ...font(700, 10, 1, '0.14em'), color: ACCENT.info }}>WELCOME</div>
            <h2 style={{ ...font(800, 21, 1.2, '-0.02em'), color: TEXT.primary, margin: '10px 0 8px' }}>
              What should we call you?
            </h2>
            <p style={{ ...font(400, 13, 1.55), color: TEXT.secondary, margin: '0 0 18px' }}>
              This is the name on leaderboards and anything you post. You can change it
              once a season.
            </p>

            {options.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                {options.map(o => (
                  <button
                    key={o}
                    onClick={() => saveName(o)}
                    disabled={saving}
                    style={{
                      ...font(600, 12), color: TEXT.secondary, background: BG.panel,
                      border: `1px solid ${BORDER.raised}`, padding: '8px 11px',
                      cursor: saving ? 'default' : 'pointer', fontFamily: FONT,
                    }}
                  >{o}</button>
                ))}
              </div>
            )}

            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) saveName(name) }}
              placeholder="or type your own"
              style={{
                width: '100%', boxSizing: 'border-box', background: BG.panel,
                border: `1px solid ${BORDER.raised}`, color: TEXT.primary,
                padding: '10px 12px', ...font(500, 13), fontFamily: FONT,
              }}
            />
            {error && (
              <div style={{ ...font(400, 12), color: ACCENT.negative, marginTop: '8px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '18px' }}>
              <Btn onClick={() => saveName(name)} disabled={saving || !name.trim()}>
                {saving ? 'SAVING…' : 'USE THIS NAME'}
              </Btn>
              {/* Keeping the generated name is a legitimate answer, not a skip. */}
              <Btn kind="quiet" onClick={() => setStep('team')}>
                KEEP {user?.username ?? 'MY NAME'}
              </Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ ...font(700, 10, 1, '0.14em'), color: ACCENT.info }}>ONE MORE THING</div>
            <h2 style={{ ...font(800, 21, 1.2, '-0.02em'), color: TEXT.primary, margin: '10px 0 8px' }}>
              Pick a team to follow?
            </h2>
            <p style={{ ...font(400, 13, 1.55), color: TEXT.secondary, margin: '0 0 18px' }}>
              Your team gets a panel on the front page with their live score, next
              fixture and recent form. You can also do this later from there.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Btn onClick={() => {
                finish()
                window.dispatchEvent(new Event('floosball:show-favorite-team-picker'))
              }}>PICK A TEAM</Btn>
              <Btn kind="quiet" onClick={finish}>NOT NOW</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return ReactDOM.createPortal(body, document.body)
}

export default FirstRunModal
