const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.6-flash";

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

async function generateContent(model: string, apiKey: string, payload: unknown, timeoutMs: number) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function generateGeminiContent(
  apiKey: string,
  payload: unknown,
  options: { primaryMs?: number; fallbackMs?: number; fallbackRetries?: number } = {}
) {
  const primaryTimeoutMs = options.primaryMs ?? 7_000;
  const fallbackTimeoutMs = options.fallbackMs ?? 18_000;
  const fallbackRetries = options.fallbackRetries ?? 0;
  const requestFallback = async () => {
    for (let attempt = 0; ; attempt += 1) {
      const response = await generateContent(FALLBACK_MODEL, apiKey, payload, fallbackTimeoutMs);
      if (!RETRYABLE_STATUSES.has(response.status) || attempt >= fallbackRetries) return response;
      await response.body?.cancel();
      const backoffMs = Math.min(4_000, 750 * 2 ** attempt) + Math.floor(Math.random() * 400);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      console.warn(`Gemini ${FALLBACK_MODEL} returned a retryable status; retrying after ${backoffMs}ms`);
    }
  };
  let primaryResponse: Response;
  try {
    primaryResponse = await generateContent(PRIMARY_MODEL, apiKey, payload, primaryTimeoutMs);
  } catch {
    console.warn(`Gemini ${PRIMARY_MODEL} request failed; retrying with ${FALLBACK_MODEL}`);
    return requestFallback();
  }
  if (!RETRYABLE_STATUSES.has(primaryResponse.status)) return primaryResponse;

  console.warn(`Gemini ${PRIMARY_MODEL} returned ${primaryResponse.status}; retrying with ${FALLBACK_MODEL}`);
  await primaryResponse.body?.cancel();
  return requestFallback();
}
