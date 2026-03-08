# Pilot Suite — Design System Reference
*Last updated: March 7, 2026 (Session 3)*
*Status: ACTIVE — Code mode MUST read this before any UI changes*

## How This Document Works

This is the single source of truth for all visual design decisions across the Pilot Suite portfolio. It uses a three-tier model:

- **Tier 1 (Shared Foundation)** — Universal rules that apply to ALL products. Change these rarely and deliberately.
- **Tier 2 (Product Family)** — Rules specific to a product family. Currently two families: Portfolio and Pilot Apps (TradePilot, TalentPilot, future apps).
- **Tier 3 (Product-Specific)** — Overrides for individual products. Domain colors, hero gradients, unique components.

### Rules for Making Changes

1. **Before adding a new pattern**, check if an existing one covers the use case. Drift happens when patterns get duplicated with slight variations.
2. **If a spec introduces a new component or token**, it MUST explicitly state which tier it belongs to and whether it amends this document.
3. **Tier 1 changes affect everything.** They require Milan's approval and a migration plan for existing products.
4. **Tier 2 changes affect the family.** They require checking that other products in the family still look correct.
5. **Tier 3 changes are scoped.** They only affect one product and are the safest to make.

---

## Tier 1: Shared Foundation

These rules apply to Portfolio, TradePilot, TalentPilot, and all future products.

### Typography Strategy

Three font roles. No exceptions.

| Role | Font | Usage |
|------|------|-------|
| Display/Headlines | Serif family | Page titles, section headings, hero text, product names |
| Body/UI | Sans-serif family | Body text, navigation, buttons, form labels, descriptions |
| Labels/Code | JetBrains Mono | Section labels, status badges, metadata, code snippets |

**Note:** The specific serif and sans families differ by product family (Tier 2). JetBrains Mono is universal.

### Label Pattern

All section labels and meta-labels follow this exact pattern:
```
font-family: 'JetBrains Mono', monospace
font-size: 11px
font-weight: 500-600
letter-spacing: 0.12em
text-transform: uppercase
```

### Color Architecture

Every product uses the same semantic token structure, regardless of actual color values:

**Backgrounds (4 levels):**
| Token | Purpose |
|-------|---------|
| bg-0 | Page background |
| bg-1 | Card/surface background |
| bg-2 | Secondary surface, code blocks, input backgrounds |
| bg-3 | Tertiary surface, active states, dividers |

**Text (4 levels):**
| Token | Purpose |
|-------|---------|
| text-0 | Primary text — headings, important content |
| text-1 | Secondary text — body copy, descriptions |
| text-2 | Tertiary text — captions, helper text, inactive nav |
| text-3 | Quaternary text — placeholders, disabled states, separators |

**Borders:**
| Token | Purpose |
|-------|---------|
| border | Default border (subtle) |
| border-hover | Hover/focus state border (slightly stronger) |

**Semantic Accents (minimum set):**
| Token | Purpose |
|-------|---------|
| blue / blue-bg / blue-border | Primary accent, links, active states |
| green / green-bg / green-border | Success, live status, positive signals |
| amber / amber-bg / amber-border | Warning, attention, secondary accent |
| red / red-bg / red-border | Error, urgency, critical signals |

Products MAY add additional semantic colors (purple, teal) at Tier 3, following the same `color / color-bg / color-border` pattern.

### Dark/Light Mode

Every product MUST support both dark and light themes. The theme toggle:
- Persists user preference (localStorage)
- Defaults to dark
- Transitions smoothly (background/color transitions, not instant swap)
- **CRITICAL:** Theme changes must not break scroll-reveal or animation state. Any component that uses opacity-based animations must re-evaluate visibility when theme changes.

### Spacing Scale

Use only these spacing values. If a design needs something not on this scale, it's a signal to reconsider the layout.

