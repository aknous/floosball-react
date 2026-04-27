// Personality color helpers — keeps base vibes muted and rare variants
// visually prominent so a Stoic reaction reads as background flavor while
// a `prophet` or `alien` reaction stands out in the feed.

export const BASE_VIBES = [
  'melancholy', 'stoic', 'chill', 'cool', 'lively', 'fiery',
  'unhinged', 'wholesome', 'goofy',
]

export const COMMON_VARIANTS = [
  'prankster', 'vain', 'perfectionist', 'paranoid', 'cursed',
  'superstitious', 'oblivious', 'trash_talker',
]

export const RARE_VARIANTS = [
  'alien', 'prophet', 'mystic', 'knight', 'fossil', 'ghost',
  'dramatic', 'sleepwalker', 'time_traveler', 'android', 'poetic',
]

export function personalityAccent(personality: string | null | undefined): string {
  if (!personality) return '#38bdf8'
  if (RARE_VARIANTS.includes(personality)) return '#f59e0b' // amber — rare
  if (COMMON_VARIANTS.includes(personality)) return '#a78bfa' // purple — common variant
  return '#38bdf8' // cyan — base vibe
}

export function personalityTier(personality: string | null | undefined): 'base' | 'common' | 'rare' | 'unknown' {
  if (!personality) return 'unknown'
  if (RARE_VARIANTS.includes(personality)) return 'rare'
  if (COMMON_VARIANTS.includes(personality)) return 'common'
  if (BASE_VIBES.includes(personality)) return 'base'
  return 'unknown'
}
