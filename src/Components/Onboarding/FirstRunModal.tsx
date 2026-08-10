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
// ⚠️ Mirrors `_USERNAME_RE` in api/auth.py — a name may start with a digit or an
// underscore (owner, 2026-08-10). The server is still the authority; this only
// decides whether we stop the request before it leaves.
const NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_]*$/

/** Mirrors api/auth.validateUsername so a bad name fails as you type. The server
 *  re-checks everything and its message wins if the two ever disagree. */
const localNameError = (name: string): string | null => {
  const n = name.trim()
  if (!n) return null
  if (n.length < NAME_MIN) return `At least ${NAME_MIN} characters`
  if (n.length > NAME_MAX) return `${NAME_MAX} characters or fewer`
  if (!NAME_RE.test(n)) return 'Letters, numbers and underscores'
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
  const [rolling, setRolling] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const open = !!user && !user.hasCompletedOnboarding && !dismissed
  const current = user?.username ?? null
  const assigned = !!current && user?.usernameIsGenerated !== false

  /** Ask the server for a fresh set of suggestions. */
  const loadOptions = useCallback(async () => {
    setRolling(true)
    try {
      const tok = await getToken()
      const res = await fetch(`${API_BASE}/users/me/username-options`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const json = await res.json()
      setOptions(json?.options ?? [])
    } catch {
      /* free entry still works without suggestions */
    } finally {
      setRolling(false)
    }
  }, [getToken])

  useEffect(() => {
    if (!open || options.length) return
    loadOptions()
  }, [open, options.length, loadOptions])

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

  /**
   * `offered` marks a name that came from the server's own suggestions.
   *
   * ⚠️ Those skip the local rules. The client cannot fully reproduce the server's
   * validation — the length cap is waived for names the generator itself could have
   * produced, and that check needs the server's vocabulary — so applying the plain
   * rule to a clicked suggestion refused the app's own offer without ever sending it.
   * The server remains the authority either way; this only decides whether we stop
   * the request before it leaves.
   */
  const saveName = async (chosen: string, offered = false) => {
    const local = offered ? null : localNameError(chosen)
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
              {assigned ? 'We picked a name for you' : 'What should we call you?'}
            </h2>
            <p style={{ ...font(400, 13, 1.55), color: TEXT.secondary, margin: '0 0 16px' }}>
              This is the name on leaderboards and anything you post. You can change it
              once a season.
            </p>

            {/* ⚠️ A first-run reader ALREADY HAS a name: auth provisions one at signup.
                Asking "what should we call you?" over a name they were never shown
                reads as though nothing has happened yet, and the only place the name
                appeared was inside the KEEP button, which is not where anyone looks to
                find out what they are called. */}
            {current && (
              <div style={{
                background: BG.panel, border: `1px solid ${BORDER.hairline}`,
                padding: '11px 13px', marginBottom: '16px',
              }}>
                <div style={{ ...font(700, 9, 1, '0.14em'), color: TEXT.muted }}>
                  {assigned ? 'ASSIGNED AT SIGNUP' : 'YOUR NAME'}
                </div>
                <div style={{
                  ...font(800, 15, 1.3), color: TEXT.primary, marginTop: '4px',
                  wordBreak: 'break-word',
                }}>{current}</div>
              </div>
            )}

            {/* The bridge between the name they were handed and the ways out of it.
                Without it the suggestion buttons are four unexplained names sitting
                under a name they did not ask for. */}
            {options.length > 0 && (
              <p style={{ ...font(400, 13, 1.5), color: TEXT.secondary, margin: '0 0 10px' }}>
                {current
                  ? "Don't like it? How about one of these, or set your own."
                  : 'How about one of these, or set your own.'}
              </p>
            )}

            {options.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                {options.map(o => (
                  <button
                    key={o}
                    onClick={() => saveName(o, true)}
                    disabled={saving || rolling}
                    style={{
                      ...font(600, 12), color: TEXT.secondary, background: BG.panel,
                      border: `1px solid ${BORDER.raised}`, padding: '8px 11px',
                      cursor: saving || rolling ? 'default' : 'pointer', fontFamily: FONT,
                      opacity: rolling ? 0.5 : 1,
                    }}
                  >{o}</button>
                ))}
                {/* Four names you did not choose is not a choice. The button sits with
                    the suggestions rather than beside the field, because it acts on
                    them and not on what you typed. */}
                <button
                  onClick={loadOptions}
                  disabled={saving || rolling}
                  title="Show four different names"
                  style={{
                    ...font(600, 12), color: TEXT.muted, background: 'transparent',
                    border: `1px dashed ${BORDER.raised}`, padding: '8px 11px',
                    cursor: saving || rolling ? 'default' : 'pointer', fontFamily: FONT,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none"
                    stroke={TEXT.muted} strokeWidth="2" strokeLinecap="round"
                    style={{ flexShrink: 0 }}>
                    <path d="M17 10a7 7 0 11-2.05-4.95" />
                    <path d="M17 2v4h-4" />
                  </svg>
                  {rolling ? 'Rolling' : 'More'}
                </button>
              </div>
            )}

            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) saveName(name) }}
              placeholder={current ? 'or type a different one' : 'or type your own'}
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
              {/* Keeping the assigned name is a legitimate answer, not a skip. The
                  name itself is spelled out above, so the button does not have to
                  carry it and blow out on a long one. */}
              <Btn kind="quiet" onClick={() => setStep('team')}>
                {current ? 'KEEP IT' : 'SKIP'}
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
