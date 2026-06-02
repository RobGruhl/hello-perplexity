/**
 * Canonical Perplexity client
 *
 * Distilled from three projects:
 *   no-spoiler-cycling  — Search API with domain filtering, date ranges
 *   lancer-rules-lawyer — Search API with authority tiers
 *   hello-claude-claw   — Chat Completions via MCP (sonar-pro, sonar-deep-research)
 *
 * Design rules:
 *   - No console.log (callers decide logging)
 *   - Throws on error (callers decide error handling)
 *   - Unified { answer, citations, raw } return shape
 *   - AbortSignal.timeout on all requests
 */

import {
  BASE_URL,
  ENDPOINTS,
  MODELS,
  AGENT_MODELS,
  DEFAULTS,
} from './constants.js';

// -- Internal request helpers --

function resolveKey(apiKey) {
  const key = apiKey || process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY not set (pass to createClient or set env var)');
  return key;
}

async function request(endpoint, body, { apiKey, timeoutMs }) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resolveKey(apiKey)}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Perplexity ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Build domain filter array from separate allow/block lists.
 * Perplexity uses a single array where blocked domains are prefixed with "-".
 */
function buildDomainFilter(allowDomains, blockDomains) {
  const filter = [];
  if (allowDomains?.length) filter.push(...allowDomains);
  if (blockDomains?.length) filter.push(...blockDomains.map(d => `-${d}`));
  return filter.length ? filter : undefined;
}

// -- Search API (/search) --

/**
 * Search the web via Perplexity's Search API.
 * Flat-rate pricing ($5/1K requests). No model selection.
 *
 * @param {string|string[]} query - Search query or array of queries
 * @param {object} [opts]
 * @param {number} [opts.maxResults=10]
 * @param {number} [opts.maxTokens=10000]
 * @param {number} [opts.maxTokensPerPage=4096]
 * @param {string[]} [opts.allowDomains] - Only include these domains
 * @param {string[]} [opts.blockDomains] - Exclude these domains (prefixed with "-")
 * @param {string} [opts.recency] - hour|day|week|month|year
 * @param {string} [opts.startDate] - ISO date string (search_after_date_filter)
 * @param {string} [opts.endDate] - ISO date string (search_before_date_filter)
 * @param {string} [opts.country] - ISO country code
 * @param {string[]} [opts.languages] - ISO 639-1 language codes
 * @param {string} [opts.searchMode] - web|academic|sec
 * @param {number} [opts.timeoutMs=30000]
 * @param {string} [opts.apiKey] - Override env var
 * @returns {Promise<{results: object[], citations: string[], raw: object}>}
 */
export async function search(query, opts = {}) {
  const body = { query };

  if (opts.maxResults) body.max_results = opts.maxResults;
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.maxTokensPerPage) body.max_tokens_per_page = opts.maxTokensPerPage;

  const domainFilter = buildDomainFilter(opts.allowDomains, opts.blockDomains);
  if (domainFilter) body.search_domain_filter = domainFilter;

  if (opts.recency) body.search_recency_filter = opts.recency;
  if (opts.startDate) body.search_after_date_filter = opts.startDate;
  if (opts.endDate) body.search_before_date_filter = opts.endDate;
  if (opts.country) body.country = opts.country;
  if (opts.languages) body.search_language_filter = opts.languages;
  if (opts.searchMode) body.search_mode = opts.searchMode;

  const raw = await request(ENDPOINTS.SEARCH, body, {
    apiKey: opts.apiKey,
    timeoutMs: opts.timeoutMs ?? DEFAULTS.CHAT_TIMEOUT_MS,
  });

  const results = raw.results ?? [];

  return {
    results,
    citations: results.map(r => r.url),
    raw,
  };
}

// -- Agent API (/v1/agent) — third-party frontier models + web search --

/**
 * Ask a third-party frontier model (default: Claude Sonnet 4.6) with Perplexity
 * web-search grounding. This is the "Claude Sonnet, with live search + citations"
 * path — NOT a Perplexity Sonar model. OpenAI /v1/responses-compatible.
 * Token-priced at direct provider rates ($3/M in, $15/M out for Sonnet) + per-search.
 *
 * @param {string} query - The question (sent as `input`)
 * @param {object} [opts]
 * @param {string} [opts.model=anthropic/claude-sonnet-4-6] - Any Agent API model id
 * @param {boolean} [opts.webSearch=true] - Attach the web_search tool
 * @param {string} [opts.instructions] - System guidance
 * @param {number} [opts.maxOutputTokens]
 * @param {number} [opts.temperature]
 * @param {string} [opts.toolChoice] - auto|none|required
 * @param {number} [opts.timeoutMs=120000]
 * @param {string} [opts.apiKey]
 * @returns {Promise<{answer: string, results: object[], citations: string[], usage: object, raw: object}>}
 */
export async function agent(query, opts = {}) {
  const body = {
    model: opts.model ?? DEFAULTS.AGENT_MODEL,
    input: query,
  };

  if (opts.webSearch !== false) body.tools = [{ type: 'web_search' }];
  if (opts.instructions) body.instructions = opts.instructions;
  if (opts.maxOutputTokens) body.max_output_tokens = opts.maxOutputTokens;
  if (opts.temperature != null) body.temperature = opts.temperature;
  if (opts.toolChoice) body.tool_choice = opts.toolChoice;

  const raw = await request(ENDPOINTS.AGENT, body, {
    apiKey: opts.apiKey,
    timeoutMs: opts.timeoutMs ?? DEFAULTS.AGENT_TIMEOUT_MS,
  });

  // Response is an `output` array: search_results block(s) + a message block.
  const output = raw.output ?? [];
  const message = output.find(o => o.type === 'message');
  const answer = message?.content?.find(c => c.type === 'output_text')?.text ?? '';
  const results = output
    .filter(o => o.type === 'search_results')
    .flatMap(o => o.results ?? []);

  return {
    answer,
    results,
    citations: results.map(r => r.url).filter(Boolean),
    usage: raw.usage ?? null,
    raw,
  };
}

