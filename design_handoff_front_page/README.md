# Handoff: Front Page (signed-in landing)

## Overview

A redesign of the Floosball front page — the view a signed-in user lands on. It answers four questions in one screen: *what's happening right now*, *what happened in the league*, *who's worth watching*, and *how am I doing*. It deliberately does **not** reproduce the game board or standings; the left nav owns that navigation.

The design went through seven iterations in review. Earlier turns are preserved in the prototype file for context, but **only `7a` is the approved design.** Ignore sections labeled `1a`–`6a`.

## About the Design Files

The files in this bundle are **design references created in HTML** — a prototype showing intended look, structure, and behavior. They are **not production code to copy**. The task is to recreate this design inside the existing `floosball-react` codebase using its established patterns: existing components, existing data hooks, existing route structure, existing icon set (`react-icons`, per `src/utils/coresVisual.tsx`).

The prototype's HTML uses inline styles and a design-tool runtime (`support.js`, `<x-dc>`). None of that should ship. Read it for values and structure only.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and hierarchy are final. Recreate faithfully. Where the prototype's inline values conflict with an existing shared component in the codebase, prefer the shared component and flag the difference.

Copy strings in the prototype are **placeholder data**, not final copy — see *Content & Data Constraints* below, which is the most important section in this document.

---

## Screens / Views

### Front page — signed in

**Purpose:** orient a returning user in one screen; give them a live pulse, the league's news, a reason to click into stats, and a read on their own participation.

**Page frame (prototype is 1440px wide):**

| Region | Spec |
|---|---|
| Page background | `#070c15` |
| App shell background | `#0b1220`, `1px solid #1e293b` |
| Top header | full width, `padding: 14px 22px`, background `#0f172a`, `border-bottom: 1px solid #1e293b` |
| Left nav | `width: 196px`, background `#0f172a`, `border-right: 1px solid #1e293b`, `padding: 18px 0 22px` |
| Content area | `display: grid; grid-template-columns: minmax(0,1fr) 330px; gap: 30px; padding: 26px 28px 40px; align-items: start` |

Content order (main column): **Happening now** (spans both grid columns) → **League news** → **Worth watching**. Rail column: **Your team** → **Your numbers**.

There is no season-progress bar and no row of go-to buttons. Both were removed in review as redundant with the nav.

---

### Component: Top header

Left to right: league logo (`28px`, circular) + wordmark "Floosball" (`800 20px`, `-0.02em`, `#f1f5f9`) + `BETA` chip (`700 9px`, `#f59e0b` on `rgba(245,158,11,0.28)`, `padding: 3px 5px`); `1px × 22px` divider `#1e293b`; "Season 16" (`600 13px`, `#cbd5e1`); "Week 15 of 28" (`400 13px`, `#64748b`); **reigning champion** block; flexible spacer; search field; floobits balance; user chip.

**Reigning champion block** — replaced an "8 games live" pill in review. `border-left: 1px solid #334155`, `padding-left: 10px`: crest (`22px`) + team name (`500 15px`, `#f59e0b`) + trophy icon (`15px`, `#f59e0b`). Mirrors the existing `Navbar.js` champion treatment — reuse that component rather than rebuilding it.

Search field: `width: 196px`, background `#131e2f`, `1px solid #1e293b`, `padding: 7px 11px`, magnifier `13px #64748b`, placeholder "Teams, players, cards" (`400 12px`, `#64748b`).

Floobits: coin icon + value, `700 13px`, `#f59e0b`.

User chip: `.plate`, background `#131e2f`, `1px solid #1e293b`, `padding: 5px 10px 5px 6px`, avatar `22px` + username (`600 12px`, `#cbd5e1`).

---

### Component: Left nav

Two labeled groups. Group label: `700 10px`, `letter-spacing: 0.16em`, `#475569`, `padding: 0 18px 9px`.

**THE LEAGUE** — Front page (active), Games, Standings, Teams, Players.
**YOURS** — Broads (user's team), Prognostications, Fantasy, Cards, Achievements.

Item: `display: flex; align-items: center; gap: 11px; padding: 9px 18px`, icon `17px`, label `500 13px`, color `#94a3b8`, `border-left: 3px solid transparent`.
Active item: color `#f1f5f9`, background `rgba(56,189,248,0.10)`, `border-left: 3px solid #38bdf8`, label weight `700`.
Hover: color `#ffffff`.

Footer, pinned bottom: `400 10px/1.5`, `letter-spacing: 0.12em`, `#3f4c60`, `padding: 18px 18px 0` — instance id and sim version.

**Badge rules — this was decided explicitly in review and matters:**

- **Notification dot** — only on tabs that genuinely notify: **Achievements** and **the user's team**. Achievements shows a `5px` dot `#f59e0b` + count (`700 10px`, `#f59e0b`), `gap: 5px`. The team tab shows a bare `5px` dot `#f472b6` with no count (it's a state, not a queue).
- **Ambient count** — Games shows a plain count with no dot: `400 10px`, `#64748b`. It reports league activity, not something owed by the user.
- Prognostications, Cards, Fantasy carry **no badge**.
- Reserved: an **awards voting** tab appears at end of season and does notify. Not shown in this design (week 15). When it exists, it takes the notification-dot treatment.

