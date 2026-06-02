# hello-perplexity

Canonical reference for the Perplexity API. Clean client, runnable examples, docs.

**Perplexity is a search engine, not an LLM.** You have Claude for reasoning — Perplexity is for current web information with citations.

> ## 🔎 House rule: use the Search API only
> In this setup we use **`search()`** and nothing else. The **Chat Completions (sonar) models are intentionally not used** — Claude does the reasoning and synthesis from raw search results.
> - `search()` is flat-rate ($5/1K requests), returns raw results + citations, and is fast.
> - It avoids the chat 30s-timeout gotcha entirely.
> - The `chat()` / `reason()` / `deepResearch()` functions remain in the lib for **API-reference completeness only** (and because other projects copy this lib) — don't reach for them here.

## Quick Start

```bash
cp .env.example .env      # add your pplx-... key
bun install               # installs dotenv (examples use `import 'dotenv/config'`)
node examples/01-basic-search.js
```

> Ad-hoc scripts must load the key themselves — either `import 'dotenv/config';` at the top (the examples' pattern) or run with `node --env-file=.env script.mjs`. The lib does **not** auto-load `.env`.

## The Search API (`/search`)

Flat-rate web search ($5/1K requests). No model. Returns raw results (`title`, `url`, `snippet`) + citations. Supports batch queries (array of up to 5 strings), domain filtering, and date ranges.

```js
import 'dotenv/config';
import { search } from './lib/perplexity.js';

const { results, citations } = await search('your query');
results.forEach(r => console.log(r.title, r.url, r.snippet));

// Explicit API key (vs env var)
import { createClient } from './lib/perplexity.js';
const pplx = createClient('pplx-...');
await pplx.search('query');
```

There is no synthesized `answer` field from `/search` — that's by design. Hand the `results` + `citations` to Claude for synthesis.

## Examples

| # | File | What |
|---|------|------|
| 01 | `basic-search.js` | Simplest Search API call |
| 02 | `domain-filtering.js` | Allow/block domains |
| 03 | `date-filtering.js` | Recency + date range + spoiler safety |
| 10 | `parallel-search.js` | Concurrent search queries |

*Search-only examples. (04 chat-completions, 05 deep-research, 06 reasoning, 07 streaming, 08 structured-output, 09 openai-sdk-compat remain on disk as Chat-API references but are **not used here** — see House rule above.)*

## Docs

- [API Reference](docs/01-api-reference.md) — Both endpoints, auth, request/response shapes
- [Models](docs/02-models.md) — Model comparison (Chat API reference only)
- [Parameters](docs/03-parameters.md) — Every parameter with examples and gotchas
- [MCP Setup](docs/04-mcp-setup.md) — Using Perplexity as MCP tools for Claude
- [Patterns](docs/05-patterns.md) — Domain filtering, spoiler safety, authority tiers, parallel search
- [Pricing](docs/06-pricing.md) — Cost per endpoint/model, optimization strategies

## Used In

- **[no-spoiler-cycling](../no-spoiler-cycling)** — Search API with domain filtering, date ranges, spoiler-safe queries
- **[lancer-rules-lawyer](../lancer-rules-lawyer)** — Search API with authority tier detection
- **[hello-claude-claw](../hello-claude-claw)** — Chat Completions via MCP tools (ask + deep_research)
