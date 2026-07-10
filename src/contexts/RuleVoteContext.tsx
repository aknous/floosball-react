import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Shared state for the Cores rule-change vote (docs/RULE_CHANGES_PLAN.md).
// One poller feeds both the auto-popup modal and the Rulebook pill indicator.

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const POLL_MS = 30_000

export interface RuleVoteOption {
  key: string                         // the vote/tally key (a field, a preset key, or 'revert:<mechanic>')
  field: string | null               // the scalar field, or null for a compound preset (e.g. Drive Clock)
  label: string
  current: number | boolean | string
  proposed: number | boolean | string
}

interface RuleVoteState {
  loading: boolean
  open: boolean
  season: number
  windowId: number | null
  kind: 'change' | 'revert' | null
  core: string | null
  coreDisplayName: string | null
  prompt: string | null
  reactPick: string | null
  reactNone: string | null
  options: RuleVoteOption[]
  totals: Record<string, number>
  myPick: string | null
  closesAt: string | null
  votingOpen: boolean
  castVote: (optionKey: string) => Promise<void>
  refetch: () => void
  modalOpen: boolean
  openModal: () => void
  closeModal: () => void
}

const RuleVoteContext = createContext<RuleVoteState | null>(null)

// Keyed on closesAt too, so a fresh sim (which resets season + the window's DB id)
// never collides with a window the user already dismissed in a prior run.
const seenKey = (season: number, windowId: number, closesAt: string | null) =>
  `ruleVoteSeen_${season}_${windowId}_${closesAt ?? 'x'}`

export const RuleVoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [season, setSeason] = useState(0)
  const [windowId, setWindowId] = useState<number | null>(null)
  const [kind, setKind] = useState<'change' | 'revert' | null>(null)
  const [core, setCore] = useState<string | null>(null)
  const [coreDisplayName, setCoreDisplayName] = useState<string | null>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [reactPick, setReactPick] = useState<string | null>(null)
  const [reactNone, setReactNone] = useState<string | null>(null)
  const [options, setOptions] = useState<RuleVoteOption[]>([])
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [myPick, setMyPick] = useState<string | null>(null)
  const [closesAt, setClosesAt] = useState<string | null>(null)
  const [votingOpen, setVotingOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const fetchId = useRef(0)

  const fetchBallot = useCallback(async () => {
    const id = ++fetchId.current
    try {
      const tok = await getToken().catch(() => null)
      const headers: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {}
      const res = await fetch(`${API_BASE}/rules/vote/ballot`, { headers, cache: 'reload' })
      if (id !== fetchId.current) return
      if (!res.ok) return
      const d = (await res.json()).data
      setSeason(d.season ?? 0)
      setOpen(!!d.open)
      if (d.open) {
        setWindowId(d.windowId ?? null)
        setKind(d.kind ?? null)
        setCore(d.core ?? null)
        setCoreDisplayName(d.coreDisplayName ?? null)
        setPrompt(d.prompt ?? null)
        setReactPick(d.reactPick ?? null)
        setReactNone(d.reactNone ?? null)
        setOptions(d.options ?? [])
        setTotals(d.totals ?? {})
        setMyPick(d.myPick ?? null)
        setClosesAt(d.closesAt ?? null)
        setVotingOpen(!!d.votingOpen)
      } else {
        setWindowId(null); setKind(null); setCore(null); setOptions([])
        setTotals({}); setMyPick(null); setClosesAt(null); setVotingOpen(false)
      }
    } finally {
      if (id === fetchId.current) setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchBallot()
    const t = setInterval(fetchBallot, POLL_MS)
    return () => clearInterval(t)
  }, [fetchBallot])

  // Auto-open the modal once per window, the first time a live vote is seen.
  useEffect(() => {
    if (!open || !votingOpen || windowId == null || !season) return
    if (localStorage.getItem(seenKey(season, windowId, closesAt))) return
    setModalOpen(true)
  }, [open, votingOpen, windowId, season, closesAt])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => {
    if (season && windowId != null) localStorage.setItem(seenKey(season, windowId, closesAt), '1')
    setModalOpen(false)
  }, [season, windowId, closesAt])

  const castVote = useCallback(async (optionKey: string) => {
    const tok = await getToken().catch(() => null)
    if (!tok || windowId == null) return
    setMyPick(optionKey)  // optimistic
    setTotals(prev => {
      const next = { ...prev }
      if (myPick && myPick !== optionKey) next[myPick] = Math.max(0, (next[myPick] ?? 1) - 1)
      if (!myPick || myPick !== optionKey) next[optionKey] = (next[optionKey] ?? 0) + 1
      return next
    })
    const res = await fetch(`${API_BASE}/rules/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ optionKey }),
    })
    if (res.ok) {
      const d = (await res.json()).data
      if (d?.totals) setTotals(d.totals)
    } else {
      fetchBallot()  // revert to server truth
    }
  }, [getToken, windowId, myPick, fetchBallot])

  const value: RuleVoteState = {
    loading, open, season, windowId, kind, core, coreDisplayName,
    prompt, reactPick, reactNone, options, totals, myPick, closesAt, votingOpen,
    castVote, refetch: fetchBallot, modalOpen, openModal, closeModal,
  }
  return <RuleVoteContext.Provider value={value}>{children}</RuleVoteContext.Provider>
}

export function useRuleVote(): RuleVoteState {
  const ctx = useContext(RuleVoteContext)
  if (!ctx) throw new Error('useRuleVote must be used within RuleVoteProvider')
  return ctx
}

// Display a rule value: booleans as On/Off, string enums title-cased (a scoring
// model 'spread' -> 'Spread'), numbers trimmed of trailing zeros.
export function fmtRuleValue(v: number | boolean | string | null | undefined): string {
  if (typeof v === 'boolean') return v ? 'On' : 'Off'
  if (v == null) return '—'
  if (typeof v === 'string') return v.charAt(0).toUpperCase() + v.slice(1)
  const n = Number(v)
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}
