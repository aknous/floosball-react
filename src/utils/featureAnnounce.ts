// Tracks which one-time "new feature" announcements a user has seen. Backed by
// localStorage; bump the key suffix to re-announce a feature later.
const PREFIX = 'feature-seen:'

export const FEATURE_CARDS = 'cards-collection-2026'
export const FEATURE_SUPPORTER = 'supporter-2026'

export function isFeatureSeen(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) === '1'
  } catch {
    return true   // if storage is unavailable, don't nag
  }
}

export function markFeatureSeen(key: string): void {
  try {
    localStorage.setItem(PREFIX + key, '1')
  } catch { /* ignore */ }
  // Let the sidebar (and anyone else) clear its ping immediately.
  try {
    window.dispatchEvent(new CustomEvent('feature:seen', { detail: { key } }))
  } catch { /* ignore */ }
}
