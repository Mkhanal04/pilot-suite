# Pilot Suite — Changelog

*This file is the communication bridge between StratPilot (Cowork) and Cody (Code mode).*

## How This Works

**Cody writes here after every commit/push.** Each entry documents what was deployed, which spec was executed, and any issues encountered. StratPilot reads this at the start of every session to understand what's been done without asking Milan.

**Format for each entry:**

```
## [Date] — [Brief description]
- **Spec:** `specs/[name].md` (or "ad hoc" if no spec)
- **Commit:** [hash]
- **Status:** DEPLOYED / PARTIAL / ROLLED BACK
- **Changes:** [bullet list of what changed]
- **Issues:** [any problems encountered, or "None"]
- **Design System:** [COMPLIANT / AMENDMENT NEEDED — describe if needed]
```

---

## Entries

*Most recent first.*

## 2026-03-07 — Portfolio light mode, spacing, visual cohesion, TalentPilot token alignment

- **Spec:** `specs/portfolio-design-fixes.md`
- **Commit:** see git log
- **Status:** DEPLOYED
- **Changes:**
  - Fix 1 (P0): Added `mode` to `useReveal` dependency (`page + slug + mode`) — light mode toggle no longer blanks all content
  - Fix 2: Desktop section padding reduced from 120px → 96px (per Tier 1 spacing scale); narrow container widened from 780px → 840px
  - Fix 3: "How I Work" section converted from single containing card with 3-column grid to individual cards per pillar, matching Story section's card pattern. Colored numbered indicators (01 blue, 02 green, 03 amber). Cards stack vertically with hover border accent.
  - Fix 4: TalentPilot token drift corrected — light `--text-2` #57534E→#78716C, light `--text-3` #78716C→#A8A29E, dark `--text-2` #9E9EA8→#8A8A95, dark `--text-3` #7A7A86→#5A5A66; hero headline 34px→36px, hero sub 15px→16px
- **Issues:** None — all changes within spec scope, no design system conflicts
- **Design System:** COMPLIANT — all changes align with Tier 1 spacing scale, Tier 2A card pattern, Tier 2B type scale

<!-- Cody: add new entries above this line -->
