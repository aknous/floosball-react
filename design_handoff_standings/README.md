# Handoff: Standings

## Overview

A rebuilt Standings page for a 32-team league: two leagues (Corduroy, Flannel) of 16, four divisions of four in each. Eight of the sixteen in each league advance — the four division winners seeded 1–4, then four wild cards seeded 5–8.

The page is a **view switcher**, not one table trying to answer everything:

| View | Question it answers |
|---|---|
| **By division** | Who leads each division? |
| **By league** | Full reference — where does everyone sit, and on what? |
| **Wild card race** | How close is the race, and who's in right now? |

This replaces `src/Components/Standings.tsx`, which renders a flat per-league table with W-L / PCT / DIFF and a separate ELO power-rankings mode.

## About the Design Files

The files in this bundle are **design references created in HTML** — a prototype of intended look, structure, and behavior. They are **not production code to copy**. Recreate this inside the existing `floosball-react` codebase using its patterns: `Standings.tsx` is the component being replaced, `/api/standings` plus the `standings_update` websocket event are the data path, `TeamHoverCard` and `HoverTooltip` already exist and should be reused.

The prototype uses inline styles and a design-tool runtime (`support.js`, `<x-dc>`). None of that ships.

## Fidelity

**High-fidelity.** Colors, typography, spacing and hierarchy are final.

Records, differentials, ELO, streaks and division assignments are **placeholder values** — the user explicitly said not to worry about names or how teams are divided. Team identities and colors are **real**, from `config.json`.

---

## Data shapes

This is the part that needs backend work. The current `/api/standings` response is a flat array of leagues, each with a `standings` array — it has no division, no division/league record, no seed, and no rank movement. All four are required.

### What exists today

```ts
// current /api/standings response
type StandingsResponse = LeagueStandings[]

interface LeagueStandings {
  name: string                    // "Flannel League"
  standings: TeamStanding[]       // 16 teams, pre-sorted by record
}

interface TeamStanding {
  id: number
  name: string                    // "Broads"
  city: string                    // "Philadelphia"
  abbr: string                    // "PHI"
  color: string                   // "#C51162"
  secondaryColor: string
  elo: number
  wins: number
  losses: number
  winPerc: string                 // "0.643" — rendered with the leading 0 stripped
  scoreDiff?: number
  clinchedPlayoffs?: boolean
  clinchedTopSeed?: boolean
  eliminated?: boolean
  formState?: string              // 'HOT_STREAK' | ...
}
```

`Team` in `src/types/api.ts` already carries `division` and `conference` — the standings payload just doesn't include them.

### What this design needs

```ts
type StandingsResponse = LeagueStandings[]     // exactly 2

interface LeagueStandings {
  name: string                    // "Flannel League" | "Corduroy League"
  divisions: DivisionStandings[]  // exactly 4  ← NEW
  standings: TeamStanding[]       // all 16, see ordering below
}

interface DivisionStandings {     // ← NEW
  name: string                    // "East" — unique within the league
  teamIds: number[]               // exactly 4, in division-standings order
}

interface TeamStanding {
  // ── identity (unchanged) ──
  id: number
  name: string
  city: string
  abbr: string
  color: string
  secondaryColor: string

  // ── record ──
  wins: number
  losses: number
  winPerc: string
  scoreDiff: number               // now required — it's the final tiebreaker

  // ── NEW: grouping ──
  division: string                // must match a DivisionStandings.name

  // ── NEW: tiebreaker records ──
  divisionWins: number            // record inside the 4-team division
  divisionLosses: number
  leagueWins: number              // record inside the 16-team league
  leagueLosses: number

  // ── NEW: playoff position ──
  seed: number | null             // 1-8, or null if outside the cut
  seedKind: 'division' | 'wildcard' | null
  gamesBack: number               // from the last playoff spot; NEGATIVE = ahead
                                  // (…, -1, 0 = at the cut, 1, …); .5 possible

  // ── NEW: movement ──
  rankLastWeek: number | null     // 1-16 within the league; null in week 1
  rankChange: number              // positive = moved up; 0 = unchanged

  // ── status (existing, all now required) ──
  clinchedPlayoffs: boolean
  clinchedTopSeed: boolean
  eliminated: boolean

  // ── form ──
  elo: number
  streak: string                  // "W3" | "L2"
  last5: ('W' | 'L')[]            // most recent LAST, oldest first
}
```

