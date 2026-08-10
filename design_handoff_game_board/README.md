# Handoff: Game Board

## Overview

A dedicated Game board page, replacing the game grid embedded in the dashboard. It shows all 16 simultaneous games of a week — 32 teams, all kicking off together — ranked so the most interesting game is first and the user's own game is pinned above the ranking.

The page has **no sidebar**. Standings, league news, and prognostications rails are removed; the games get the full content width. Navigation to those lives in the left nav.

Two densities are offered, switched by the user: **Large** (two across, full detail) and **Small** (four across, glanceable).

## About the Design Files

The files in this bundle are **design references created in HTML** — a prototype showing intended look, structure, and behavior. They are **not production code to copy**. The task is to recreate this design inside the existing `floosball-react` codebase using its established patterns: `GameCard.tsx` and `GameGridNew.tsx` are the components being replaced, `GamesContext` is the data source, `GameModalNew.tsx` is what a card opens into.

The prototype uses inline styles and a design-tool runtime (`support.js`, `<x-dc>`). None of that ships.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and hierarchy are final. Recreate faithfully, reusing existing components where they already solve a piece of it (see *Reuse from the existing codebase*).

Scores, clocks, win probabilities and play descriptions in the prototype are **placeholder values**. Team identities are **real** — see *Team Data*.

---

## Screens / Views

### Game board — 16 live games

**Page frame (prototype is 1440px wide):**

| Region | Spec |
|---|---|
| Page background | `#070c15` |
| App shell | `#0b1220`, `1px solid #1e293b` |
| Top header | `padding: 14px 22px`, `#0f172a`, `border-bottom: 1px solid #1e293b` |
| Left nav | `width: 196px`, `#0f172a`, `border-right: 1px solid #1e293b` |
| Board toolbar | `padding: 15px 28px`, `#0b1220`, `border-bottom: 1px solid #1e293b` |
| Board body | `padding: 18px 28px 28px`, `display: flex; flex-direction: column; gap: 14px` |

Header and nav are identical to the Front page handoff (`design_handoff_front_page`), with **Games** as the active nav item carrying a plain green `16` count.

---

### Component: Board toolbar

Left to right: title "Game board" (`800 22px`, `-0.03em`, `#f8fafc`); a live pill — `ALL 16 LIVE` (`700 10px`, `0.1em`, `#4ade80` on `rgba(74,222,128,0.10)`, `1px solid rgba(74,222,128,0.30)`, `padding: 5px 8px`) preceded by a 5px pulsing dot; a `1px × 24px` divider; the week selector (`‹` `Week 15` `›`, 26px square buttons, `1px solid #334155`, disabled forward at `#1e293b`/`#64748b`); flexible spacer; `DENSITY` label (`700 10px`, `0.12em`, `#94a3b8`) and the density switch.

**Density switch** — two segments, `LARGE` / `SMALL`, on `#0f172a` with `1px solid #1e293b`. Active: `800 11px`, `#0b1220` on `#cbd5e1`. Inactive: `500 11px`, `#94a3b8`. `padding: 8px 13px`, `border-left: 1px solid #1e293b` between.

**There is no sort control.** The order is fixed — see *Ranking*. **There is no re-rank button**: the order is recalculated on page load, never while the user is watching.

---

### Component: Large card (`LARGE` density)

Grid: `repeat(2, minmax(0,1fr))`, `gap: 14px` → 586px per card at 1440px. Card renders 300px tall; 16 cards = 8 rows, so this density scrolls by design.

Card: `#131e2f`, `1px solid #1e293b`, `border-top: 2px solid <accent>`, `padding: 18px 20px`, `display: flex; flex-direction: column; gap: 16px`. Accent = the "why" chip's color, or `#1e293b` when there's no chip; the pinned card uses `#C51162` and background `#17222f` with `1px solid #334155`.

