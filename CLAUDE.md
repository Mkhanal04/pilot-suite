# pilot-suite — project instructions

This is Milan Khanal's portfolio site + embedded digital-twin RAG chatbot. Global rules in `~/.claude/CLAUDE.md` apply. Voice spec in `~/.claude/voice.md`. Infra lessons in `~/.claude/infra-playbook.md`.

Last updated 2026-04-24.

## First actions every session (always, in order)

1. Read the latest `.claude/handoff-*.md`
2. Read this file (verify dates below)
3. Read `~/.claude/projects/-Users-milankhanal-Desktop-PortFolio-Development-pilot-suite-repo/memory/MEMORY.md`
4. Then start work

## Stack snapshot (verified 2026-04-24)

| Layer | Tech | Notes |
|---|---|---|
| Hosting | Vercel | Preview auth bypass via `_vercel_jwt` cookie |
| DB | Supabase | RAG store + conversations + rate_limits + config tables |
| Embeddings | Gemini `gemini-embedding-001` at 1536-d | threshold 0.5, top_k 5 |
| Generation | Anthropic `claude-sonnet-4-5` | config stores `claude-sonnet-4-6`, MODEL_MAP resolves |
| Widget | Vanilla JS single file | `chatbot-widget.js`, no framework |
| Ingest | Node script | `scripts/ingest.js` reads `.env.local` via dotenv |

Detailed operational defaults (threshold rationale, UUID requirement, admin password handling) live in the `project_chatbot_defaults` memory file. Load it before touching config.

## URLs and environments

- Production: pending promotion (Milan decides)
- Preview: branch `feat/digital-twin-chatbot` on Vercel, token-bypass pattern `?x-vercel-protection-bypass=TOKEN&x-vercel-set-bypass-cookie=true`
- Admin panel: `/admin`, HTTP Basic Auth, creds in Vercel env (Sensitive flag ON, not in dotfiles)

## Dev commands

```
npm run dev         # python3 -m http.server 8765 (static only, no API)
npm run dev:full    # vercel dev (static + API, needs linked Vercel project)
npm run ingest      # node scripts/ingest.js (reads .env.local)
```

`npm run dev` does NOT run the API. Use `dev:full` to test chat end-to-end locally.

## Current work surface

Active branch: `feat/digital-twin-chatbot` (3 commits ahead of origin as of 2026-04-24)

Shipped this branch: RAG prototype + admin panel + Gemini embedding swap + em-dash scrub + emoji-input validation + intent routing (greeting + "tell me about yourself") + widget a11y/pill dedup/tightened answers.

Parked: SSE streaming (P0 next), starter chips UI, rate-limit countdown UI, chat history restore (v1.2), LLM query expansion (v1.2), markdown list support (v1.2), email opt-in endpoint refactor.

## Hard rules for this project

- **Zero em-dashes in any Milan-facing prose.** Includes chatbot replies, rendered HTML, commit messages, docs. Enforced by `refactor: enforce zero em-dash voice rule across rendered surfaces` commit.
- **No hardcoded intent-routing lists as the "smart" fix** for retrieval misses. The right move is LLM query expansion or threshold tuning. See memory `feedback_no_hardcoded_intent.md`.
- **Source citations in the widget must be non-interactive labels** (spans, not anchors). Anchors with `target=_blank` kill conversation momentum. See memory `feedback_widget_pill_ux.md`.
- **Every handoff lists 2-3 memory candidates for Milan to approve.** Do not auto-save.

## Pointers

- Session artifacts: `.claude/handoff-*.md`, `.claude/research-*.md`, `.claude/code-review-*.md`, `.claude/playwright-regression-*.md`
- Persistent memory: `~/.claude/projects/-Users-milankhanal-Desktop-PortFolio-Development-pilot-suite-repo/memory/MEMORY.md`
- Voice: `~/.claude/voice.md`
- Infra playbook (serverless + RAG + Vercel + Supabase): `~/.claude/infra-playbook.md`