Earlier drafts used filled blocky pills for all four; rejected as too loud. Do not reintroduce.

A "League news" nav item was removed — the front page *is* the news, so the two read as duplicates.

Note: `196px` is tight for "Prognostications" at `13px`. It fits, but there is no headroom. If labels are localized or lengthened, widen the rail rather than shrinking type.

---

### Component: Happening now (live scores band)

Spans both content columns. Section header: title `800 13px`, `letter-spacing: 0.1em`, `#f1f5f9`; live count (`700 9px`, `letter-spacing: 0.1em`, `#4ade80`) preceded by a `5px` `#4ade80` dot; a `flex: 1` rule `height: 2px` `#1e293b`; right link "GAME BOARD →" (`700 10px`, `letter-spacing: 0.08em`, `#38bdf8`). `margin-bottom: 12px`.

Body: `display: flex` on `#131e2f` with `1px solid #1e293b`. Five equal cells (`flex: 1`, `min-width: 0`), each `padding: 12px 15px`, separated by `border-right: 1px solid #1e293b` (none on the last).

Each cell, top to bottom (`gap: 9px`):
1. Status line: `5px` dot + clock text (`700 9px`, `letter-spacing: 0.12em`), both `#4ade80` for in-progress. Optional `YOURS` tag on the right (`700 9px`, `letter-spacing: 0.1em`, `#f472b6`).
2. Away team row, 3. Home team row: crest `18px` + name (`12px`, `letter-spacing: 0.04em`, truncating with ellipsis) + score (`800 15px`, `font-variant-numeric: tabular-nums`).

**Leader emphasis:** the leading side is `700` weight with name `#f1f5f9` and score `#f8fafc`; the trailing side is `400` with both `#94a3b8`.

**The user's own game** gets a tinted cell: `background: rgba(197,17,98,0.10)` (their team's primary at 10%) plus the `YOURS` tag.

Cells are links to the game.

Cell width at 1440px works out to ~236px. Team names must truncate, not wrap — the design shows city only ("Philadelphia", "San Francisco"), not full team names.

---

### Component: League news

Header: "LEAGUE NEWS" + rule + "ALL →" link. Container `#131e2f`, `1px solid #1e293b`.

**Lead item** (first row): `display: flex; gap: 16px; padding: 16px`, background `#0f172a`, `border-bottom: 1px solid #1e293b`.
- Left block: `width: 104px`, `#131e2f` with `1px solid #1e293b`, `padding: 14px 0`, centered — crest `44px` + conference name (`700 9px`, `letter-spacing: 0.12em`, `#94a3b8`).
- Right: meta row — category chip (`700 9px`, `letter-spacing: 0.12em`, `#0b1220` on the category color, `padding: 4px 7px`), week label (`700 9px`, `#64748b`), spacer, timestamp (`400 10px`, `#475569`).
- Headline: `800 20px/1.25`, `letter-spacing: -0.02em`, `#f8fafc`, `margin-top: 11px`, `text-wrap: balance`.
- Stat strip: four equal cells, `margin: 14px -14px 0`, `padding: 0 14px`, `border-right: 1px solid #1e293b` between. Value `800 19px` tabular-nums (`#f8fafc` neutral, `#4ade80` when positive); label `700 9px`, `letter-spacing: 0.12em`, `#64748b`, `margin-top: 7px`.

**Standard items** (rows 2–8): `display: flex; align-items: center; gap: 14px; padding: 12px 16px`, `border-bottom: 1px solid #1e293b` except last.
- `6px` category dot; category label (`700 10px`, `letter-spacing: 0.1em`, category color, fixed `width: 104px`); body text (`400 12px/1.45`, `#e2e8f0`, `flex: 1`, `text-wrap: pretty`); relative timestamp (`400 10px`, `#475569`).

**Category colors:** CLINCHED / STREAK `#22c55e`, MILESTONE / RECORD `#f59e0b`, ERRATIC `#c084fc`, RULE CHANGE `#2dd4bf`, SIGNING `#38bdf8`, INJURY `#f87171`.

