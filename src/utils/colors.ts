/**
 * Color utilities for picking text color against arbitrary backgrounds.
 *
 * Used to keep button labels legible when the background is a team's primary
 * color — light teams (Cleveland Rocks, etc.) wash out white text and need
 * dark text instead.
 */

/**
 * Pick a legible text color (#000 or #fff) for a given background hex color.
 * Uses the standard WCAG relative-luminance formula.
 *
 * @param hex Background color, e.g. "#E91E8C" or "E91E8C"
 * @returns "#000000" for light backgrounds, "#ffffff" for dark backgrounds
 */
export function getContrastTextColor(hex: string): string {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return '#ffffff'
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  // sRGB luminance approximation (good enough for picking text color)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#000000' : '#ffffff'
}