**Header row** (`gap: 10px`, `min-height: 20px`): live state — 6px pulsing `#4ade80` dot + `Q3 4:22` (`700 12px`, `0.08em`, `#4ade80`); the "why" chip; spacer; then a **right cluster in its own flex box with `gap: 14px`** holding `Q1 Q2 Q3 Q4` labels (`600 11px`, `#94a3b8`, each `width: 21px`, centered, `gap: 9px`), a `1px × 16px` divider, and `TOT` (`600 11px`, `0.08em`, `#94a3b8`, `width: 48px`, right).

> The header cluster's gaps and widths **must match the team rows' cluster exactly** (`gap: 14px`, quarter cells `21px`/`gap: 9px`, divider `1px`, total `48px`) or the labels won't align over their values. This was a real defect in review.

The pinned card shows `PINNED` (`700 11px`, `0.1em`, `#f472b6`) before the clock. **No rank number** — an earlier version numbered the cards by interest rank and it read as part of the game state; it was removed.

**Team row** (one per team, away first, `gap: 14px`): crest `36px` → name block (city `500 13px` `#94a3b8` + record `500 12px` `#94a3b8` + momentum flame; team name below at `800 21px` `-0.02em` when winning or tied, else `600 21px` `#94a3b8`) → right cluster (`gap: 14px`): four quarter values (`600 15px`, `#cbd5e1`, current quarter `#f1f5f9`, unplayed `·` at `400 15px` `#64748b`, each `width: 21px` centered) · `1px × 24px` divider · total (`800 34px`, `width: 48px`, right, `#f8fafc` when winning/tied else `#94a3b8`).

