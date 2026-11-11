// Picks the provider to use when publik is not available (a build from source
// has no publik app token). Used by main.js publikApplyGate.

const OWN_PROVIDER_ORDER = ['anthropic', 'openai', 'gemini', 'deepseek', 'groq', 'cerebras'];

/**
 * @param {{ provider?: string, apiKeys?: Record<string, string> }} settings
 * @returns {string} the saved provider unless it is publik; else the first provider with a key; else anthropic.
 */
function pickOwnProvider(settings) {
  const s = settings || {};
  if (s.provider && s.provider !== 'publik') return s.provider;
  const keys = s.apiKeys || {};
  return OWN_PROVIDER_ORDER.find((p) => typeof keys[p] === 'string' && keys[p].trim()) || 'anthropic';
}

module.exports = { pickOwnProvider, OWN_PROVIDER_ORDER };