// -- Chat Completions API (/chat/completions) --

/**
 * Chat with a Perplexity model (search-grounded).
 * Token-priced. Supports streaming, structured output, reasoning.
 *
 * @param {string} query - User message
 * @param {object} [opts]
 * @param {string} [opts.model=sonar-pro]
 * @param {string} [opts.systemPrompt] - System message
 * @param {object[]} [opts.messages] - Full message history (overrides query + systemPrompt)
 * @param {string[]} [opts.allowDomains]
 * @param {string[]} [opts.blockDomains]
 * @param {string} [opts.searchMode] - web|academic|sec
 * @param {string} [opts.recency] - hour|day|week|month|year
 * @param {boolean} [opts.stream=false]
 * @param {object} [opts.responseFormat] - JSON Schema or regex format
 * @param {boolean} [opts.returnImages=false]
 * @param {boolean} [opts.returnRelatedQuestions=false]
 * @param {number} [opts.maxTokens] - Max output tokens
 * @param {number} [opts.numSearchResults] - How many sources to consult
 * @param {string} [opts.reasoningEffort] - minimal|low|medium|high (reasoning models)
 * @param {number} [opts.timeoutMs=30000]
 * @param {string} [opts.apiKey]
 * @returns {Promise<{answer: string, citations: string[], raw: object}>}
 */
export async function chat(query, opts = {}) {
  const messages = opts.messages ?? [];
  if (!opts.messages) {
    if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
    messages.push({ role: 'user', content: query });
  }

  const body = {
    model: opts.model ?? DEFAULTS.CHAT_MODEL,
    messages,
  };

  const domainFilter = buildDomainFilter(opts.allowDomains, opts.blockDomains);
  if (domainFilter) body.search_domain_filter = domainFilter;

  if (opts.searchMode) body.search_mode = opts.searchMode;
  if (opts.recency) body.search_recency_filter = opts.recency;
  if (opts.stream) body.stream = true;
  if (opts.responseFormat) body.response_format = opts.responseFormat;
  if (opts.returnImages) body.return_images = true;
  if (opts.returnRelatedQuestions) body.return_related_questions = true;
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.numSearchResults) body.num_search_results = opts.numSearchResults;
  if (opts.reasoningEffort) body.reasoning_effort = opts.reasoningEffort;

  // Streaming returns a ReadableStream, not JSON
  if (opts.stream) {
    const response = await fetch(`${BASE_URL}${ENDPOINTS.CHAT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resolveKey(opts.apiKey)}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULTS.CHAT_TIMEOUT_MS),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Perplexity ${response.status}: ${text}`);
    }

    return { stream: response.body, raw: response };
  }

  const raw = await request(ENDPOINTS.CHAT, body, {
    apiKey: opts.apiKey,
    timeoutMs: opts.timeoutMs ?? DEFAULTS.CHAT_TIMEOUT_MS,
  });

  return {
    answer: raw.choices?.[0]?.message?.content ?? '',
    citations: raw.citations ?? [],
    raw,
  };
}

/**
 * Deep research — exhaustive multi-source investigation.
 * Convenience wrapper: chat() with sonar-deep-research and 6-minute timeout.
 *
 * @param {string} query
 * @param {object} [opts] - Same as chat() opts
 * @returns {Promise<{answer: string, citations: string[], raw: object}>}
 */
export async function deepResearch(query, opts = {}) {
  return chat(query, {
    ...opts,
    model: MODELS.SONAR_DEEP_RESEARCH,
    timeoutMs: opts.timeoutMs ?? DEFAULTS.DEEP_RESEARCH_TIMEOUT_MS,
  });
}

/**
 * Reasoning — chain-of-thought with search grounding.
 * Convenience wrapper: chat() with sonar-reasoning-pro and 60s timeout.
 *
 * @param {string} query
 * @param {object} [opts] - Same as chat() opts, plus reasoningEffort
 * @returns {Promise<{answer: string, citations: string[], raw: object}>}
 */
export async function reason(query, opts = {}) {
  return chat(query, {
    ...opts,
    model: MODELS.SONAR_REASONING_PRO,
    timeoutMs: opts.timeoutMs ?? DEFAULTS.REASONING_TIMEOUT_MS,
  });
}

// -- Factory --

/**
 * Create a client bound to an explicit API key.
 * Returns the same functions (search, chat, deepResearch, reason)
 * with the key pre-applied.
 *
 * @param {string} apiKey
 */
export function createClient(apiKey) {
  if (!apiKey) throw new Error('apiKey required');
  return {
    search: (query, opts = {}) => search(query, { ...opts, apiKey }),
    agent: (query, opts = {}) => agent(query, { ...opts, apiKey }),
    chat: (query, opts = {}) => chat(query, { ...opts, apiKey }),
    deepResearch: (query, opts = {}) => deepResearch(query, { ...opts, apiKey }),
    reason: (query, opts = {}) => reason(query, { ...opts, apiKey }),
  };
}
