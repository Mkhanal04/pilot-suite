# Build Spec: Portfolio Design Fixes (Light Mode, Spacing, Visual Cohesion)
Status: IMPLEMENTED
Date: March 7, 2026
Product: Portfolio
Priority: P1-High
Design System Reference: `pilot-suite/DESIGN_SYSTEM.md` — READ THIS FIRST

## Context

Milan reviewed the live portfolio site (pilot-suite-sigma.vercel.app) and identified four issues that undermine the portfolio's credibility — especially since the portfolio's thesis is "design once, apply across domains." These fixes bring the Portfolio into compliance with the newly documented design system.

All changes are in **Tier 2A (Portfolio Family)** unless noted otherwise. No changes affect TradePilot or TalentPilot.

---

## Fix 1: Light Mode Broken (P0 — Critical)

### What's Wrong
Clicking the theme toggle (sun/moon icon in nav) switches to light mode, but ALL page content disappears. Only the nav bar remains visible. Toggling back to dark mode also loses content — requires a full page reload to recover.

### Root Cause
The `useReveal` hook (line ~98-114) uses `page + slug` as its dependency. When `mode` changes (dark→light), React re-renders all `<R>` components, which resets their inline `opacity` to `0` and `transform` to `translateY(24px)`. But `useReveal` doesn't re-run because its dependency (`page + slug`) hasn't changed. So all `[data-reveal]` elements stay at `opacity: 0`.

### The Fix
In the `Portfolio` component (line ~234), change:
```javascript
useReveal(page + slug);
```
to:
```javascript
useReveal(page + slug + mode);
```

This makes the reveal hook re-run whenever the theme changes, re-observing all elements and immediately revealing those in the viewport.

### Acceptance Criteria
- [ ] Toggle to light mode: ALL page content is visible (hero, story, how I work, featured work, thesis, contact)
- [ ] Toggle back to dark mode: ALL content remains visible
- [ ] Scroll-reveal animations still work on first page load (elements below fold animate in on scroll)
- [ ] Theme toggle on inner pages (Work, Product Detail) also works without losing content
- [ ] Light mode colors match the `themes.light` object: bg `#FAFAFA`, text-0 `#18181B`, text-1 `#52525B`

---

## Fix 2: Section Padding Too Large

### What's Wrong
There is excessive vertical whitespace between sections, especially between the hero and "The Story" section. On desktop, the gap feels like a full viewport of dead space. The narrow text container (780px) inside the 1080px max-width page also creates excessive horizontal dead space on wide screens.

### Design System Reference
Per `DESIGN_SYSTEM.md` Tier 1 Spacing Scale:
- Section separator desktop: **96px** (currently 120px)
- Section separator mobile: **80px** (already correct)

Per Tier 2A Layout:
- Narrow max-width: **840px** (currently 780px — widening to reduce horizontal dead space)

### The Fix
In the `s` styles object (line ~246-254):

1. Change `section` padding:
```javascript
// FROM:
section: { padding: isMobile ? "80px 20px" : "120px 24px" },
// TO:
section: { padding: isMobile ? "80px 20px" : "96px 24px" },
```

2. Change `narrow` max-width:
```javascript
// FROM:
narrow: { maxWidth: 780, margin: "0 auto" },
// TO:
narrow: { maxWidth: 840, margin: "0 auto" },
```

### Acceptance Criteria
- [ ] Desktop: sections feel tighter without feeling cramped. The hero-to-Story gap should be noticeably reduced.
- [ ] Mobile: no change (already 80px)
- [ ] Text in narrow containers fills more of the horizontal space on wide screens
- [ ] No content overlaps or collisions from the reduced padding

---

## Fix 3: Story vs How I Work Visual Inconsistency

### What's Wrong
"The Story" section uses individually bordered cards per chapter (01, 02, 03) with full-width card containers and pill-style tags inside each card. "How I Work" uses a single containing card with a 3-column grid and colored left-border accents. The visual language between these two adjacent sections is different enough to feel like they were designed by different people.

### The Fix
Convert "How I Work" from a single card with 3-column grid to individual cards per pillar, matching the Story section's treatment. Each pillar card should:

1. Be its own bordered card (same `s.card` pattern: `background: t.bg1`, `border: 1px solid ${t.border}`, `borderRadius: 12`)
2. Use a numbered indicator like Story (01, 02, 03) with the pillar's color accent
3. Have a bold title + italic subtitle pattern (e.g., **"Discover with Software"** *The Starting Point*)
4. Contain the description text
5. Stack vertically (not in a 3-column grid) — this matches the Story section's single-column card stack

**Keep the section header** ("HOW I WORK" label + "Prototype-First Discovery" heading). Just change the card layout below it.