**Invariants the backend must guarantee** (the prototype's generator asserts these):

- `divisionWins + divisionLosses` is the same for every team in a division.
- `divisionWins ≤ leagueWins ≤ wins` and `divisionLosses ≤ leagueLosses ≤ losses` — the division record is a subset of the league record, which is a subset of the overall record.
- Within a division, `sum(divisionWins) === sum(divisionLosses)`.
- Exactly 4 teams per league have `seedKind: 'division'` and exactly 4 have `'wildcard'`.
- `gamesBack === 0` for the team holding the last playoff spot.

**If `seed`, `gamesBack` and `rankChange` can't be computed server-side**, they're all derivable client-side from the fields above — but the ordering rules below must live in exactly one place, not be reimplemented per view.

### Ordering rules

Two different tiebreakers, and this was an explicit decision:

```
Division winner (seeds 1-4):
  1. wins            desc
  2. divisionWins    desc   ← division record breaks division ties
  3. scoreDiff       desc

Wild cards (seeds 5-8):
  1. wins            desc
  2. leagueWins      desc   ← league record breaks wild card ties
  3. scoreDiff       desc
```

Seeds 1–4 are the four division winners ordered against each other by the division rule. Seeds 5–8 are the best four non-winners by the wild card rule.

`standings[]` should arrive in **display order**: the 8 qualifiers by seed (1→8), then the remaining 8 by the wild card rule. Sorting purely by record makes the seed column read `1,2,3,5,6,4,…`, which looks like a bug, and puts the cutline in the wrong row whenever a division winner has a losing record — which happens: in the prototype two 7-7 teams win Corduroy divisions while a 10-4 team is the 5 seed.

`gamesBack` is measured from the **last wild card spot**, so a team above the cut has a negative value. Render `—` at 0, `+2` when ahead, `2` when behind.

---

## Screens / Views

### Page frame (prototype is 1440px wide)

| Region | Spec |
|---|---|
| Page background | `#070c15` |
| App shell | `#0b1220`, `1px solid #1e293b` |
| Top header | `padding: 14px 22px`, `#0f172a`, `border-bottom: 1px solid #1e293b` |
| Left nav | `width: 196px`, `#0f172a`, `border-right: 1px solid #1e293b`, **Standings** active |
| Toolbar | `padding: 15px 28px`, `#0b1220`, `border-bottom: 1px solid #1e293b` |
| Body | `padding: 18px 28px 28px` |

Header and nav match the front-page and game-board handoffs. The Standings nav item is active with a `#38bdf8` left border and `rgba(56,189,248,0.10)` background.

### Toolbar

Title "Standings" (`800 22px`, `-0.03em`) · `1px × 24px` divider · the view switcher · spacer · a legend.

**View switcher** — three segments, `BY DIVISION` / `BY LEAGUE` / `WILD CARD RACE`, on `#0f172a` with `1px solid #1e293b`. Active `800 11px` `#0b1220` on `#cbd5e1`; inactive `500 11px` `#94a3b8`; `padding: 8px 13px`.

**Legend** — four items at `600 10px`, `0.08em`, `#94a3b8`: top-seed badge, division-winner swatch, wild-card swatch, elimination `×`. The swatches must use the **same treatment as the badges they describe** (tinted circle + ring), not solid blocks.

---

### View 1 — By division

Two columns, one per league (`repeat(2, minmax(0,1fr))`, `gap: 26px`). Each column: a league heading (`800 17px` + rule + `DIV RECORD BREAKS TIES` at `600 10px`) then four division blocks.

**Division block** — `#131e2f`, `1px solid #1e293b`:
- Header: `padding: 10px 14px`, `#0f172a`, `border-bottom: 1px solid #334155`. Division name (`800 13px`, `0.06em`) · spacer · `LEADS` (`600 10px`, `#94a3b8`) + leader crest 18px + leader abbr (`700 11px`, `#cbd5e1`).
- Column head row and 4 team rows on the grid `21px minmax(0,1fr) 50px 44px 40px 34px 42px 52px`, `gap: 9px`, `padding: 7px 14px`, `min-height: 46px`, `box-sizing: border-box`.
- Columns: seed · team · W–L · **DIV** · PCT · GB · DIFF · LAST 5.

**No ± column here** — rank movement is meaningless in a four-team table; it lives only in the league view.

---

### View 2 — By league

Two full-width league tables stacked (`gap: 26px`). Each: heading (`800 19px`) + rule + `CUTLINE AFTER SEED 8` (`600 10px`, `#d9a94f`, preceded by a 14×2 `#c8963f` bar), then the table, then a seeding note.

Grid: `21px 34px minmax(0,1fr) 84px 58px 50px 50px 48px 46px 54px 46px 52px 66px`, `gap: 13px`, `padding: 8px 18px`, `min-height: 52px`, `box-sizing: border-box`.

Columns: seed · **±** · team · division · W–L · **DIV** · **LGE** · PCT · GB · DIFF · STRK · ELO · LAST 5.

The **cutline** is `border-bottom: 2px solid #c8963f` on the 8th row.

**Tiebreaker emphasis** — DIV renders `#cbd5e1` for division winners and `#94a3b8` otherwise; LGE renders `#cbd5e1` for wild cards and `#94a3b8` otherwise. Each column is brighter on the rows it actually decides.

**Seeding note** below each table: `#0f172a`, `1px solid #1e293b`, `padding: 10px 16px` — `SEEDING` label plus prose stating that seeds 1–4 are division winners ordered on division record, seeds 5–8 wild cards ordered on league record, differential settling the rest.

This is the only view where a team's division race and the league picture are visible together, so it's the natural default.

---

### View 3 — Wild card race

Deliberately **not** another ranked table — an earlier version was, and it duplicated View 2.

Per league:

1. **Locked in** — `LOCKED IN — DIVISION WINNERS, SEEDED 1–4 ON DIVISION RECORD` label, then four cards in a row (`flex: 1` each): seed badge · crest 26px · team name (`700 14px`) over `division · W–L · D–L div` (`500 10px`, `#94a3b8`). `border-top: 2px solid` — `#a87c33` for the 1 seed, `#4b7d5c` for the rest.

2. **The track** — `#131e2f`, `1px solid #1e293b`, `padding: 16px 18px 18px`. A games-back axis: one column per distinct `gamesBack` value present, `repeat(N, minmax(0,1fr))`, `gap: 10px`.
   - Tick header per column: `2 up` / `1 up` / `AT THE CUT` / `1 back` / `2 back`… at `700 10px`, `0.08em`, `border-bottom: 2px solid`. The at-the-cut column is `#d9a94f` on `#c8963f`; ahead-of-cut ticks `#83c294`; behind `#94a3b8` on `#1e293b`.
   - The at-the-cut column body carries `linear-gradient(180deg, rgba(200,150,63,0.09), rgba(200,150,63,0))`.
   - Teams stack vertically in their column (`gap: 7px`) as cards: crest 20px · abbr (`700 12px`) · spacer · **W–L** (`700 12px`, `#f1f5f9`). `padding: 7px 9px`, `box-sizing: border-box`.
     - Holding a wild card spot: `background: rgba(91,135,184,0.16)`, `1px solid #4a6e94`, abbr `#93b6de`.
     - Alive but outside: `background: #131e2f`, `1px solid #26344a`, abbr `#cbd5e1`.
     - Eliminated: `1px solid #5b2b2f`, abbr `#f87171`, `opacity: 0.7`.
     - The user's team: `rgba(197,17,98,0.12)` with a `#C51162` border.
   - Empty column: a `·` at `500 11px` `#94a3b8` with a "No team at this distance" tooltip — **not dimmer**, or it reads as a rendering gap.
   - Card tooltip carries the full detail (city, name, record, league record, streak).

The shape is the point: a pile of five cards at the cut says "unresolved" faster than any table.

---

## Row treatments (all views)

- **Seed badge** — a 21px circle, `box-sizing: border-box`, tinted fill + 1px ring, number at `800 11px` tabular in the accent tone. **Not** a solid block with knocked-out text — that was tried and the digit was unreadable.
  | State | Ring | Text | Fill |
  |---|---|---|---|
  | Top seed (1) | `#a87c33` | `#e3b767` | `rgba(200,150,63,0.16)` |
  | Division winner (2-4) | `#4b7d5c` | `#83c294` | `rgba(92,158,111,0.16)` |
  | Wild card (5-8) | `#4a6e94` | `#93b6de` | `rgba(91,135,184,0.16)` |
  | Outside the cut | — | `#94a3b8` `–` | — |
  | Eliminated | — | `#f87171` `×` | — |
- **Team cell** — crest (22px in division view, 26px elsewhere, `border-radius: 50%`) + city (`500 10–11px`, `#94a3b8`) over team name (`700 14–15px`, `#f1f5f9`, `-0.015em`). The user's team: name in its corrected team color + a `YOURS` tag (`700 9px`, `0.1em`, `#f472b6`), row background `rgba(197,17,98,0.10)` and `box-shadow: inset 3px 0 0 #C51162` (inset shadow, not a border — a border shrinks the content box and misaligns the row from the header).
- **Eliminated rows** — `opacity: 0.62`.
- **± movement** — `▲3` `#4ade80` / `▼1` `#f87171` / `—` `#94a3b8` at 11px, centered. League view only.
- **GB** — `#d9a94f` at 0 (on the cut), `#4ade80` when ahead, `#94a3b8` when behind.
- **DIFF** — `#4ade80` positive, `#f87171` negative, `#94a3b8` zero, signed.
- **STRK** — `#4ade80` for W, `#f87171` for L.
- **LAST 5** — five 9×15px bars, `gap: 3px`, oldest → newest: win `#4ade80`, loss `#f87171`, both solid and **no borders**. An earlier version used a near-black fill with a maroon border for losses and they vanished into the card.
- Every row is a link to the team page and gets `.row:hover { background: rgba(255,255,255,0.04) }`. Wrap in the existing `TeamHoverCard`.

## Interactions & Behavior

- View switching is client-side; no refetch. Persist the choice per user.
- `standings_update` websocket events replace the payload live; `week_start` refetches. Both already exist in `Standings.tsx`.
- Column headers with a definition (`DIV`, `LGE`, `GB`, `DIFF`, `±`, seed) carry a tooltip — reuse `HoverTooltip`, which is what the current DIFF header uses.
- Sorting is fixed. There is no user-facing sort control.
- **Loading** — skeleton the table bodies, keep the toolbar and headings in place.
- **Responsive** was not designed; the prototype is a fixed 1440px desktop layout. The division view collapsing from two columns to one is the obvious first step.

## Removed from the current implementation

- **The ELO power-rankings view is dropped.** ELO survives as a column in the league view. The separate all-teams ELO-sorted mode goes away.
- **A `PLAYOFF_SPOTS = 6` cutline** is replaced by 8 (4 winners + 4 wild cards), and it's drawn after the 8th *seed*, not the 8th row by record.

## Color correction

Team primaries come from config and many are too dark for text on `#131e2f`. Where a team color is used as **text** (the user's team name), run `lightenColor()` from `GameCard.tsx` and then blend toward `#f8fafc` until the measured WCAG ratio clears **4.6:1** against both `#131e2f` and `#17222f`. `lightenColor()` alone is not enough for saturated magenta/violet/blue. Raw colors are fine for fills.

`#94a3b8` is the **floor for any label** — 10px text at `#475569` or `#64748b` failed contrast repeatedly in review.

## Design Tokens

**Backgrounds:** page `#070c15` · shell `#0b1220` · panel `#0f172a` · card `#131e2f` · own-team card `#17222f`

**Borders:** hairline `#1e293b` · raised `#334155` · hover `#475569` · card-outline (alive, outside cut) `#26344a` · card-outline (eliminated) `#5b2b2f`

**Text:** primary `#f8fafc` · strong `#f1f5f9` · body `#cbd5e1` · muted `#94a3b8` (floor) · nav footer `#7286a0`

**Playoff states:** top seed `#a87c33` / `#e3b767` · division winner `#4b7d5c` / `#83c294` · wild card `#4a6e94` / `#93b6de` · cutline rule `#c8963f`, its label `#d9a94f` · own team `#C51162` / `#f472b6`

**Result states:** win `#4ade80` · loss `#f87171`

These are deliberately **muted, not neon** — the first pass used `#f59e0b` / `#4ade80` / `#38bdf8` at full saturation and read as too loud.

**Typography** — Inconsolata (`pressStart` in the prototype), fallback `ui-monospace, monospace`.

| Role | Spec |
|---|---|
| Page title | `800 22px`, `-0.03em` |
| League heading | `800 19px`, `-0.025em` (17px in the division view) |
| Division name | `800 13px`, `0.06em` |
| Team name | `700 14–15px`, `-0.015em` |
| W–L | `700 14–16px` tabular |
| Secondary stat | `500–600 13–14px` tabular |
| City | `500 10–11px` |
| Column header | `600 10px`, `0.12em` |
| Section label | `600 10px`, `0.12em` |
| Seed number | `800 11px` tabular |
| Chip / tag | `700 9–12px`, `0.04–0.1em` |

**Numerics:** every record, percentage, differential and ELO uses `font-variant-numeric: tabular-nums`.

**Radius:** none, except `border-radius: 50%` on crests and seed badges.

**Shadows:** none, except `inset 3px 0 0` for the own-team rail.

**`box-sizing: border-box`** on every row and card that sets both a border/padding and a `min-height` or width.

## Assets

- **Crests** — `assets/avatars/<teamId>.png`, ids 1–24 exist. Teams 25–32 have no crest yet and render a same-size dashed circle: `box-sizing: border-box`, `#0f172a`, `1px dashed #334155`, `border-radius: 50%`.
- **Fonts** — Inconsolata 400/500/600/700/800, already in the codebase.
- **Icons** — inline SVG at 17px on a `20 × 20` viewBox; substitute the codebase's `react-icons` equivalents.

## Screenshots

In `screenshots/`:

| File | What it shows |
|---|---|
| `01-by-division.png` | Eight division tables, both leagues |
| `02-by-league.png` | Both full league tables with the cutline and seeding notes |
| `03-wild-card-race.png` | Locked winners plus the games-back track, both leagues |
| `04-track-detail.png` | The track at 2× — tick labels, the cut column, stacked cards |

## Files

- `prototype/Standings.dc.html` — the design. `1a` By division, `1b` By league, `1c` Wild card race.
- `prototype/support.js` — design-tool runtime, needed only to open the prototype in a browser.
- `prototype/assets/` — fonts and crest images.
- `config.json` — the 32-team source data.

Open `prototype/Standings.dc.html` in a browser; all three views are side by side.
