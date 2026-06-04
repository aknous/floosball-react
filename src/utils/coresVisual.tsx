import React from 'react'
import {
  GiCyberEye, GiCircuitry, GiBrain, GiCpu, GiSpoutnik, GiProcessor,
} from 'react-icons/gi'

// Shared Cores visual language — used by the Cores control room and the
// header Criticality indicator. The per-Core icons + amber accent match the
// HighlightFeed so a Core reads the same wherever it appears.

// Per-Core lore icons (Game Icons). Each evokes the Core's system-level role:
//   Cassian   (record-keeping superfan) → brain
//   Pyre      (enforcement / compute)   → CPU
//   Aris      (curious experimenter)    → Sputnik
//   Halverson (chronicler / empath)     → circuitry
//   Vera      (silent observer)         → cyber eye
export const CORE_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>> = {
  cassian: GiBrain,
  pyre: GiCpu,
  aris: GiSpoutnik,
  halverson: GiCircuitry,
  vera: GiCyberEye,
}

export const CoreIcon: React.FC<{ core?: string; color: string; size?: number }> = ({ core, color, size = 14 }) => {
  const Icon = CORE_ICON_MAP[(core ?? '').toLowerCase()] ?? GiProcessor
  return <Icon size={size} color={color} style={{ flexShrink: 0 }} />
}

export const CORE_DISPLAY_NAMES: Record<string, string> = {
  cassian: 'Cassian',
  pyre: 'Pyre',
  aris: 'Aris',
  halverson: 'Halverson',
  vera: 'Vera',
}

// Per-Core accent colors. Non-verbal characterization — distinguishes who is
// speaking and gives each Core an identity without a written personality note.
// All chosen bright enough to read on the dark feed/popover backgrounds.
//   Cassian   gold    — the record-keeper / fanatic
//   Pyre      red     — fire, the enforcer
//   Aris      violet  — the anomaly-lover (echoes the anomaly palette)
//   Halverson emerald — warmth, the protective one
//   Vera      cyan    — the cold, distant observer
export const CORE_COLORS: Record<string, string> = {
  cassian: '#fbbf24',
  pyre: '#f87171',
  aris: '#c084fc',
  halverson: '#34d399',
  vera: '#38bdf8',
}

export const coreColor = (core?: string): string =>
  CORE_COLORS[(core ?? '').toLowerCase()] ?? '#fbbf24'

// Qualitative Criticality bands, mirrored from the backend getCriticalityStatus.
// No numbers — the band IS the information. Pulse speed (ms) scales with
// severity so the header indicator visibly quickens as the season tenses.
export interface BandVisual {
  label: string
  color: string
  // Background tint for cards/strips (color + low alpha)
  tint: string
  // Pulse period in ms (lower = more urgent). 0 = no pulse.
  pulseMs: number
  // Short fallback description if the API didn't supply one.
  fallback: string
}

export const CRITICALITY_BANDS: Record<string, BandVisual> = {
  dormant: {
    label: 'Dormant',
    color: '#94a3b8',
    tint: 'rgba(148,163,184,0.10)',
    pulseMs: 0,
    fallback: 'All readings nominal. The simulation holds.',
  },
  stirring: {
    label: 'Stirring',
    color: '#fbbf24',
    tint: 'rgba(251,191,36,0.12)',
    pulseMs: 2600,
    fallback: 'Irregularities are accumulating faster than they decay.',
  },
  unstable: {
    label: 'Unstable',
    color: '#f97316',
    tint: 'rgba(249,115,22,0.13)',
    pulseMs: 1500,
    fallback: 'The Cores are working to hold the simulation together.',
  },
  critical: {
    label: 'Critical',
    color: '#ef4444',
    tint: 'rgba(239,68,68,0.15)',
    pulseMs: 850,
    fallback: 'Containment is failing. The Cores cannot hold this much longer.',
  },
  stabilizing: {
    label: 'Stabilizing',
    color: '#38bdf8',
    tint: 'rgba(56,189,248,0.13)',
    pulseMs: 2200,
    fallback: 'The Cores have forced the anomaly back. The simulation is quiet. For now.',
  },
}

export const bandVisual = (status?: string): BandVisual =>
  CRITICALITY_BANDS[(status ?? 'dormant').toLowerCase()] ?? CRITICALITY_BANDS.dormant

// True once the league is tense enough to warrant drawing the user's eye
// (anything past dormant). Drives whether the header indicator / sidebar badge
// shows at all.
export const isElevated = (status?: string): boolean =>
  !!status && status.toLowerCase() !== 'dormant'
