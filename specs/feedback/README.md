# Spec Feedback — Cody → StratPilot

This folder is Cody's (Code mode) channel for reporting issues back to StratPilot (Cowork).

## When Cody Writes Here

If Cody is implementing a spec and encounters any of these situations:
- A change in the spec **conflicts with** `DESIGN_SYSTEM.md`
- The implementation would **break an existing pattern** in another product
- The spec is **ambiguous** and Cody needs a design decision
- A **dependency** is missing or a file is in an unexpected state
- Cody has a **recommendation** for a better approach

## File Naming

`[spec-name]-feedback.md` — matching the spec filename.

Example: if implementing `portfolio-design-fixes.md` and hitting a conflict, write to `feedback/portfolio-design-fixes-feedback.md`.

## Format

```markdown
# Feedback: [Spec Name]
Date: [date]
Status: BLOCKED / QUESTION / RECOMMENDATION

## Issue
[Clear description of what was encountered]

## Context
[What Cody was implementing when this came up, what file, what line]

## Options
[Cody's analysis of possible approaches, if applicable]

## Recommendation
[What Cody thinks should happen, if it has a view]

## What Cody Did
[Did Cody implement a partial fix? Skip this part? Implement its best guess?]
```

## What Happens Next

StratPilot reads this file at the start of the next session. StratPilot and Milan discuss the issue and either update the spec, update the design system, or give Cody new instructions.
