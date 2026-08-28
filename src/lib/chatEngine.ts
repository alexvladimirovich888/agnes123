import { GoogleGenAI } from '@google/genai';

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
  // Ensure grok-4.6 is preferred over outdated grok-2 defaults
  let xaiModel = 'grok-4.6';
  if (rawModel && !rawModel.startsWith('grok-2') && rawModel !== 'grok-beta') {
    xaiModel = rawModel;
  }

  return { xaiKey, geminiKey, xaiModel };
}

// Fetch available models from xAI if possible
async function fetchAvailableXaiModels(xaiKey: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://api.x.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${xaiKey}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        const ids = data.data.map((m: any) => m.id).filter(Boolean);
        if (ids.length > 0) {
          console.log('[xAI] Discovered available models from /v1/models:', ids);
          return ids;
        }
      }
    }
  } catch (e) {
    // Ignore and proceed to static model list
  }
  return [];
}

// xAI Grok API Caller with intelligent fallback across all valid active models
async function callXai(
  xaiKey: string,
  preferredModel: string,
  fullSystemPrompt: string,
  messages: ChatMessagePayload[]
): Promise<{ reply: string; model: string }> {
  // Dynamically discover models supported on this key, or fall back to known models
  const discoveredModels = await fetchAvailableXaiModels(xaiKey);

  // Prioritize preferred model and grok-4.6 before any discovered models
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
      console.log(`[xAI] Attempting chat completions with model: ${model}`);
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
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && typeof reply === 'string') {
          return { reply: reply.trim(), model: `xAI ${model}` };
        }
      } else {
        lastStatus = response.status;
        lastErrorText = await response.text();
        console.warn(`[xAI] Model ${model} failed (${response.status}): ${lastErrorText}`);
        
        // If authentication error (401 / 403), do not cycle models
        if (response.status === 401 || response.status === 403) {
          throw new Error(`xAI Authentication Error (${response.status}): Check your XAI_API_KEY.`);
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Authentication Error')) {
        throw err;
      }
      lastErrorText = err?.message || String(err);
      console.warn(`[xAI] Error for model ${model}:`, err);
    }
  }

  throw new Error(`xAI API returned status ${lastStatus || 500}: ${lastErrorText || 'Failed to get response'}`);
}

// Google Gemini API Caller with multi-model fallback & 503 high-demand resilience
async function callGemini(
  geminiKey: string,
  fullSystemPrompt: string,
  messages: ChatMessagePayload[]
): Promise<{ reply: string; model: string }> {
  const geminiModelsToTry = [
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview'
  ];

  const ai = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const formattedHistory = messages.map((m) => ({
    role: m.role === 'agent' || m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || '' }]
  }));

  let validContents = formattedHistory.filter(item => item.parts[0].text.trim().length > 0);
  if (validContents.length === 0) {
    validContents = [{ role: 'user', parts: [{ text: 'Hello' }] }];
  } else if (validContents[0].role === 'model') {
    validContents = [{ role: 'user', parts: [{ text: 'Hello' }] }, ...validContents];
  }

  let lastGeminiError: any = null;

  for (const model of geminiModelsToTry) {
    try {
      console.log(`[Gemini] Attempting generation with model: ${model}`);
      const result = await ai.models.generateContent({
        model,
        contents: validContents,
        config: {
          systemInstruction: fullSystemPrompt,
          temperature: 0.7
        }
      });

      const reply = result.text;
      if (reply && typeof reply === 'string' && reply.trim().length > 0) {
        return { reply: reply.trim(), model: `Gemini (${model})` };
      }
    } catch (err: any) {
      lastGeminiError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[Gemini] Model ${model} encountered error:`, errMsg);

      // If invalid API key (400 or 403 with API_KEY_INVALID), fail fast
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED')) {
        throw new Error(`Gemini Authentication Error: Invalid or unauthorized GEMINI_API_KEY.`);
      }

      // If 503 UNAVAILABLE or 429 RESOURCE_EXHAUSTED, wait 500ms and try the next model
      if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429')) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  console.error('[Gemini] All fallback models failed. Last error:', lastGeminiError);
  throw new Error(`Gemini API error: ${lastGeminiError?.message || 'High demand or rate limit reached on all models.'}`);
}

// In-character autonomous fallback for smooth local execution when cloud keys are unavailable
function generateAutonomousFallback(payload: ChatRequestPayload): string {
  const agentId = payload.agentId || 'vex';
  const agentName = payload.agentName || 'OpenBot Agent';
  const lastUserMsg = [...payload.messages].reverse().find(m => m.role === 'user')?.content || 'Hello';

  switch (agentId) {
    case 'vex':
      return `**[VEX — Autonomous Market Mode]**\n\nAnalyzing query: *"${lastUserMsg}"*\n\n1. **Market Context**: Risk evaluation is paramount. In high-volatility conditions, capital preservation precedes yield generation.\n2. **Liquidity & Structure**: Monitor order book depth and avoid slippage on thin books.\n3. **Action Plan**: Maintain diversified asset allocation with strict stop boundaries.\n\n*(Note: Running in autonomous mode. Configure XAI_API_KEY or GEMINI_API_KEY in settings for live web synthesis.)*`;
    
    case 'byte':
      return `**[BYTE — Autonomous Code & Engineering Mode]**\n\nReceived task: *"${lastUserMsg}"*\n\n\`\`\`typescript\n// Autonomous Agent Architecture Handler\nexport async function executeAgentWorkflow() {\n  console.log("Executing optimized agent pipeline...");\n  return { status: "ready", modules: 4, runtime: "Node.js + Vite" };\n}\n\`\`\`\n\nKey architectural principles applied:\n- Strict type safety and zero-drift state\n- Modular component isolation\n- Resilient fallback routines\n\n*(Note: Configure XAI_API_KEY or GEMINI_API_KEY for dynamic real-time script compilation.)*`;

    case 'pulse':
      return `**[PULSE — Autonomous Intelligence Mode]**\n\nSynthesizing intelligence on: *"${lastUserMsg}"*\n\n- **Signal Assessment**: High engagement across decentralized developer channels.\n- **Emerging Trends**: Autonomous agent workflows, local model orchestration, and multi-agent coordination frameworks.\n- **Actionable Takeaway**: Focus on robust integration and sub-second tool execution.\n\n*(Note: Running in autonomous mode. Provide XAI_API_KEY or GEMINI_API_KEY for live real-time web grounding.)*`;

    case 'morph':
    default:
      return `**[${agentName} — Autonomous Mode]**\n\nI have processed your request: *"${lastUserMsg}"*.\n\nAll OpenBots agents are active and responding. To enable full unconstrained generative capabilities, connect your **XAI_API_KEY** or **GEMINI_API_KEY** in your project settings.`;
  }
}

// Core execution handler used by both Express server and Vercel Serverless Functions
export async function processChat(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
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

  // 1. Try xAI Grok if key is available
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
      console.error('[xAI Grok Failure]', xaiError);
    }
  } else {
    xaiError = 'XAI_API_KEY is not configured in environment variables.';
  }

  // 2. Fallback to Gemini if key is available
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
      console.error('[Gemini Fallback Failure]', geminiError);
    }
  } else {
    geminiError = 'GEMINI_API_KEY is not configured in environment variables.';
  }

  // 3. Resilient autonomous fallback response
  const fallbackReply = generateAutonomousFallback(payload);
  return {
    reply: fallbackReply,
    model: 'OpenBots Autonomous Engine',
    provider: 'local-fallback',
    details: `${xaiError} | ${geminiError}`
  };
}