**Keep the colored accent** — but move it from a left-border on inner columns to the numbered indicator (matching how Story uses colored numbers for 01, 02, 03). Use `t.blue` for 01, `t.green` for 02, `t.amber` for 03.

### Design System Reference
Per `DESIGN_SYSTEM.md` Tier 2A Card Pattern:
- Background: bg-1
- Border: 1px solid border token
- Border radius: 12px
- Hover: border darkens + translateY(-2px) — optional for these info cards (not clickable)

### Acceptance Criteria
- [ ] "How I Work" section uses the same card-per-item visual pattern as "The Story" section
- [ ] Each pillar is its own card with consistent padding, border, and radius
- [ ] Numbered indicators (01, 02, 03) with colored accents match Story section's approach
- [ ] Both sections feel like they belong to the same page design
- [ ] Content text for each pillar is preserved exactly — no copy changes
- [ ] Mobile: cards stack naturally (single column, same as Story)

---

## Fix 4: TradePilot / TalentPilot Token Drift

### What's Wrong
TalentPilot has drifted from TradePilot's token values in several places. Since these products are in the same design family (Tier 2B: Pilot Apps), they should share identical base tokens.

### Differences Found
| Token | TradePilot | TalentPilot | Correct Value |
|-------|-----------|-------------|---------------|
| --text-2 (light) | #78716C | #57534E | #78716C (TradePilot) |
| --text-3 (light) | #A8A29E | #78716C | #A8A29E (TradePilot) |
| --text-2 (dark) | #8A8A95 | #9E9EA8 | #8A8A95 (TradePilot) |
| --text-3 (dark) | #5A5A66 | #7A7A86 | #5A5A66 (TradePilot) |
| Hero heading size | 36px | 34px | 36px |
| Hero sub size | 16px | 15px | 16px |

### The Fix
In `talentpilot/index.html`, update the CSS custom properties and hero styles to match TradePilot's values:

1. In the `[data-theme="light"]` section, change `--text-2` to `#78716C` and `--text-3` to `#A8A29E`
2. In the `[data-theme="dark"]` section, change `--text-2` to `#8A8A95` and `--text-3` to `#5A5A66`
3. In the hero section styling, change heading font-size from 34px to 36px
4. In the hero section styling, change sub-text font-size from 15px to 16px

### Design System Reference
Per `DESIGN_SYSTEM.md` Tier 2B Type Scale:
- Hero heading: 36px
- Hero sub: 16px

### Acceptance Criteria
- [ ] TalentPilot text-2 and text-3 colors match TradePilot exactly in both themes
- [ ] TalentPilot hero heading is 36px
- [ ] TalentPilot hero sub-text is 16px
- [ ] No visual regressions in TalentPilot (all text remains readable, contrast ratios maintained)
- [ ] TradePilot is unchanged

---

## Files to Modify

- `pilot-suite/index.html` — Fixes 1, 2, and 3 (Portfolio)
- `pilot-suite/talentpilot/index.html` — Fix 4 (TalentPilot token alignment)

## Critical: Design System Governance

**Before implementing, read `pilot-suite/DESIGN_SYSTEM.md` in full.** This is the visual contract. If any change in this spec conflicts with the design system, or if implementing a fix would break an existing pattern defined in the design system, STOP and report the conflict. Do not improvise a solution — flag it so Cowork and Milan can make the design decision.

**Do not invent new components, tokens, or patterns.** Use only what's defined in the design system. If the spec asks for something that doesn't exist in the design system, implement the closest match and note the gap.

**Reference the design-system.html page** (`pilot-suite/design-system.html`) for visual reference of what components should look like. The Chapter Card component shown there is the approved pattern for Fix 3.

## What NOT to Do

- Do NOT change TradePilot (`pilot-suite/tradepilot/index.html`) — it's the reference implementation
- Do NOT add new CSS custom properties to the Portfolio — it uses JS theme objects, not CSS variables
- Do NOT change any content/copy — these are purely visual/structural fixes
- Do NOT change the theme toggle mechanism (the sun/moon button) — only the `useReveal` dependency
- Do NOT add shadows to Portfolio components — Portfolio uses border emphasis, not shadows (Tier 2A rule)
- Do NOT change the 80px mobile section padding — only desktop changes from 120px to 96px

## After Implementation

- Commit with message: "fix: portfolio light mode, section spacing, story/how-i-work cohesion, talentpilot token alignment"
- Push to origin/main
- Verify deployment at pilot-suite-sigma.vercel.app
- **Verification checklist:**
  1. Toggle light mode on homepage — all content visible?
  2. Toggle back to dark — content still there?
  3. Scroll through homepage — section spacing feels tighter?
  4. Story and How I Work sections — do they look like siblings now?
  5. Open TalentPilot — hero heading same size as TradePilot's?
  6. Toggle TalentPilot light/dark — text colors consistent with TradePilot?
