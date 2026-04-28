import { useEffect, useState } from 'react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface AppSettings {
  feedback_url: string
  feedback_visible: boolean
  survey_url: string
}

const DEFAULTS: AppSettings = {
  feedback_url: 'https://forms.gle/s2ycdsBLxTpsWEk4A',
  feedback_visible: true,
  survey_url: 'https://forms.gle/s2ycdsBLxTpsWEk4A',
}

let cache: AppSettings | null = null
let inflight: Promise<AppSettings> | null = null

async function fetchSettings(): Promise<AppSettings> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/app-settings`)
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = await res.json()
      cache = { ...DEFAULTS, ...data }
      return cache!
    } catch {
      cache = DEFAULTS
      return DEFAULTS
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(cache || DEFAULTS)

  useEffect(() => {
    if (cache) {
      setSettings(cache)
      return
    }
    let cancelled = false
    fetchSettings().then(s => {
      if (!cancelled) setSettings(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return settings
}

export function invalidateAppSettings() {
  cache = null
}