```
4px   — tight (icon gaps, badge padding vertical)
8px   — compact (small gaps, tag spacing, inline padding)
12px  — default gap (card internal spacing, grid gaps, icon-to-text)
16px  — standard (section gaps, card padding, input padding)
20px  — comfortable (card padding, content blocks)
24px  — spacious (section padding horizontal, card padding large, container gutters)
32px  — section gap (between content groups within a section)
48px  — section padding (horizontal padding for main content areas)
80px  — section separator (vertical padding between major sections, mobile)
96px  — section separator (vertical padding between major sections, desktop)
```

**Important:** Previous portfolio code used 120px section padding. This is being reduced to 96px to address excessive whitespace. See migration notes below.

### Border Radius Scale

```
4px   — small (tags, inline badges)
6px   — default (buttons, inputs, filter pills)
8px   — medium (nav items, small cards, icon containers)
10px  — large-medium (hero cards, logo marks)
12px  — large (standard cards, modals, panels)
14px  — extra-large (feature cards, hero sections) — Pilot Apps only
```

**Rule:** Cards use 12px. Buttons and inputs use 6-8px. Tags and badges use 4-6px. Don't mix these.

### Shadow Scale (Pilot Apps only — Portfolio uses borders, not shadows)

```
shadow-sm:  0 1px 2px rgba(0,0,0, 0.04)    /* Light */ | rgba(0,0,0, 0.20)  /* Dark */
shadow-md:  0 4px 12px rgba(0,0,0, 0.06)    /* Light */ | rgba(0,0,0, 0.30)  /* Dark */
shadow-lg:  0 12px 32px rgba(0,0,0, 0.08)   /* Light */ | rgba(0,0,0, 0.40)  /* Dark */
```

Portfolio family uses border emphasis instead of shadows (border + borderHover on interaction). Do not add shadows to Portfolio components.

### Transition Timing

```
0.15s  — micro-interactions (filter button hover, color changes)
0.2s   — standard interactions (card hover, border changes, icon state)
0.3s   — layout shifts (sidebar collapse, nav transitions, border emphasis)
0.4s   — page-level (theme transition: background + color)
0.6-0.7s — reveals (scroll-reveal entrance animations)
```

