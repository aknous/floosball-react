// Tier mappings for a player's static personality + mental attributes.
// Shared by the game-modal breakdown panel, the player hover card, and
// the player profile page so labels and color treatments stay consistent
// across surfaces.

export type MentalTier = { label: string; color: string }

export const attitudeTier = (v: number): MentalTier => {
  if (v >= 90) return { label: 'Leader',   color: '#22c55e' }
  if (v >= 80) return { label: 'Positive', color: '#86efac' }
  if (v >= 65) return { label: 'Neutral',  color: '#94a3b8' }
  if (v >= 50) return { label: 'Sour',     color: '#f59e0b' }
  return         { label: 'Toxic',    color: '#ef4444' }
}

export const resilienceTier = (v: number): MentalTier => {
  if (v >= 90) return { label: 'Ironclad',  color: '#22c55e' }
  if (v >= 80) return { label: 'Resilient', color: '#86efac' }
  if (v >= 65) return { label: 'Steady',    color: '#94a3b8' }
  if (v >= 50) return { label: 'Brittle',   color: '#f59e0b' }
  return         { label: 'Fragile',   color: '#ef4444' }
}

export const selfBeliefTier = (v: number): MentalTier => {
  if (v >= 90) return { label: 'Anchored', color: '#22c55e' }
  if (v >= 80) return { label: 'Steady',   color: '#86efac' }
  if (v >= 65) return { label: 'Even',     color: '#94a3b8' }
  if (v >= 50) return { label: 'Skittish', color: '#f59e0b' }
  return         { label: 'Volatile', color: '#ef4444' }
}

// Game-formula attrs are clipped to 60-100 at generation, so their tier
// breakpoints are tighter than the 30-100 locker-room attrs above.
const game100Tier = (v: number, top: string): MentalTier => {
  if (v >= 90) return { label: top,      color: '#22c55e' }
  if (v >= 80) return { label: 'Sharp',  color: '#86efac' }
  if (v >= 70) return { label: 'Steady', color: '#94a3b8' }
  return         { label: 'Loose',  color: '#f59e0b' }
}

export const disciplineTier = (v: number): MentalTier => game100Tier(v, 'Locked-In')
export const focusTier      = (v: number): MentalTier => game100Tier(v, 'Locked-In')
export const instinctTier   = (v: number): MentalTier => game100Tier(v, 'Instinctive')
export const creativityTier = (v: number): MentalTier => game100Tier(v, 'Creative')

export const pressureHandlingTier = (v: number): MentalTier => {
  if (v >= 6)  return { label: 'Ice',    color: '#22c55e' }
  if (v >= 2)  return { label: 'Cool',   color: '#86efac' }
  if (v >= -1) return { label: 'Even',   color: '#94a3b8' }
  if (v >= -5) return { label: 'Wobbly', color: '#f59e0b' }
  return         { label: 'Choker', color: '#ef4444' }
}
