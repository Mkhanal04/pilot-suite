# Build Spec: Portfolio Navigation Flow & UX Fixes
Date: March 7, 2026
Product: Portfolio Landing Page
Priority: P1-High

## Context
A full navigation flow audit of the portfolio site (pilot-suite-sigma.vercel.app) identified 4 issues affecting the user journey. The most critical: the scroll-reveal animation hides filtered content on the Work page, making it look like filters return zero results. Secondary: there's no way to launch a live prototype directly from the homepage cards — visitors have to click through to the detail page first. These fixes improve the experience for recruiters, hiring managers, and anyone Milan sends the link to directly.

## What to Build

### Fix 1: Scroll-reveal bug on filtered content (P1)
The `useReveal` hook uses IntersectionObserver to fade in elements with `[data-reveal]`. When the Work page filter changes (e.g., clicking "Case Studies"), the filtered cards are re-rendered already in the viewport. The observer is set up, but since the elements are already intersecting when observed, the callback may not fire reliably (browser-dependent). Result: cards stay at opacity 0.

**Fix:** In the `useReveal` hook (around line 98-107), after observing each element, check if it's already intersecting by using `entry.isIntersecting` in the initial observation. Alternatively, simpler approach: after setting up the observer, do an immediate check — for each `[data-reveal]` element, if its `getBoundingClientRect().top` is less than `window.innerHeight`, set opacity and transform immediately without animation.

Current code:
```javascript
function useReveal(dep) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; io.unobserve(e.target); } }),
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => { el.style.opacity = "0"; el.style.transform = "translateY(24px)"; io.observe(el); });
    return () => io.disconnect();
  }, [dep]);
}
```

Updated code — add an immediate check after observing:
```javascript
function useReveal(dep) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; io.unobserve(e.target); } }),
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      io.observe(el);
    });
    // Immediate check: reveal elements already in viewport (fixes filter/route-change race)
    requestAnimationFrame(() => {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          io.unobserve(el);
        }
      });
    });
    return () => io.disconnect();
  }, [dep]);
}
```

### Fix 2: Add dual CTA to homepage featured work cards (P2)
Currently the card footer shows: `[stats text]` on the left, `View details →` on the right. The entire card click goes to the detail page. There's no way to launch the prototype directly.

**Change:** Replace the footer row with two explicit CTAs. Keep "View details →" as a text link. Add "Try [Product] →" as a second text link that opens the app URL. The card click should still go to the detail page (no change to the `onClick` on the card wrapper).

Current footer (around line 372-375):
```jsx
<div style={{ paddingTop: 16, borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <span style={{ fontSize: 12, color: t.t2 }}>{product.stats.views} views · {product.stats.agents} agents · Guided tour</span>
  <span style={{ fontSize: 13, color: t.blue, fontWeight: 500 }}>View details →</span>
</div>
```

New footer:
```jsx
<div style={{ paddingTop: 16, borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <span style={{ fontSize: 12, color: t.t2 }}>{product.stats.views} views {"\u00b7"} {product.stats.agents} agents {"\u00b7"} Guided tour</span>
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <span style={{ fontSize: 13, color: t.t1, fontWeight: 500, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); go("detail", product.slug); }}>View details {"\u2192"}</span>
    <a href={product.appUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 13, color: t.blue, fontWeight: 500, textDecoration: "none", cursor: "pointer" }}>Try it {"\u2192"}</a>
  </div>
</div>
```

Key detail: Both CTAs need `e.stopPropagation()` so they don't also trigger the card-level `onClick`. The "Try it" link uses a standard `<a>` tag with `target="_blank"` so it opens the app in a new tab.

### Fix 3: Add "Try it" CTA to Work listing cards (P2)
Same pattern as Fix 2, but for the Work listing page grid cards (around line 442-461). Only show the "Try it" link on cards with `status === "live"` and an `appUrl`.

In the card's content area (around line 458, after the tags div), add a footer row:
```jsx
{item.appUrl && item.status === "live" && (
  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ fontSize: 12, color: t.t2 }}>{item.stats?.views || 0} views {"\u00b7"} {item.stats?.agents || 0} agents</span>
    <a href={item.appUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, color: t.blue, fontWeight: 500, textDecoration: "none" }}>Try it {"\u2192"}</a>
  </div>
)}
```

### Fix 4: Improve Coming Soon card treatment (P3)
Currently, coming soon cards just have `opacity: 0.6` and `cursor: default`. Add a visible "Coming Soon" badge and disable hover lift.

In the Work listing card render (around line 442), the status badge already renders via `statusBadge(item.status)`. Verify the `statusBadge` function returns a visible "Coming" badge. If not, ensure it does.

Additionally, add a subtle overlay or watermark for coming soon cards. In the card's content div, if `item.status === "coming"`, add after the title:
```jsx
{item.status === "coming" && (
  <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: t.t3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Prototype in progress</div>
)}
```

## Files to Modify
- `index.html` — All 4 fixes are in this single file (the entire portfolio is a single-file React SPA)

## Design Constraints
- Font stack: Newsreader (serif, headlines), Outfit (sans, body), JetBrains Mono (mono, labels/code)
- Color tokens are in the `themes` object at top of file — use `t.blue`, `t.t1`, `t.t2`, `t.border` etc.
- CTA text links should use `t.blue` for primary action, `t.t1` for secondary
- Keep the existing transition timing: `0.7s cubic-bezier(0.16,1,0.3,1)` for reveals
- "Try it →" is the preferred CTA label (not "Launch" — it's friendlier and lower-commitment)

## Acceptance Criteria
- [ ] On the Work page, clicking "Case Studies" filter immediately shows the Healthcare case study card (no blank space, no need to scroll to trigger)
- [ ] On the Work page, clicking "Products" filter immediately shows TradePilot and TalentPilot cards
- [ ] On the homepage, featured work cards show both "View details →" and "Try it →" in the footer
- [ ] Clicking "Try it →" on a homepage card opens the app in a new tab (does NOT navigate to the detail page)
- [ ] Clicking "View details →" on a homepage card navigates to the detail page
- [ ] Clicking the card body/preview area still navigates to the detail page (existing behavior preserved)
- [ ] On the Work listing page, live product cards show a "Try it →" link
- [ ] Coming soon cards (HealthPilot, AutoPilot) show "Prototype in progress" text and are NOT clickable
- [ ] All changes work in both dark and light theme modes
- [ ] No regressions on the Product Detail page or Case Study page

## What NOT to Do
- Do NOT change the iframe preview implementation (LiveAppPreview component) — it's working fine
- Do NOT change the card layout from stacked to side-by-side on the homepage
- Do NOT add live iframe previews to the Work listing page cards (they use the simpler AppWireframe component intentionally for performance — 5 cards × iframes would be heavy)
- Do NOT modify the Product Detail page or Case Study page layouts
- Do NOT change the `go()` routing function
- Do NOT change the allWork data array or any content
- Do NOT suppress the tour modal in iframe previews (that's separate tech debt)

## After Implementation
- Commit with message: "fix: portfolio nav flow — scroll-reveal bug, dual CTAs, coming soon treatment"
- Push to origin/main
- Verify deployment at pilot-suite-sigma.vercel.app
- Test: go to /Work page, click "Case Studies" filter — card should be visible immediately
- Test: on homepage, click "Try it →" on TradePilot card — should open /tradepilot/ in new tab
