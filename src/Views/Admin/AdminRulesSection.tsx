import React, { useState, useCallback, useEffect } from 'react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

type RuleValue = number | string | boolean | null

interface RuleOption { value?: RuleValue; key?: string; label: string }

interface RuleRow {
  key: string
  label: string
  kind: 'number' | 'choice' | 'toggle' | 'preset'
  current: RuleValue
  default: RuleValue
  changed: boolean
  options?: RuleOption[]
  range?: { min: number; max: number; float: boolean }
}

interface RulesPayload {
  season: number | null
  rules: RuleRow[]
  ruleVotesEnabled: boolean
  gamesLive: boolean
}

const buttonStyle = (enabled: boolean, color = '#3b82f6'): React.CSSProperties => ({
  padding: '5px 12px', fontSize: '12px', fontWeight: 600, color: '#ffffff',
  backgroundColor: enabled ? color : '#334155', border: 'none', borderRadius: '4px',
  cursor: enabled ? 'pointer' : 'default', fontFamily: 'inherit',
})

const inputStyle: React.CSSProperties = {
  padding: '5px 8px', fontSize: '12px', color: '#e2e8f0', backgroundColor: '#0f172a',
  border: '1px solid #334155', borderRadius: '4px', fontFamily: 'inherit',
}

const optionLabel = (row: RuleRow, v: RuleValue): string => {
  if (row.kind === 'preset') return row.options?.find(o => o.key === v)?.label ?? String(v)
  const o = row.options?.find(opt => opt.value === v)
  return o ? o.label : String(v)
}

