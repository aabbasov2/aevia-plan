# Gemini setup

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. In the project root, copy `.env.example` to `.env.local`.
3. Set `GEMINI_API_KEY=your-key` in `.env.local`.
4. Restart the Aevia development server.

The key is read only by the server route at `/api/ai/interpret-task`. Do not add it to client-side code or commit `.env.local`.