---

### Component: Worth watching

Ranked leaderboard, `margin-top: 26px`. Header: "WORTH WATCHING" + rule + "ALL STATS →".

Eight rows on `#131e2f` / `1px solid #1e293b`. Row: `display: flex; align-items: center; gap: 12px; padding: 11px 16px`, `border-bottom: 1px solid #1e293b` except last.

Left to right: rank (`700 11px`, `#475569`, `width: 14px`, tabular-nums) · player avatar (`22px`, `border-radius: 50%`) · name (`800 13px`, `#f1f5f9`, nowrap) · optional relationship tag · position · team (`400 10px`, `letter-spacing: 0.08em`, `#64748b`) · spacer · five-star rating · stat label (`700 9px`, `letter-spacing: 0.12em`, `#64748b`, `width: 86px`, right-aligned) · stat value (`800 16px`, `#f8fafc`, tabular-nums, `width: 58px`, right-aligned).

Stars: `10px` glyphs, `gap: 1px`, filled `#f59e0b`, empty `#334155`.

**Relationship tags** (outlined, `700 9px`, `letter-spacing: 0.08em`, `padding: 3px 5px`, `1px solid <color>66`): `YOURS` in the user's team color (`#C51162` here) when the player is on their favorite team; `FANTASY` `#22c55e` when on their fantasy roster. These tags are the point of this module — they're why a leaderboard belongs on a personal landing page rather than only on the stats page.

Row count grew from 3 → 7 → 8 across review. Eight is the approved depth; three read as too thin.

---

### Component: Your team (rail)

Header: "YOUR TEAM" (`800 12px`, `letter-spacing: 0.1em`, `#e2e8f0`) + rule + "TEAM PAGE →".

Three stacked blocks, flush:

1. **Crest header** — background = team primary (`#C51162` for Philadelphia), `border-bottom: 3px solid` team secondary (`#00BCD4`), `padding: 13px 15px`. Crest `34px` + name (`800 18px`, `letter-spacing: -0.02em`, `#ffffff`) + record and standing (`700 10px`, `letter-spacing: 0.1em`, `rgba(255,255,255,0.85)`, `margin-top: 6px`).
2. **Live game plate** — `.plate`, background `rgba(56,189,248,0.08)`, `1px solid rgba(56,189,248,0.32)`, `padding: 13px 15px`, `margin-top: 2px`. Status line (`700 10px`, `letter-spacing: 0.14em`, `#38bdf8`), then opponent crest `30px` + name (`700 14px`, `#f1f5f9`) + score (`800 26px`, `#f8fafc`, tabular-nums). Hidden when the team isn't playing; show the next fixture in its place.
3. **Recent form** — `#131e2f`, `1px solid #1e293b`, `border-top: none`, `padding: 11px 15px 5px`. Summary line: "LAST SIX" (`700 10px`, `letter-spacing: 0.14em`, `#94a3b8`), record + next fixture (`400 10px`, `#cbd5e1`), point differential (`700 10px`, `#4ade80` / `#f87171`), `border-bottom: 1px solid #1e293b`. Then a `2 × 3` grid (`column-gap: 14px`) of six results: home/away marker (`@` / `vs`, `width: 12px`, `#94a3b8`) + opponent crest `15px` + abbreviation (`400 10px`, `letter-spacing: 0.06em`, `#cbd5e1`) + result (`700 11px`, `#4ade80` win / `#f87171` loss, tabular-nums). Row separator `1px solid #16202f`.

This was a full-width band at one point and was pulled back to a compact rail card in review. Keep it in the rail.

---

### Component: Your numbers (rail)

Header: "YOUR NUMBERS" + rule + "DETAIL →".

`#131e2f` / `1px solid #1e293b` containing a `2 × 2` grid of stat cells (`padding: 13px 14px`, internal `1px solid #1e293b` borders):

| Cell | Value | Label | Note |
|---|---|---|---|
| Fantasy | `148.2` — `800 24px`, `#f8fafc` | FANTASY POINTS | `7th of 148` — `700 10px`, `#4ade80` |
| Floobits | `1,240` — `800 24px`, `#f59e0b` | FLOOBITS | `+240 a week` — `#94a3b8` |
| Showcase | `B+` + `×1.15` (`700 12px`, `#94a3b8`) | SHOWCASE GRADE | `3 of 4 slots · 860 pts` |
| Prognostications | `3–1` (`#4ade80`) + `64%` (`#94a3b8`) | PROGNOSTICATIONS | `2 slots open · 2× live` |

