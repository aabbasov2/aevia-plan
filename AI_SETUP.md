# Aevia AI setup

1. Create a Groq API key in the [Groq console](https://console.groq.com/keys).
2. Set `GROQ_API_KEY=your-key` in `.env.local`.
3. Restart the Aevia development server.

Aevia uses Qwen 3.8 27B first, then falls back to GPT OSS 120B and GPT OSS 20B for text-based AI requests. Calendar screenshot import uses Qwen 3.8 27B because it is the configured Groq model with image input. The key is read only by server routes. Do not add it to client-side code or commit `.env.local`.