/** One rule: its standard value, what is in force, and a control to change it. */
const RuleEditor: React.FC<{
  row: RuleRow
  disabled: boolean
  onApply: (row: RuleRow, choice: RuleValue) => void
}> = ({ row, disabled, onApply }) => {
  const [draft, setDraft] = useState<string>(String(row.current))
  useEffect(() => { setDraft(String(row.current)) }, [row.current])

  const parsed = (): RuleValue => {
    if (row.kind === 'number') return draft.trim() === '' ? null : Number(draft)
    if (row.kind === 'preset') return draft
    const o = row.options?.find(opt => String(opt.value) === draft)
    return o ? (o.value as RuleValue) : null
  }
  const choice = parsed()
  const dirty = choice !== null && String(choice) !== String(row.current)
    && !(row.kind === 'number' && Number.isNaN(choice as number))

  let control: React.ReactNode
  if (row.kind === 'number') {
    control = (
      <input
        type="number" value={draft} disabled={disabled}
        min={row.range?.min} max={row.range?.max} step={row.range?.float ? 0.1 : 1}
        onChange={e => setDraft(e.target.value)}
        style={{ ...inputStyle, width: '80px' }}
      />
    )
  } else {
    const opts = row.kind === 'preset'
      ? (row.options ?? []).map(o => ({ v: String(o.key), label: o.label }))
      : (row.options ?? []).map(o => ({ v: String(o.value), label: o.label }))
    if (row.kind === 'preset' && row.current === 'custom') opts.unshift({ v: 'custom', label: 'Custom' })
    control = (
      <select value={draft} disabled={disabled} onChange={e => setDraft(e.target.value)} style={inputStyle}>
        {opts.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    )
  }

  return (
    <tr style={{ borderTop: '1px solid #1e293b' }}>
      <td style={{ padding: '8px 10px', fontSize: '13px', color: '#e2e8f0' }}>
        {row.label}
        {row.kind === 'number' && row.range && (
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            {row.range.min} to {row.range.max}{row.range.float ? ', decimals allowed' : ''}
          </div>
        )}
      </td>
      <td style={{ padding: '8px 10px', fontSize: '13px', color: row.changed ? '#fbbf24' : '#cbd5e1', fontWeight: row.changed ? 700 : 400 }}>
        {optionLabel(row, row.current)}
      </td>
      <td style={{ padding: '8px 10px', fontSize: '12px', color: '#94a3b8' }}>{optionLabel(row, row.default)}</td>
      <td style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {control}
          <button onClick={() => onApply(row, choice)} disabled={disabled || !dirty} style={buttonStyle(!disabled && dirty)}>
            Apply
          </button>
          {row.changed && (
            <button onClick={() => onApply(row, row.default)} disabled={disabled}
              style={{ ...buttonStyle(!disabled, 'transparent'), border: '1px solid #475569', color: '#cbd5e1' }}>
              Standard
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

/**
 * The league's rule slate (the rules fans see in the Rulebook and vote on), with a way to
 * change each one. A change applies to the shared season ruleset, so the backend refuses
 * it while a game is being played, and it lasts until the next season starts.
 */
const AdminRulesSection: React.FC<{ buildHeaders: () => Promise<Record<string, string>> }> = ({ buildHeaders }) => {
  const [data, setData] = useState<RulesPayload | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const request = useCallback(async (method: 'GET' | 'PUT' | 'POST', path = '', body?: unknown) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/rules${path}`, {
        method, headers: await buildHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || `Request failed (${res.status})`)
      setData(json.data)
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }, [buildHeaders])

  useEffect(() => { request('GET') }, [request])

  const apply = async (row: RuleRow, choice: RuleValue) => {
    setNotice(null)
    const body = row.kind === 'preset' ? { key: row.key, preset: choice } : { key: row.key, value: choice }
    if (await request('PUT', '', body)) setNotice(`${row.label} set to ${optionLabel(row, choice)}.`)
  }

  const reset = async () => {
    setNotice(null)
    if (await request('POST', '/reset')) setNotice('Every rule is back to standard.')
    setConfirmReset(false)
  }

  const changedCount = data?.rules.filter(r => r.changed).length ?? 0
  const locked = busy || !!data?.gamesLive

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px 0' }}>Rules</h2>
      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 14px 0', maxWidth: '640px' }}>
        The rules in force for {data?.season ? `Season ${data.season}` : 'the league'}. A change lasts until the next
        season starts, when the rulebook goes back to standard. Nothing is announced to fans; post on the News tab if
        you want to. Criticality games still play under their own random rules.
      </p>

      {data && (
        <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '12px' }}>
          Rule votes are <strong style={{ color: data.ruleVotesEnabled ? '#22c55e' : '#f87171' }}>
            {data.ruleVotesEnabled ? 'on' : 'off'}</strong> (Settings tab).
        </div>
      )}
      {data?.gamesLive && (
        <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '12px' }}>
          Games are being played. Rules can be changed once this slate finishes.
        </div>
      )}
      {error && <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '12px' }}>{error}</div>}
      {notice && <div style={{ fontSize: '12px', color: '#22c55e', marginBottom: '12px' }}>{notice}</div>}

      {data && (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px' }}>
          <thead>
            <tr>
              {['Rule', 'In force', 'Standard', 'Change'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rules.map(row => <RuleEditor key={row.key} row={row} disabled={locked} onApply={apply} />)}
          </tbody>
        </table>
      )}

      {data && (
        <div style={{ marginTop: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} disabled={locked || changedCount === 0}
              style={buttonStyle(!locked && changedCount > 0, '#dc2626')}>
              Reset all to standard
            </button>
          ) : (
            <>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                Put {changedCount} changed {changedCount === 1 ? 'rule' : 'rules'} back to standard?
              </span>
              <button onClick={reset} disabled={locked} style={buttonStyle(!locked, '#dc2626')}>Reset</button>
              <button onClick={() => setConfirmReset(false)}
                style={{ ...buttonStyle(true, 'transparent'), border: '1px solid #475569', color: '#cbd5e1' }}>Cancel</button>
            </>
          )}
          <button onClick={() => request('GET')} disabled={busy}
            style={{ ...buttonStyle(!busy, 'transparent'), border: '1px solid #475569', color: '#cbd5e1' }}>
            Refresh
          </button>
        </div>
      )}
    </div>
  )
}

export default AdminRulesSection
