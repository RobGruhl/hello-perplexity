# hello-perplexity

Canonical Perplexity API reference. Clean client, runnable examples, docs.

## ⚠️ House rule: Search API + Agent API (Claude), never Sonar

Use **`search()`** (raw results, Claude reasons over them) and/or **`agent()`** (a third-party frontier model — default **Claude Sonnet 4.6** — with web search). Do NOT use `chat()`, `reason()`, or `deepResearch()` (the Perplexity **sonar** models). They stay in the lib for API-reference completeness and downstream copies, but they're not the path here.

- `search()` — `/search`, flat-rate, raw results + citations, fast. Returns `{ results, citations, raw }`.
- `agent()` — `/v1/agent`, OpenAI `/v1/responses`-compatible, `model: anthropic/claude-sonnet-4-6` default, `tools:[{type:'web_search'}]`. Returns `{ answer, results, citations, usage, raw }`. Answer lives in `output[] (type:message).content[].text`; sources in `output[] (type:search_results).results[]`. ~$0.015–0.02/call (Sonnet + 1 search). Default timeout 120s.
- Model ids in `AGENT_MODELS` (`CLAUDE_SONNET`/`CLAUDE_OPUS`/`CLAUDE_HAIKU`). Verified against docs.perplexity.ai/docs/agent-api + a live test.

## File Map

```
lib/constants.js     — Models, endpoints, defaults, pricing reference
lib/perplexity.js    — Canonical client: search(), agent(), chat(), deepResearch(), reason(), createClient()
examples/01-10       — Runnable examples (node examples/01-basic-search.js)
docs/01-06           — API reference, models, parameters, MCP, patterns, pricing
```

## Two APIs

1. **Search API** (`/search`) — flat-rate web search ($5/1K requests). No model. Returns raw search results (no synthesized answer).
2. **Chat Completions** (`/chat/completions`) — OpenAI-compatible, token-priced. Model required. Returns synthesized answer + citations.

Client returns: `search()` → `{ results, citations, raw }`, `chat()` → `{ answer, citations, raw }`.

## Key Gotchas

- Domain filter is one array: positive entries = allow, `-prefixed` = block. Max 20.
- Date filters use ISO format (`YYYY-MM-DD`) with the newer param names (`search_after_date_filter`).
- Streaming: citations arrive in the **final** SSE chunk, not incrementally.
- Deep research takes 1-5 minutes. Default timeout is 360s.
- `response_format` with `strict: true` requires `additionalProperties: false` on all schema objects.
- The Search API supports batch queries (array of up to 5 strings). Chat does not.
- The Search API has NO `answer` field — it returns raw results with `snippet` content. The old cycling code's `result.answer` was always null.

## Distilled From

| Project | What it contributed |
|---------|-------------------|
| no-spoiler-cycling | Search API patterns: domain filter, date ranges, parallel search, spoiler safety |
| lancer-rules-lawyer | Authority tier detection, community search pattern |
| hello-claude-claw | Chat Completions API, MCP tool wrapping, AbortSignal.timeout |

## Copy to New Project

1. Copy `lib/constants.js` and `lib/perplexity.js`
2. `bun install dotenv`
3. Add `PERPLEXITY_API_KEY` to `.env`
4. Import what you need:
   ```js
   import 'dotenv/config';
   import { search, chat, deepResearch, reason } from './lib/perplexity.js';
   ```
5. Add project-specific wrappers on top (domain lists, query templates, etc.)

## Running Examples

```bash
node examples/01-basic-search.js    # Search API smoke test
node examples/04-chat-completions.js # Chat API smoke test
node examples/05-deep-research.js    # Deep research (slow, 1-5 min)
```

All examples use `dotenv/config` and expect `PERPLEXITY_API_KEY` in `.env`.
