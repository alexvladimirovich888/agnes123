// Self-contained Vercel Serverless Function & chat processor for /api/chat
// Uses native Node fetch with zero external runtime dependencies for 100% Vercel compatibility

export interface ChatMessagePayload {
  role: string;
  content: string;
}

export interface ChatRequestPayload {
  agentId?: string;
  agentName?: string;
  systemPrompt?: string;
  customPrompt?: string;
  messages: ChatMessagePayload[];
}

export interface ChatResponsePayload {
  reply?: string;
  model?: string;
  provider?: string;
  error?: string;
  details?: string;
}

// Helper to get sanitized API keys from any supported environment variable
export function getApiKeys() {
  const rawXai = process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';
  const xaiKey = rawXai.trim() !== '' && rawXai !== 'YOUR_SECRET_KEY' && rawXai !== 'MY_XAI_KEY' ? rawXai.trim() : null;

  const rawGemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || '';
  const geminiKey = rawGemini.trim() !== '' && rawGemini !== 'MY_GEMINI_API_KEY' ? rawGemini.trim() : null;

  const rawModel = (process.env.XAI_MODEL || '').trim();
  let xaiModel = 'grok-4.6';
  if (rawModel && !rawModel.startsWith('grok-2') && rawModel !== 'grok-beta') {
    xaiModel = rawModel;
  }

  return { xaiKey, geminiKey, xaiModel };
}

// Discover available xAI models
async function fetchAvailableXaiModels(xaiKey: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://api.x.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${xaiKey}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json() as any;
      if (Array.isArray(data?.data)) {
        const ids = data.data.map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) {
          return ids;
        }
      }
    }
  } catch (e) {
    // Ignore timeout / error
  }
  return [];
}

// Call xAI Chat Completions API
async function callXai(
  xaiKey: string,
  preferredModel: string,
  fullSystemPrompt: string,
  messages: ChatMessagePayload[]
): Promise<{ reply: string; model: string }> {
  const discoveredModels = await fetchAvailableXaiModels(xaiKey);

  const candidateModels = [
    preferredModel || 'grok-4.6',
    'grok-4.6',
    'grok-4.5',
    'grok-4.20-0309-reasoning',
    'grok-4.20',
    'grok-4.3',
    'grok-4.20-0309-non-reasoning',
    'grok-build-0.1',
    ...discoveredModels,
    'grok-3',
    'grok-3-mini'
  ];

  const modelsToTry = candidateModels.filter(
    (v, i, a) => Boolean(v) && a.indexOf(v) === i
  );

  let lastStatus = 0;
  let lastErrorText = '';

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xaiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: fullSystemPrompt },
            ...messages.map((m) => ({
              role: m.role === 'agent' || m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content
            }))
          ],
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const reply = data.choices?.[0]?.message?.content;
        if (reply && typeof reply === 'string') {
          return { reply: reply.trim(), model: `xAI ${model}` };
        }
      } else {
        lastStatus = response.status;
        lastErrorText = await response.text();
        if (response.status === 401 || response.status === 403) {
          throw new Error(`xAI Authentication Error (${response.status}): Check your XAI_API_KEY.`);
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Authentication Error')) {
        throw err;
      }
      lastErrorText = err?.message || String(err);
    }
  }

  throw new Error(`xAI API returned status ${lastStatus || 500}: ${lastErrorText || 'Failed to get response'}`);
}

// Call Google Gemini API using native REST fetch
async function callGemini(
  geminiKey: string,
  fullSystemPrompt: string,
  messages: ChatMessagePayload[]
): Promise<{ reply: string; model: string }> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  const contents = messages
    .filter(m => m.content && m.content.trim())
    .map(m => ({
      role: m.role === 'agent' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: fullSystemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7 }
        })
      });

      if (res.ok) {
        const data = await res.json() as any;
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply && typeof reply === 'string') {
          return { reply: reply.trim(), model: `Gemini ${model}` };
        }
      }
    } catch (e) {
      // Continue to next model
    }
  }

  throw new Error('Gemini API call failed across all fallback models.');
}

