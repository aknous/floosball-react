import { useEffect, useState } from 'react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

export interface AppSettings {
  feedback_url: string
  feedback_visible: boolean
  survey_url: string
  survey_visible: boolean
  survey_text: string
}

const DEFAULTS: AppSettings = {
  feedback_url: 'https://forms.gle/s2ycdsBLxTpsWEk4A',
  feedback_visible: true,
  survey_url: 'https://forms.gle/s2ycdsBLxTpsWEk4A',
  survey_visible: false,
  survey_text: '',
}

let cache: AppSettings | null = null
let inflight: Promise<AppSettings> | null = null

// Prepends https:// if a URL field has no scheme. Without this, an admin
// who entered "www.google.com" would have <a href="..."> resolve as a
// relative path (e.g. localhost:3000/www.google.com).
function normalizeUrl(value: string): string {
  if (!value) return value
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // Allow protocol-relative ("//example.com") and mailto:, tel:, etc.
  if (/^\/\//.test(trimmed) || /^[a-z]+:/i.test(trimmed)) return trimmed
  return 'https://' + trimmed
}

async function fetchSettings(): Promise<AppSettings> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/app-settings`)
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = await res.json()
      const merged = { ...DEFAULTS, ...data }
      merged.feedback_url = normalizeUrl(merged.feedback_url)
      merged.survey_url = normalizeUrl(merged.survey_url)
      cache = merged
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
