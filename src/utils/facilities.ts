// Appeal (facility quality) as a named rank. Appeal = sum of the 5 facility
// levels (0-25), so the per-facility average drives the band. Shared by the
// Front Office FacilitiesSection and the FA draft board (OffseasonPanel).
export function appealRank(appeal: number): string {
  const avg = appeal / 5
  if (avg >= 4.2) return 'Palatial'
  if (avg >= 3.2) return 'Premier'
  if (avg >= 2.2) return 'Modern'
  if (avg >= 1.2) return 'Modest'
  return 'Barebones'
}