// In-character autonomous fallback
function generateAutonomousFallback(payload: ChatRequestPayload): string {
  const agentId = payload.agentId || 'vex';
  const agentName = payload.agentName || 'OpenBot Agent';
  const lastUserMsg = [...payload.messages].reverse().find(m => m.role === 'user')?.content || 'Hello';

  switch (agentId) {
    case 'vex':
      return `**[VEX — Autonomous Market Mode]**\n\nAnalyzing query: *"${lastUserMsg}"*\n\n1. **Market Context**: Risk evaluation is paramount. In high-volatility conditions, capital preservation precedes yield generation.\n2. **Liquidity & Structure**: Monitor order book depth and avoid slippage on thin books.\n3. **Action Plan**: Maintain diversified asset allocation with strict stop boundaries.\n\n*(Note: Running in autonomous mode. Configure XAI_API_KEY in Vercel settings for live xAI Grok 4.6 generation.)*`;
    
    case 'byte':
      return `**[BYTE — Autonomous Code & Engineering Mode]**\n\nReceived task: *"${lastUserMsg}"*\n\n\`\`\`typescript\n// Autonomous Agent Architecture Handler\nexport async function executeAgentWorkflow() {\n  console.log("Executing optimized agent pipeline...");\n  return { status: "ready", modules: 4, runtime: "Node.js + Vite" };\n}\n\`\`\`\n\nKey architectural principles applied:\n- Strict type safety and zero-drift state\n- Modular component isolation\n- Resilient fallback routines\n\n*(Note: Configure XAI_API_KEY in Vercel settings for live grok-4.6 generation.)*`;

    case 'pulse':
      return `**[PULSE — Autonomous Intelligence Mode]**\n\nSynthesizing intelligence on: *"${lastUserMsg}"*\n\n- **Signal Assessment**: High engagement across decentralized developer channels.\n- **Emerging Trends**: Autonomous agent workflows, local model orchestration, and multi-agent coordination frameworks.\n- **Actionable Takeaway**: Focus on robust integration and sub-second tool execution.\n\n*(Note: Configure XAI_API_KEY in Vercel settings for live grok-4.6 generation.)*`;

    case 'morph':
    default:
      return `**[${agentName} — Autonomous Mode]**\n\nI have processed your request: *"${lastUserMsg}"*.\n\nAll OpenBots agents are active and responding. Configure **XAI_API_KEY** in your Vercel Environment Variables to unlock grok-4.6.`;
  }
}

// Core execution handler
export async function processChat(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
  try {
    const { systemPrompt, customPrompt, messages } = payload;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { error: 'Messages array is required' };
    }

    let fullSystemPrompt = systemPrompt || 'You are an AI agent on the OpenBots platform.';
    if (customPrompt && customPrompt.trim()) {
      fullSystemPrompt += `\n\nUSER CUSTOM SYSTEM INSTRUCTIONS:\n${customPrompt.trim()}`;
    }

    const { xaiKey, geminiKey, xaiModel } = getApiKeys();
    let xaiError = '';
    let geminiError = '';

    // 1. Try xAI Grok
    if (xaiKey) {
      try {
        const res = await callXai(xaiKey, xaiModel, fullSystemPrompt, messages);
        return {
          reply: res.reply,
          model: res.model,
          provider: 'xai'
        };
      } catch (err: any) {
        xaiError = err.message || String(err);
        console.error('[xAI Failure]', xaiError);
      }
    } else {
      xaiError = 'XAI_API_KEY is not configured in Vercel environment variables.';
    }

    // 2. Fallback to Gemini
    if (geminiKey) {
      try {
        const res = await callGemini(geminiKey, fullSystemPrompt, messages);
        return {
          reply: res.reply,
          model: res.model,
          provider: 'gemini'
        };
      } catch (err: any) {
        geminiError = err.message || String(err);
        console.error('[Gemini Failure]', geminiError);
      }
    } else {
      geminiError = 'GEMINI_API_KEY is not configured.';
    }

    // 3. Autonomous fallback response
    const fallbackReply = generateAutonomousFallback(payload);
    return {
      reply: fallbackReply,
      model: 'OpenBots Autonomous Engine',
      provider: 'local-fallback',
      details: `${xaiError} | ${geminiError}`
    };
  } catch (outerErr: any) {
    const fallbackReply = generateAutonomousFallback(payload || { messages: [] });
    return {
      reply: fallbackReply,
      model: 'OpenBots Autonomous Engine',
      provider: 'local-fallback',
      details: outerErr?.message || String(outerErr)
    };
  }
}

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Missing request body' });
    }

    const result = await processChat(body);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Vercel Serverless] Uncaught handler error:', err);
    return res.status(200).json({
      reply: generateAutonomousFallback(req.body || { messages: [] }),
      model: 'OpenBots Autonomous Engine',
      provider: 'local-fallback',
      details: err?.message || String(err)
    });
  }
}
