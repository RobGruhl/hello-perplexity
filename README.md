# hello-perplexity

Canonical reference for the Perplexity API. Clean client, runnable examples, docs.

**Perplexity is a search engine, not an LLM.** You have Claude for reasoning — Perplexity is for current web information with citations.

## Quick Start

```bash
cp .env.example .env      # add your pplx-... key
bun install
node examples/01-basic-search.js
```

## Two APIs

| Endpoint | What | Pricing | When |
|----------|------|---------|------|
| `/search` | Web search results + answer | $5/1K requests (flat) | Raw results, batch queries, date filtering |
| `/chat/completions` | Model-specific chat with search | Token-priced | Complex synthesis, reasoning, deep research |

## Models (Chat Completions only)

| Model | ID | Use case |
|-------|-----|----------|
| Sonar | `sonar` | Quick lookups (cheapest) |
| Sonar Pro | `sonar-pro` | Complex multi-source queries |
| Sonar Reasoning Pro | `sonar-reasoning-pro` | Chain-of-thought analysis |
| Sonar Deep Research | `sonar-deep-research` | Exhaustive reports (1-5 min) |

## Client Library

```js
import { search, chat, deepResearch, reason } from './lib/perplexity.js';

// Search API — flat rate, raw search results (no synthesized answer)
const { results, citations } = await search('query');

// Chat Completions — synthesized answer with citations
const r1 = await chat('query');                  // sonar-pro (default)
const r2 = await deepResearch('topic');          // 6 min timeout
const r3 = await reason('comparison');           // chain-of-thought
// r1.answer, r1.citations, r1.raw

// Explicit API key (vs env var)
import { createClient } from './lib/perplexity.js';
const pplx = createClient('pplx-...');
await pplx.search('query');
```

## Examples

| # | File | What |
|---|------|------|
| 01 | `basic-search.js` | Simplest Search API call |
| 02 | `domain-filtering.js` | Allow/block domains |
| 03 | `date-filtering.js` | Recency + date range + spoiler safety |
| 04 | `chat-completions.js` | Chat API, system prompts, search modes |
| 05 | `deep-research.js` | Exhaustive multi-source reports |
| 06 | `reasoning.js` | Chain-of-thought with search |
| 07 | `streaming.js` | SSE streaming responses |
| 08 | `structured-output.js` | JSON Schema responses |
| 09 | `openai-sdk-compat.js` | Using OpenAI SDK with Perplexity |
| 10 | `parallel-search.js` | Concurrent search queries |

## Docs

- [API Reference](docs/01-api-reference.md) — Both endpoints, auth, request/response shapes
- [Models](docs/02-models.md) — Model comparison + selection decision tree
- [Parameters](docs/03-parameters.md) — Every parameter with examples and gotchas
- [MCP Setup](docs/04-mcp-setup.md) — Using Perplexity as MCP tools for Claude
- [Patterns](docs/05-patterns.md) — Domain filtering, spoiler safety, authority tiers, parallel search
- [Pricing](docs/06-pricing.md) — Cost per endpoint/model, optimization strategies

## Used In

- **[no-spoiler-cycling](../no-spoiler-cycling)** — Search API with domain filtering, date ranges, spoiler-safe queries
- **[lancer-rules-lawyer](../lancer-rules-lawyer)** — Search API with authority tier detection
- **[hello-claude-claw](../hello-claude-claw)** — Chat Completions via MCP tools (ask + deep_research)
