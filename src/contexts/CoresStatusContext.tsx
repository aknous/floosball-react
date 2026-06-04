import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'

// Shared Criticality status, polled once and handed to both the header
// indicator and the Cores control room so we don't double-poll. Number-free by
// design — the backend's /api/cores/status returns only a qualitative band.

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
const POLL_MS = 20_000

export interface CoresStatus {
  status: string        // dormant | stirring | unstable | critical | stabilizing
  label: string
  description: string
  inSuppression: boolean
  patchesApplied: number
  activeCore: string | null
  activeCoreDisplayName: string | null
  criticalityActive: boolean
}

const DORMANT: CoresStatus = {
  status: 'dormant',
  label: 'Dormant',
  description: 'All readings nominal. The simulation holds.',
  inSuppression: false,
  patchesApplied: 0,
  activeCore: null,
  activeCoreDisplayName: null,
  criticalityActive: false,
}

interface CoresStatusContextType {
  status: CoresStatus
  loading: boolean
}

const CoresStatusContext = createContext<CoresStatusContextType | undefined>(undefined)

export const CoresStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<CoresStatus>(DORMANT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = () => {
      fetch(`${API_BASE}/cores/status`)
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          if (cancelled || !json) return
          const data = (json.data ?? json) as Partial<CoresStatus>
          if (data && typeof data.status === 'string') {
            setStatus({ ...DORMANT, ...data } as CoresStatus)
          }
        })
        .catch(() => { /* keep last known; the sim may be mid-restart */ })
        .finally(() => {
          if (cancelled) return
          setLoading(false)
          timer = setTimeout(poll, POLL_MS)
        })
    }
    poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <CoresStatusContext.Provider value={{ status, loading }}>
      {children}
    </CoresStatusContext.Provider>
  )
}

export const useCoresStatus = (): CoresStatusContextType => {
  const ctx = useContext(CoresStatusContext)
  if (ctx === undefined) {
    // Tolerate being read outside the provider (e.g. isolated tests) — return
    // a calm default rather than throwing.
    return { status: DORMANT, loading: false }
  }
  return ctx
}
