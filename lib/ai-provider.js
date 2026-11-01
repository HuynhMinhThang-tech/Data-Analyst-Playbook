// Provider-agnostic AI chat completion.
//
// Configure with environment variables once you have an API key:
//   AI_PROVIDER = openai | anthropic | google
//   OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY  (matching the provider)
//   AI_MODEL = optional model override (sensible default used otherwise)
//
// Nothing else in the app needs to change when you switch provider later —
// just flip AI_PROVIDER and set the matching key in Vercel's env vars.

export function isAiConfigured() {
  const provider = (process.env.AI_PROVIDER || '').toLowerCase();
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  if (provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  if (provider === 'google') return Boolean(process.env.GOOGLE_API_KEY);
  return false;
}

export async function chatComplete({ system, prompt }) {
  const provider = (process.env.AI_PROVIDER || '').toLowerCase();
  if (provider === 'openai') return chatOpenAI({ system, prompt });
  if (provider === 'anthropic') return chatAnthropic({ system, prompt });
  if (provider === 'google') return chatGoogle({ system, prompt });
  throw new Error(
    'AI_PROVIDER chưa được cấu hình hoặc không hợp lệ (dùng: openai | anthropic | google).'
  );
}

async function chatOpenAI({ system, prompt }) {
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API lỗi ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function chatAnthropic({ system, prompt }) {
  const model = process.env.AI_MODEL || 'claude-sonnet-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API lỗi ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function chatGoogle({ system, prompt }) {
  const model = process.env.AI_MODEL || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Google API lỗi ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