**Win probability block** (`padding-top: 14px`, `border-top: 1px solid #1e293b`, `gap: 11px`):
- Row 1: away `ABBR NN%` (`14px`, `800` if favored else `600`, team text color) · a 6px bar split by the two teams' raw colors · home `NN% ABBR`.
- Row 2: `SWING` label (`600 11px`, `0.1em`, `#94a3b8`) · `▲ 7 PHI` (`700 13px`, favored team's text color) · a 130×24 trend polyline in the favored team's raw color over a `#1e293b` baseline.

**Last play** (`padding-top: 13px`, `border-top: 1px solid #1e293b`): `LAST PLAY` label (`600 11px`, `0.1em`, `#94a3b8`) + the play text (`400 14px`, `#cbd5e1`, single line, ellipsis).

---

### Component: Small card (`SMALL` density)

Grid: `repeat(4, minmax(0,1fr))`, `gap: 14px` → 286px per card. Card renders **179px**, uniform; 16 cards = 4 rows, roughly one screen.

Card: same surface treatment as the large card, `padding: 15px 17px`, `gap: 14px`.

**Header row** — `min-height: 18px` (fixed, so a card *without* a chip matches one with it; grid rows stretch to their tallest cell and this was a real defect): live dot + `Q3 4:22` (`700 10px`, `#4ade80`), spacer, one chip (`700 9px`). Pinned card: `PINNED` at `700 9px`.

**Team row** (`gap: 11px`): crest `26px` → city (`500 10px`, `#94a3b8`) over name (`700 15px` `#f8fafc` winning/tied, else `500 15px` `#94a3b8`) + record (`500 10px`, `#94a3b8`) + momentum flame → score (`800 26px`).

**Gauge — one line** (`padding-top: 12px`, `border-top: 1px solid #1e293b`, `gap: 9px`): a 3px bar split by both teams' raw colors · favored team `ABBR NN%` (`700 11px`, team text color) · `▲7` (`600 10px`, `#94a3b8`).

The small card deliberately carries **no pick control and no last-play line** — both were removed in review as too dense for this size.

---

### Component: Board footer

`padding: 11px 16px`, `#0f172a`, `1px solid #1e293b`. `RANKING` label (`600 11px`, `0.12em`, `#94a3b8`) + the rule in prose (`400 12px`, `#94a3b8`) + a right-aligned legend for the crest placeholder: `NO CREST YET` + a 16px dashed circle + `8 new teams`.

The legend exists only while teams 25–32 lack crests. Remove it when they have them.

---

## Ranking

Fixed order, no user control:

1. **The user's own game is pinned first**, visually separated (pink accent + `PINNED` label + tinted background). It never moves.
2. Then by interest: **tied games**, then **upsets**, then **one-score games**, then **margin**.
3. Ties in interest break toward **the game in the user's own league** (Corduroy / Flannel).

Recalculated on page load only. It must never re-sort while the user is watching — cards moving under the cursor was the specific thing being avoided.

## Interest signals ("why" chips)

One chip maximum per card, outlined: `700 9–10px`, `0.08em`, `1px solid <color>59`, `padding: 3px 5–6px`.

| Chip | Color | Meaning |
|---|---|---|
| `TIED` | `#4ade80` | Scores level |
| `1-SCORE` | `#4ade80` | Within one scoring play |
| `UPSET` | `#f97316` | Underdog leading (existing `isUpsetAlert`) |
| `FEATURED` | `#a78bfa` | Existing `isFeatured` |

The chip's color also sets the card's top border, which is the only place color enters the card frame.

## Interactions & Behavior

- The whole card is a link; clicking opens the existing game modal (`GameModalNew`).
- **Card hover** (`.plate`): `transition: border-color 140ms, background-color 140ms, transform 140ms`; `border-color: #475569`, `background: #1b2739`, `transform: translateY(-2px)`.
- **Possession** — a circular ring on the crest of the team with the ball: wrapper `border-radius: 50%`, `outline: 2px solid #fff`, `outline-offset: 2px`. (`GameCard.tsx` uses 3px; either is fine, keep one.) Cleared when the game is final.
- **Momentum** — the existing flame glyph beside the team name, colored by magnitude: `≥25` `#f97316`, `≥15` `#fb923c`, else `#fdba74`. Large card 14px, small card 12px.
- **Live values** — scores, clocks, win probability, last play all come from the websocket feed the current grid already uses. Score fields are fixed-width and tabular so updates never reflow.
- **Score change** — keep the existing 700ms flash (`score-updated`).
- **Win probability** — animate the bar widths and the swing figure on change (existing `transition: width 0.5s ease`).
- **Loading** — skeleton the cards at the chosen density, keep the toolbar in place.
- **Empty / not started** — the live pill should state the real situation rather than disappearing.
- **Responsive** was not designed; the prototype is a fixed 1440px desktop layout. Large → one across and Small → two across is the sensible collapse.

## State Management

- `density` — `'large' | 'small'`, persisted per user.
- Games list from `GamesContext` (16 simultaneous), plus per-game quarter scores for the large card's line score.
- `favoriteTeamId` — drives the pinned card and its accent color.
- Interest ranking computed once per load from score margin, tie state, `isUpsetAlert`, `isFeatured`, and league membership.

## Reuse from the existing codebase

Do not rebuild these — they already exist and were read while designing:

- **`GameCard.tsx`** — possession outline, momentum flame + thresholds, score-flash effect, win-probability bar, and `lightenColor()`. This is the component being restyled.
- **`GameCard.tsx` → `lightenColor(hex)`** — **required** for any team color used as *text*. See *Color correction* below.
- **`utils/colors.ts` → `effectiveAwayColor()`** — keeps the two bar halves distinguishable when both teams' primaries are similar. Apply it to the away half of every gauge.
- **`GameModalNew.tsx`** (~line 1484) — the existing per-quarter box score: `Q1–Q4` headers at `#64748b`, values at 15px `#cbd5e1`, via `formatScore()`. The large card's line score follows this scale and labelling; use `formatScore()` for the values.
- **`ScoreboardWeekNav.tsx`** — the `‹ Week N ›` selector. Reuse rather than rebuilding the toolbar's week control.
- **`GameGridNew.tsx`** — the fetch/sort/skeleton shell being replaced.

## Color correction (important)

Team primaries come from config and many are too dark to use as text on `#131e2f`. Two rules:

1. **Bar fills use the raw team color.**
2. **Any team color used as text** (the gauge percentages, the swing figure) must be corrected. `lightenColor()` alone is not sufficient — its 0.45 luminance target still leaves saturated magenta/violet/blue under 4.5:1 (PHI measured 4.41:1 on the pinned card). Run the lightened value through a loop that blends toward `#f8fafc` until the measured WCAG ratio clears **4.6:1 against both `#131e2f` and `#17222f`** (the pinned card's background). All 32 teams pass with this rule; several fail without it.

Apply it to **both** sides of the gauge. Coloring only the favored side leaves the two halves of the same number pair wildly mismatched in legibility.

## Design Tokens

**Backgrounds:** page `#070c15` · shell `#0b1220` · panel `#0f172a` · card `#131e2f` · pinned card `#17222f` · plate hover `#1b2739`

**Borders:** hairline `#1e293b` · raised `#334155` · hover `#475569`

**Text:** primary `#f8fafc` · strong `#f1f5f9` · body `#cbd5e1` · muted `#94a3b8` (**the floor for any label — anything dimmer failed contrast in review**) · placeholder/inactive `#64748b`

**Accents:** live `#4ade80` · upset `#f97316` · featured `#a78bfa` · pinned/own team `#f472b6` · own-team accent `#C51162` (from team data) · momentum `#f97316` / `#fb923c` / `#fdba74`

**Typography** — one family, Inconsolata (`pressStart` in the prototype), fallback `ui-monospace, monospace`.

| Role | Large card | Small card |
|---|---|---|
| Team name | `800/600 21px`, `-0.02em` | `700/500 15px`, `-0.015em` |
| Total score | `800 34px` | `800 26px` |
| Quarter value | `600 15px` | — |
| Quarter / TOT header | `600 11px` | — |
| City | `500 13px` | `500 10px` |
| Record | `500 12px` | `500 10px` |
| Clock | `700 12px` | `700 10px` |
| Gauge value | `800/600 14px` | `700 11px` |
| Swing | `700 13px` | `600 10px` |
| Section label | `600 11px`, `0.1em` | — |
| Last play | `400 14px` | — |
| Chip | `700 10px`, `0.08em` | `700 9px`, `0.08em` |

Toolbar: title `800 22px`; pills and labels `700 10px`, `0.1–0.12em`; week label `700 12px`.

**Numerics:** every score, clock, percentage and quarter value uses `font-variant-numeric: tabular-nums` in a fixed-width container.

**Radius:** none, except `border-radius: 50%` on crests, possession rings, and status dots.

**Shadows:** none. Depth is background steps and 1px borders. The pinned row/card accent uses `box-shadow: inset 3px 0 0` rather than a border, so it doesn't shrink the content box.

**`box-sizing: border-box`** on anything with both a border and an explicit size — the crest placeholder and the (removed) list rows were both wrong because of this.

## Team Data

All 32 teams come from `config.json` (`/Users/andrew/Projects/floosball`), index order = crest id. Several names in earlier drafts were wrong; these are authoritative:

| id | Team | Abbr | Primary | id | Team | Abbr | Primary |
|---|---|---|---|---|---|---|---|
| 1 | New York Strangers | NYS | `#1B5E20` | 17 | Las Vegas Residents | LVR | `#FFD700` |
| 2 | Boston Normals | BOS | `#FF8C00` | 18 | Anaheim Rhyme | ANA | `#00BFA5` |
| 3 | Philadelphia Broads | PHI | `#C51162` | 19 | St. Louis Wafflecones | STL | `#D4AF37` |
| 4 | Washington Monuments | WAS | `#FFB300` | 20 | Anchorage Truckers | ANC | `#455A64` |
| 5 | Pittsburgh Melons | PIT | `#FF4081` | 21 | Miami Neon | MIA | `#FF00B8` |
| 6 | Cleveland Rocks | CLE | `#B2FF59` | 22 | San Francisco Phones | SFP | `#0071E3` |
| 7 | Chicago Beans | CHI | `#B0BEC5` | 23 | Tampa Bay Bees | TAM | `#8E24AA` |
| 8 | Detroit Caddies | DET | `#FFD600` | 24 | Georgia Classics | GAC | `#3F51B5` |
| 9 | Minnesota Pops | MIN | `#582C83` | 25 | Los Angeles Extras | LAE | `#00838F` |
| 10 | Seattle Cranes | SEA | `#26C6DA` | 26 | Toronto Imaginaries | TOR | `#FF6F00` |
| 11 | Vancouver Pinecones | VAN | `#8BC34A` | 27 | Montreal Curd | MON | `#4A148C` |
| 12 | Colorado Oysters | COL | `#F06292` | 28 | Seoul Trains | SEO | `#90A4AE` |
| 13 | New Orleans Tuesdays | NOR | `#1A237E` | 29 | Hamburg Grillmeisters | HAM | `#F9A825` |
| 14 | Kansas City Slippers | KCS | `#C41E3A` | 30 | Mexico City Exoticos | MEX | `#8D6E63` |
| 15 | San Diego Sand Dollars | SND | `#29B6F6` | 31 | Buffalo Buffalo | BUF | `#0288D1` |
| 16 | Arizona Dry Heat | ARI | `#E64A19` | 32 | Salt Lake City Funk | SLC | `#00897B` |

Two leagues: **Corduroy** and **Flannel**.

**Crests exist for ids 1–24 only** (`public/avatars/<id>.png`). Teams 25–32 render a **neutral placeholder at the same size as a real crest**: `box-sizing: border-box`, `background: #0f172a`, `1px dashed #334155`, `border-radius: 50%`. It must match the real crest's layout box exactly (a content-box placeholder laid out 2px larger and shifted the team name — a real defect in review) and be circular, since every real crest is.

## Assets

- **Crests** — `assets/avatars/<teamId>.png` (1–24 exist).
- **League logo** — `assets/avatars/league_logo.png`.
- **Fonts** — Inconsolata 400/500/600/700/800, already in the codebase.
- **Icons** — inline SVG at 13–17px on a `20 × 20` viewBox in the prototype; substitute the codebase's `react-icons` equivalents. The momentum flame and possession ring already exist in `GameCard.tsx`.

## Decisions and rejected directions

Worth knowing so they don't get re-proposed:

- **A dense scoreboard table was built and rejected** — 16 rows read as chaotic even with wide rows. Cards won.
- **A `LIST` density was built and removed.** Only Large and Small remain.
- **Pick-em was removed from the cards.** It previously shared the win-probability bar. Keep it out; it lives in its own flow.
- **The last-play line was removed from the small card**, kept on the large one.
- **A "re-rank" button was removed** — refresh re-ranks.
- **The interest rank number was removed** from card headers — next to the clock it read as game state.
- **The sort control was removed** — the order is fixed.

## Screenshots

In `screenshots/`:

| File | What it shows |
|---|---|
| `01-board-large.png` | Full board at LARGE density, 16 games two-across |
| `02-board-small.png` | Full board at SMALL density, 16 games four-across, ~one screen |
| `03-card-large-anatomy.png` | The pinned large card at 4× — line score alignment, full gauge, swing trend, last play |
| `04-card-small-anatomy.png` | The pinned small card at 4× — the one-line gauge |

## Files

- `prototype/Game Board.dc.html` — the design. **Turn 5 (`5a` Large, `5b` Small) is the approved design**; turn 3 below it is a superseded iteration kept for context.
- `prototype/support.js` — design-tool runtime, needed only to open the prototype in a browser.
- `prototype/assets/` — fonts and crest images.
- `config.json` — the team data this was built from.

Open `prototype/Game Board.dc.html` in a browser; `5a` and `5b` are at the top.
