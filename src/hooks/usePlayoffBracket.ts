import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type {
  BracketTemplate, MyBracket, BracketLeaderRow, BracketPredictions,
} from '@/types/playoffBracket'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface PlayoffBracketData {
  template: BracketTemplate | null
  mine: MyBracket | null
  leaderboard: BracketLeaderRow[]
  loading: boolean
  submitting: boolean
  submit: (predictions: BracketPredictions) => Promise<boolean>
  refetch: () => void
}

export function usePlayoffBracket(): PlayoffBracketData {
  const { getToken } = useAuth()
  const [template, setTemplate] = useState<BracketTemplate | null>(null)
  const [mine, setMine] = useState<MyBracket | null>(null)
  const [leaderboard, setLeaderboard] = useState<BracketLeaderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchAll = useCallback(async () => {
    const tok = await getToken()
    if (!tok) { setLoading(false); return }
    const headers = { Authorization: `Bearer ${tok}` }
    try {
      const [tRes, mRes, lRes] = await Promise.all([
        fetch(`${API_BASE}/playoffs/bracket/template`, { headers }),
        fetch(`${API_BASE}/playoffs/bracket/me`, { headers }),
        fetch(`${API_BASE}/playoffs/bracket/leaderboard`, { headers }),
      ])
      if (tRes.ok) { const j = await tRes.json(); setTemplate(j.data ?? j) }
      if (mRes.ok) { const j = await mRes.json(); setMine(j.data ?? j) }
      if (lRes.ok) { const j = await lRes.json(); setLeaderboard((j.data ?? j).leaderboard ?? []) }
    } catch {
      /* silent — view renders an unavailable state */
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => { fetchAll() }, [fetchAll])

  const submit = useCallback(async (predictions: BracketPredictions): Promise<boolean> => {
    const tok = await getToken()
    if (!tok) return false
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/playoffs/bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ predictions }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Submit failed' }))
        alert(err.detail || 'Submit failed')
        return false
      }
      await fetchAll()
      return true
    } catch {
      alert('Submit failed')
      return false
    } finally {
      setSubmitting(false)
    }
  }, [getToken, fetchAll])

  return { template, mine, leaderboard, loading, submitting, submit, refetch: fetchAll }
}
