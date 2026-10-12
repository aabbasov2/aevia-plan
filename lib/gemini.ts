const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.6-flash";

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

async function generateContent(model: string, apiKey: string, payload: unknown) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
}

export async function generateGeminiContent(apiKey: string, payload: unknown) {
  let primaryResponse: Response;
  try {
    primaryResponse = await generateContent(PRIMARY_MODEL, apiKey, payload);
  } catch {
    console.warn(`Gemini ${PRIMARY_MODEL} request failed; retrying with ${FALLBACK_MODEL}`);
    return generateContent(FALLBACK_MODEL, apiKey, payload);
  }
  if (!RETRYABLE_STATUSES.has(primaryResponse.status)) return primaryResponse;

  console.warn(`Gemini ${PRIMARY_MODEL} returned ${primaryResponse.status}; retrying with ${FALLBACK_MODEL}`);
  await primaryResponse.body?.cancel();
  return generateContent(FALLBACK_MODEL, apiKey, payload);
}