Labels: `700 9px`, `letter-spacing: 0.12em`, `#64748b`, `margin-top: 7px`. Notes: `700 10px`, `margin-top: 6px`.

Footer action strip: `display: flex; gap: 6px; padding: 11px 12px`, `border-top: 1px solid #1e293b`, background `#0f172a`. Two equal buttons, `700 10px`, `letter-spacing: 0.08em`, `#0b1220` text, `padding: 9px 0`, centered: "CALL 2 SLOTS" on `#38bdf8`, "CLAIM 2 REWARDS" on `#f59e0b`. Buttons are conditional — render only when there's something to do, and drop the strip entirely when neither applies.

---

## Signed-out state

When not signed in, the rail's team card, Your numbers, and Worth watching's relationship tags are absent, and a sign-in panel takes the main column:

`#0f172a`, `1px solid #1e293b`, `border-bottom: 3px solid #38bdf8`, `padding: 26px 28px`. Eyebrow "SIGN IN" (`700 10px`, `letter-spacing: 0.16em`, `#38bdf8`); headline `800 30px/1.1`, `letter-spacing: -0.035em`, `#f8fafc`, `text-wrap: balance`; body `400 13px/1.65`, `#94a3b8`, `max-width: 560px`; button `700 11px`, `#0b1220` on `#38bdf8`, `padding: 11px 16px`.

Happening now and League news render identically for signed-out users.

---

## Content & Data Constraints

**Read this before implementing the lead story.** An earlier draft gave the lead item an authored headline and two sentences of editorial prose. That was rejected: nothing in the system publishes copy at that level of detail, and an automated version wouldn't reach it.

The approved lead item is **fully generatable from fields the sim already has**:

- Headline is a template: `{team.fullName} clinch a playoff berth` — one clause, one verb, no analysis. Every news category needs its own template of the same shape.
- Supporting content is **four numbers, not prose**: record, streak, conference seed, point differential. If a category has no meaningful four, use fewer cells or fall back to a standard row.
- No sentence in the lead may require a fact the sim doesn't already store as a field.

The same discipline applies to standard rows — each is a single templated clause.

**Live band** — five cells at 1440px. Selection order should be: the user's game first if one is live, then remaining live games (by closeness or by conference), then upcoming today. If fewer than five games are live, fill with upcoming ones and change the status line color/text accordingly. If nothing is live, the band should say so plainly rather than disappearing.

**Team data must come from the authoritative roster.** The prototype was corrected twice for invented teams. The league is 18 teams; crest files map by id (Team Page reference: `2` Boston Normals, `3` Philadelphia Broads, `8` Detroit Caddies, `9` Minnesota Blouses, `10` Seattle Cranes, `11` Vancouver Pinecones, `13` Austin Moonlight, `16` Arizona Dry Heat, `20` Portland Lattes, `22` San Francisco Phones, and so on). Player avatars are a **separate** id space from team crests — do not cross them.

---

## Interactions & Behavior

- Every row, cell, and card is a link. Nothing on this page is a form or an in-place mutation except the two rail action buttons, which navigate to their respective flows.
- **Row hover:** `background-color: rgba(255,255,255,0.04)`.
- **Plate hover** (live game plate, user chip, fantasy player chips): `transition: border-color 140ms ease, background-color 140ms ease, transform 140ms ease`; on hover `border-color: #475569`, `background: #1b2739`, `transform: translateY(-2px)`.
- **Link hover:** `#f1f5f9` → `#ffffff`.
- **Live values** (scores, clocks, live count, the live-game plate) update from the existing websocket feed. The prototype is static; wire these to the same source the game board uses. Score changes should not reflow layout — score fields are fixed-width and tabular.
- **Loading:** skeleton the module bodies, keep section headers and the grid in place so the page doesn't jump.
- **Empty states:** no live games → band shows a plain "no games running" line; no news → hide the module rather than showing an empty container; not signed in → see signed-out state.
- **Responsive** was not designed. The prototype is a fixed 1440px desktop layout. Below roughly 1100px the sensible collapse is: rail moves below the main column, live band scrolls horizontally, Worth watching drops the star column first, then the stat label.

## State Management