**Easing curves:**
- Standard: `ease` or `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard)
- Entrance/reveal: `cubic-bezier(0.16, 1, 0.3, 1)` (overshoot for attention)
- Exit: `ease-out`

### Accessibility Minimums

- Touch targets: minimum 36x36px on mobile
- Color contrast: WCAG AA minimum (4.5:1 for body text, 3:1 for large text)
- Focus states: visible focus ring on all interactive elements
- Font size: minimum 13px for readable content, 11px only for labels/meta

### Responsive Breakpoints

```
< 640px   — Mobile (single column, collapsed nav, reduced padding)
640-1024px — Tablet (flexible, may show condensed desktop or expanded mobile)
> 1024px  — Desktop (full layout)
```

---

## Tier 2A: Portfolio Family

Applies to: `pilot-suite/index.html` (the portfolio/personal site)

### Typography

```
Display: 'Newsreader', Georgia, serif (ital, opsz 6-72, weights 400/500)
Body:    'Outfit', system-ui, sans-serif (weights 300-700)
Mono:    'JetBrains Mono', monospace (weights 400/500)
```

### Type Scale

```
Hero heading:     clamp(34px, 5vw, 50px) — Newsreader, 400 weight, -0.02em
Section heading:  clamp(24px, 3.2vw, 32px) — Newsreader, 400 weight, -0.015em
Card title:       18px — Newsreader, 400 weight
Body:             16px — Outfit, line-height 1.65
Caption:          13px — Outfit
Label:            11px — JetBrains Mono (see Tier 1 label pattern)
```

### Layout

```
Container max-width:  1080px, centered, 24px horizontal padding
Narrow max-width:     780px, centered (for text-heavy sections)
Section padding:      96px vertical desktop / 80px vertical mobile
```

**Visual style:** Editorial. Borders over shadows. Generous but not wasteful whitespace. Dark-first design with full light mode support.

### Portfolio-Specific Components

**Navigation:** Fixed top, 56px height, backdrop blur(16px), semi-transparent background. Items: 13px sans-serif, color transitions on hover/active.

**Section Divider:** 1px horizontal line using border token. Full container width. Replaces vertical spacing between major content sections.

**Scroll Reveal (`R` component):** Entrance animation — opacity 0→1 + translateY(24px→0), 0.7s with overshoot easing. Stagger via delay prop. Elements must re-evaluate on theme change and route change.

**Live App Preview (iframe):** iPad landscape viewport (1024x768), scaled to 0.62 desktop / 0.34 mobile. Bottom fade gradient to page background. Loading skeleton with product initials.

**Status Badge:** JetBrains Mono 10px, pill-shaped (12px radius), uses semantic color tokens (green=live, blue=completed, muted=coming).

**Card Pattern:** bg-1 background, 1px border, 12px radius. Hover: border darkens + translateY(-2px). No shadows.

---

## Tier 2B: Pilot Apps Family

Applies to: TradePilot (`pilot-suite/tradepilot/`), TalentPilot (`pilot-suite/talentpilot/`), and future Pilot Suite apps (HealthPilot, AutoPilot when built)

### Typography

```
Display: 'DM Serif Display', serif (400 weight)
Body:    'DM Sans', system-ui, sans-serif (ital, opsz 9-40, weights 300-700)
Mono:    'JetBrains Mono', monospace (weights 400/500)
```

### Type Scale

```
Hero heading:     36px — DM Serif Display, 400 weight
Hero sub:         16px — DM Sans, 400 weight
Section title:    24px — DM Serif Display, 400 weight, -0.02em
Card title:       14-16px — DM Sans, 500-600 weight
Body:             14px — DM Sans, line-height 1.5
Secondary text:   13px — DM Sans
Meta/small:       12px — DM Sans
Label:            11px — JetBrains Mono (see Tier 1 label pattern)
```

### Layout

```
Sidebar width:     240px (collapsed: 68px)
Main content:      fluid, 100vh height, scroll
Content padding:   48px horizontal desktop / 16px mobile
Section padding:   32px vertical
```

**Visual style:** Application. Shadows for elevation. Compact, information-dense. Sidebar navigation with collapsible sections. Light-first with full dark mode support.

### Pilot Apps Shared Components

**Sidebar:** Sticky left, full viewport height, border-right. Logo + nav sections + theme toggle at bottom. Collapse animation: 0.3s with Material easing. Nav items: 10px 12px padding, 8px radius, 12px icon-to-text gap.

**Hero Section:** Full-width gradient background (product-specific gradient at Tier 3). Stat cards in 4-column grid, glass-morphism style (rgba background + backdrop blur + 1px border).

**Decision Card:** Primary interactive element. 12-14px radius, shadow-md on rest, shadow-lg on hover. Border intensifies on hover. Contains: urgency bar (optional), body with title/description/amount, person indicator, action buttons.

**Filter Bar:** Horizontal row of filter buttons. 7px 14px padding, 6px radius. Active: bg-3 background + text-0 color. Standard: transparent + text-2.

**Metrics Bar:** Horizontal flex, bg-1 background, 1px border, 12px radius, shadow-sm. Individual metric items centered.

**Breadcrumb:** 10px 48px padding (desktop) / 8px 16px (mobile), border-bottom, 13px font. Current item: text-0 + 500 weight. Links: text-2 with hover to blue.

---

## Tier 3: Product-Specific Overrides

### TradePilot

**Domain:** Supply Chain
**Primary accent:** Blue (#2563EB)
**Hero gradient (light):** `linear-gradient(135deg, #1C1917 0%, #292524 100%)` — warm dark
**Hero gradient (dark):** `linear-gradient(135deg, #1E3A5F 0%, #1A1A2E 100%)` — cool blue-dark

**Domain colors:**
| Domain | Color token |
|--------|-------------|
| Trade | red |
| Logistics | blue |
| Payments | green |
| Sourcing | amber |
| Inventory | purple |

**Unique elements:** 5 AI agents, Glass Box transparency UI, decision lifecycle visualization

### TalentPilot

**Domain:** Recruiting
**Primary accent:** Blue (#2563EB) — same as TradePilot
**Hero gradient (light):** `linear-gradient(135deg, #0F1729 0%, #1B2A4A 60%, #1E3554 100%)` — cool navy
**Hero gradient (dark):** `linear-gradient(135deg, #0A1628 0%, #152238 100%)` — deep navy

**Domain colors:**
| Domain | Color token |
|--------|-------------|
| Match | blue |
| Pipeline | amber |
| Compliance | red |
| Signal | teal (additional token) |
| Offer | green |
| Bias | purple (additional token) |

**Unique elements:** Bias Dashboard, Pipeline Monitor, 4 AI agents, decision enrichment (not scoring)

### Portfolio

No Tier 3 overrides needed — Tier 2A covers all Portfolio-specific rules. The Portfolio is the only member of its family.

---

## Known Debt & Migration Notes

### Immediate Fixes Required (Session 3)

1. **Light mode broken (Portfolio):** `useReveal` dependency is `page + slug` but doesn't include `mode`. When theme toggles, React re-renders `R` components to opacity: 0, but `useReveal` doesn't re-run to reveal them. Fix: add `mode` to dependency → `useReveal(page + slug + mode)`.

2. **Section padding too large (Portfolio):** Currently 120px desktop. Reduce to 96px per Tier 1 spacing scale. Narrow container at 780px should widen to 840px to reduce horizontal dead space.

3. **Story vs How I Work visual inconsistency (Portfolio):** Story section uses individual bordered cards per chapter. How I Work uses a single containing card with 3-column grid and colored left-borders. These should use the same card pattern — recommend converting How I Work to individual cards per pillar, matching Story's treatment.

4. **TradePilot/TalentPilot text token drift:** TalentPilot uses different text-2 (#57534E light, #9E9EA8 dark) and text-3 (#78716C light, #7A7A86 dark) values than TradePilot. These should be unified to TradePilot's values since it was built first.

5. **Hero font size drift:** TradePilot uses 36px hero heading, TalentPilot uses 34px. TradePilot hero sub is 16px, TalentPilot is 15px. Standardize to TradePilot's values (36px / 16px).

### Future Considerations

- **AutoPilot:** May need additional Tier 3 rules for image-heavy layouts (car images, dealer photos). Evaluate when starting that product whether Pilot Apps family layout supports this or needs a new component.
- **HealthPilot:** Likely stays in Pilot Apps family. Will need healthcare-specific domain colors and potentially patient-record card components.
- **Cross-product navigation:** Currently each product is its own standalone SPA. Future work may add a shared nav shell that lets users move between Portfolio and apps. This would require a Tier 1 amendment for shared navigation patterns.
- **Portfolio-to-prototype transition:** Currently "Try it" opens a new tab. A smoother flow (overlay/modal with iframe, or shared nav shell) is a design session topic. Do not implement without Milan's sign-off on the approach.

---

## How to Use This Document

### For Cowork (writing specs):
1. Before speccing a UI change, identify which tier(s) it touches
2. Reference specific tokens and patterns by name in the spec
3. If the change needs a new pattern, include a "Design System Amendment" section in the spec
4. Include a "Design QA Checklist" at the end of the spec: what should be verified after implementation

### For Code (implementing specs):
1. Read this document before starting any UI work
2. Use only the tokens and patterns defined here
3. If a spec references a pattern not in this document, stop and ask — the spec may need updating
4. After implementation, verify: both themes work, spacing matches the scale, no new tokens were invented

### For Milan (reviewing):
1. If you see something that looks "off," check it against this doc
2. If the doc says it should look one way but it doesn't, that's a bug (file a spec)
3. If the doc doesn't cover the case, that's a design system gap (discuss with Cowork before spec'ing)
