import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { BG, BORDER, TEXT, ACCENT, FONT, font } from '@/Components/Shell/tokens'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/**
 * Auto-pick: what to do with the games you never got to.
 *
 * ⚠️ These controls existed on the old `PickEmPanel` and were lost when the page was
 * rebuilt. They are the difference between missing a slate and scoring nothing for it,
 * so they belong somewhere permanent rather than behind a tab.
 *
 * ⚠️ Auto-picks are DELIBERATELY second-class and the copy says so: they never overwrite
 * a manual pick, they take the 1.0x pre-game timing rather than the best available, and
 * both Contrarian and Jinx exclude them so neither can be farmed by setting a mode and
 * walking away.
 */

type Mode = 'off' | 'favorites' | 'underdogs' | 'random'

// ⚠️ No per-option hint (owner). "Favorites" and "Underdogs" say what they do; a line
// of explanation under each turned a four-item list into sixteen lines of text.
const MODES: { key: Mode; label: string }[] = [
  { key: 'off', label: 'Off' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'underdogs', label: 'Underdogs' },
  { key: 'random', label: 'Random' },
]

const AutoPickPanel: React.FC = () => {
  const { user, getToken, refetchUser } = useAuth()
  const [mode, setMode] = useState<Mode>((user?.autoPickMode as Mode) ?? 'off')
  const [loyal, setLoyal] = useState(!!user?.autoPickNeverAgainstFavorite)
  const [saving, setSaving] = useState(false)

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true)
    try {
      const tok = await getToken()
      if (!tok) return
      await fetch(`${API_BASE}/users/me/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify(patch),
      })
      refetchUser()
    } catch { /* the control keeps the optimistic value; a reload re-reads the server */ } finally {
      setSaving(false)
    }
  }

  const pickMode = (next: Mode) => { setMode(next); save({ autoPickMode: next }) }
  const toggleLoyal = () => {
    const next = !loyal
    setLoyal(next)
    save({ autoPickNeverAgainstFavorite: next })
  }

  const hasTeam = user?.favoriteTeamId != null

  return (
    <div style={{
      background: BG.panel, border: `1px solid ${BORDER.hairline}`,
      marginTop: '14px', fontFamily: FONT,
    }}>
      <div style={{
        ...font(700, 11, 1, '0.1em'), color: TEXT.secondary,
        padding: '12px 15px', borderBottom: `1px solid ${BORDER.hairline}`,
      }}>AUTO-PICK</div>

      <div style={{ padding: '11px 15px 13px' }}>
        <p style={{ ...font(400, 11, 1.6), color: TEXT.muted, margin: '0 0 11px' }}>
          Fills games you miss. Never overwrites your own picks, and takes the
          pre-game rate.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {MODES.map(m => {
            const active = mode === m.key
            return (
              <button
                key={m.key}
                onClick={() => pickMode(m.key)}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
                  textAlign: 'left', padding: '8px 10px', fontFamily: FONT,
                  background: active ? 'rgba(56,189,248,0.10)' : 'transparent',
                  border: 'none',
                  borderLeft: `2px solid ${active ? ACCENT.info : 'transparent'}`,
                  cursor: saving ? 'default' : 'pointer',
                }}
              >
                <span style={{
                  minWidth: 0, flex: 1, ...font(active ? 700 : 500, 12),
                  color: active ? TEXT.primary : TEXT.body,
                }}>{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ⚠️ Only shown with a club to be loyal TO. Offering it to someone with no
          favorite team is offering a setting that cannot do anything. */}
      {hasTeam && (
        <div style={{ borderTop: `1px solid ${BORDER.hairline}`, padding: '12px 15px' }}>
          <button
            onClick={toggleLoyal}
            disabled={saving || mode === 'off'}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
              textAlign: 'left', background: 'transparent', border: 'none', padding: 0,
              cursor: saving || mode === 'off' ? 'default' : 'pointer', fontFamily: FONT,
              opacity: mode === 'off' ? 0.5 : 1,
            }}
          >
            <span style={{
              width: '15px', height: '15px', flexShrink: 0, marginTop: '1px',
              border: `1px solid ${loyal ? ACCENT.ownTeam : BORDER.hover}`,
              background: loyal ? ACCENT.ownTeam : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {loyal && (
                <svg width="10" height="10" viewBox="0 0 20 20" fill={BG.shell}>
                  <path d="M7.6 14.2 3.4 10l1.4-1.4 2.8 2.8 7-7L16 5.8z" />
                </svg>
              )}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', ...font(600, 12), color: TEXT.body }}>
                Never pick against my team
              </span>
              <span style={{ display: 'block', ...font(400, 10, 1.6), color: TEXT.muted, marginTop: '4px' }}>
                {mode === 'off'
                  ? 'Pick a mode above first.'
                  : 'Takes your team whatever the mode would have chosen. Costs points on average.'}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

export default AutoPickPanel
