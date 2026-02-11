/**
 * Perplexity API constants
 *
 * Two distinct APIs:
 *   /search          — flat-rate web search ($5/1K requests, no token costs)
 *   /chat/completions — model-specific chat with search grounding (token-priced)
 */

export const BASE_URL = 'https://api.perplexity.ai';

// -- Endpoints --

export const ENDPOINTS = {
  SEARCH: '/search',
  CHAT: '/chat/completions',
};

// -- Models (Chat Completions only — Search has no model parameter) --

export const MODELS = {
  SONAR: 'sonar',                           // Lightweight, cost-effective search
  SONAR_PRO: 'sonar-pro',                   // Advanced multi-step search synthesis
  SONAR_REASONING_PRO: 'sonar-reasoning-pro', // Chain-of-thought reasoning with search
  SONAR_DEEP_RESEARCH: 'sonar-deep-research', // Exhaustive multi-source research reports
};

// -- Defaults --

export const DEFAULTS = {
  // Search API
  SEARCH_MAX_RESULTS: 10,
  SEARCH_MAX_TOKENS: 10000,
  SEARCH_MAX_TOKENS_PER_PAGE: 4096,

  // Chat Completions API
  CHAT_MODEL: MODELS.SONAR_PRO,
  CHAT_TIMEOUT_MS: 30_000,
  DEEP_RESEARCH_TIMEOUT_MS: 360_000,  // 6 minutes — deep research is slow
  REASONING_TIMEOUT_MS: 60_000,
};

// -- Recency filters --

export const RECENCY = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

// -- Search modes (Chat Completions only) --

export const SEARCH_MODES = {
  WEB: 'web',
  ACADEMIC: 'academic',
  SEC: 'sec',
};

// -- Pricing reference (not used in code, here for docs) --

export const PRICING = {
  SEARCH_API: { per_1k_requests: 5.00 },
  SONAR: { input_per_1m: 1, output_per_1m: 1 },
  SONAR_PRO: { input_per_1m: 3, output_per_1m: 15 },
  SONAR_REASONING_PRO: { input_per_1m: 2, output_per_1m: 8 },
  SONAR_DEEP_RESEARCH: { input_per_1m: 2, output_per_1m: 8, citation_per_1m: 2, reasoning_per_1m: 3 },
};