- `signedIn` — gates the rail's team card, Your numbers, the YOURS/FANTASY tags, and the YOURS band tint.
- Live game state (per-game score, quarter, clock, status) — subscribed, not fetched.
- Season context (season number, current week, total weeks, reigning champion) — already available to the existing Navbar.
- User context (favorite team, fantasy roster ids, floobits balance, open prognostication slots, showcase grade + filled slots, unclaimed achievement count).
- Feeds: league news (needs 1 lead + 7 rows), stat leaders (needs 8 with relationship flags resolved against the user's team and fantasy roster).

The relationship tags require the leaders response to be joined against user context client-side, or the endpoint to accept the user and return the flags.

## Design Tokens

**Backgrounds:** page `#070c15` · shell `#0b1220` · panel `#0f172a` · card `#131e2f` · plate hover `#1b2739`

**Borders:** hairline `#1e293b` · subtle `#16202f` · raised `#334155` · hover `#475569`

**Text:** primary `#f8fafc` · strong `#f1f5f9` · body `#e2e8f0` · secondary `#cbd5e1` · muted `#94a3b8` · dim `#64748b` · faint `#475569` · ghost `#3f4c60`

**Accents:** live/positive `#4ade80` · success `#22c55e` · info `#38bdf8` · warning `#f59e0b` · negative `#f87171` · anomaly `#c084fc` · rules `#2dd4bf` · cards `#c4b5fd` · own-team highlight `#f472b6`

**Team colors** come from team data, not tokens (Philadelphia: primary `#C51162`, secondary `#00BCD4`).

**Typography** — one family, `Inconsolata` (loaded as `pressStart` in the prototype), weights 400/500/600/700/800, fallback `ui-monospace, monospace`.

| Role | Spec |
|---|---|
| Wordmark | `800 20px/1`, `-0.02em` |
| Lead headline | `800 20px/1.25`, `-0.02em` |
| Card title | `800 18px/1`, `-0.02em` |
| Big stat | `800 24–26px/1`, tabular-nums |
| Mid stat | `800 19px/1`, tabular-nums |
| Score | `800 15–16px/1`, tabular-nums |
| Section header | `800 13px/1`, `0.1em` |
| Rail section header | `800 12px/1`, `0.1em` |
| Nav item | `500 13px/1` (active `700`) |
| Body | `400 12px/1.45` |
| Row label | `400 10–12px/1` |
| Stat label | `700 9px/1`, `0.12em` |
| Category label | `700 10px/1`, `0.1em` |
| Chip / tag | `700 9px/1`, `0.08–0.12em` |
| Nav group label | `700 10px/1`, `0.16em` |

**Spacing:** section gap `26px` · rail stack gap `22px` · grid gap `30px` · content padding `26px 28px 40px` · card padding `12–16px` · row padding `11–12px 15–16px` · rail cell padding `13px 14px`

**Radius:** none, except `border-radius: 50%` on player avatars and status dots. Square corners are the house style — do not add radii.

**Shadows:** none. Depth comes from background steps and 1px borders.

**Numerics:** every number that can change uses `font-variant-numeric: tabular-nums` and a fixed-width container.

## Assets

- **Team crests** — `assets/avatars/<teamId>.png`, already in the codebase.
- **Player avatars** — `assets/avatars/<playerId>.png`, separate id space from crests.
- **League logo** — `assets/avatars/league_logo.png`.
- **Fonts** — Inconsolata (400/500/600/700/800), already in the codebase.
- **Icons** — inline SVG in the prototype at `13–22px` on a `20 × 20` viewBox. Substitute the codebase's `react-icons` equivalents; do not port the prototype's paths.

## Screenshots

In `screenshots/`, all captured from the approved `7a` section:

| File | What it shows |
|---|---|
| `01-front-page-signed-in.png` | The full page at 1440px — the reference for overall composition and rhythm |
| `02-left-nav.png` | Left nav at 3× — read the badge treatment here (Achievements dot + count, Broads bare dot, Games plain count) |
| `03-happening-now.png` | Live scores band at 3× — leader emphasis and the tinted YOURS cell |
| `04-league-news.png` | News module at 3× — lead item with its four-stat strip, then standard rows |
| `05-worth-watching.png` | Leaderboard at 3× — column widths, star ratings, YOURS/FANTASY tags |
| `06-rail-team-and-numbers.png` | Rail at 3× — team card's three stacked blocks and the Your numbers grid |

No signed-out screenshot is included — open the prototype and switch the viewer control to see it. The spec for that state is in *Signed-out state* above.

## Files

- `prototype/Home Page.dc.html` — the design. **Only the `7a` section is approved**; `1a`–`6a` are superseded iterations kept for context.
- `prototype/support.js` — design-tool runtime. Required only to open the prototype in a browser; not part of the design.
- `prototype/assets/` — fonts and crest/avatar images used by the prototype.

Open `prototype/Home Page.dc.html` directly in a browser. The `7a` section is at the top. Use the viewer tweak to switch between signed-in and signed-out states.
