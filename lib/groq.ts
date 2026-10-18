const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Keep Qwen as the primary planner model, with two independent Groq-hosted
// models available when it is overloaded or temporarily unavailable.
export const GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
] as const;

const RETRYABLE_STATUSES = new Set([403, 408, 404, 429, 500, 502, 503, 504]);

type ModelRequestPayload = {
  systemInstruction?: { parts?: Array<{ text?: string }> };
  contents?: Array<{ role?: string; parts?: Array<{ text?: string; inline_data?: { mime_type?: string; data?: string } }> }>;
  generationConfig?: {
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
    temperature?: number;
    maxOutputTokens?: number;
  };
};

function toJsonSchemaType(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toJsonSchemaType);
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      const types: Record<string, string> = { OBJECT: "object", ARRAY: "array", STRING: "string", INTEGER: "integer", NUMBER: "number", BOOLEAN: "boolean", NULL: "null" };
      return types[value] ?? value;
    }
    return value;
  }
  const record = value as Record<string, unknown>;
  const converted = Object.fromEntries(Object.entries(record).map(([key, item]) => [key, toJsonSchemaType(item)]));
  if (record.type === "OBJECT" && record.properties && typeof record.properties === "object") {
    converted.additionalProperties = false;
  }
  return converted;
}

function toGroqRequest(payload: ModelRequestPayload) {
  const messages: Array<Record<string, unknown>> = [];
  const system = payload.systemInstruction?.parts?.map((part) => part.text ?? "").join("\n");
  if (system) messages.push({ role: "system", content: system });

  for (const entry of payload.contents ?? []) {
    const role = entry.role === "model" ? "assistant" : entry.role === "system" ? "system" : "user";
    const parts = entry.parts ?? [];
    const text = parts.flatMap((part) => typeof part.text === "string" ? [part.text] : []);
    const images = parts.flatMap((part) => part.inline_data?.mime_type && part.inline_data.data
      ? [{ type: "image_url", image_url: { url: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}` } }]
      : []);
    const content = images.length ? [...text.map((item) => ({ type: "text", text: item })), ...images] : text.join("\n");
    messages.push({ role, content });
  }

  const generation = payload.generationConfig ?? {};
  const request: Record<string, unknown> = {
    model: GROQ_MODELS[0],
    messages,
    temperature: generation.temperature,
    max_completion_tokens: generation.maxOutputTokens,
  };
  if (generation.responseMimeType === "application/json") {
    if (generation.responseSchema) {
      request.response_format = {
        type: "json_schema",
        json_schema: {
          name: "aevia_response",
          strict: true,
          schema: toJsonSchemaType(generation.responseSchema),
        },
      };
    } else {
      request.response_format = { type: "json_object" };
    }
  }
  return request;
}

function toProviderResponse(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const response = body as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") return body;
  return { candidates: [{ content: { parts: [{ text: content }] } }] };
}

export async function generateGroqContent(
  payload: ModelRequestPayload,
  options: { timeoutMs?: number } = {},
): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const request = toGroqRequest(payload);
  const timeoutMs = options.timeoutMs ?? 18_000;
  let lastError: unknown;

  for (const [index, model] of GROQ_MODELS.entries()) {
    const body = JSON.stringify({ ...request, model });
    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      lastError = error;
      console.warn(`Groq ${model} request failed; ${index < GROQ_MODELS.length - 1 ? "trying fallback" : "no fallback remains"}.`, error instanceof Error ? error.name : "unknown error");
      continue;
    }

    const responseBody = await response.json().catch(() => null);
    if (response.ok || !RETRYABLE_STATUSES.has(response.status) || index === GROQ_MODELS.length - 1) {
      return new Response(JSON.stringify(response.ok ? toProviderResponse(responseBody) : responseBody), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.warn(`Groq ${model} returned ${response.status}; trying ${GROQ_MODELS[index + 1]}.`);
  }

  throw lastError instanceof Error ? lastError : new Error("All Groq models are temporarily unavailable.");
}
