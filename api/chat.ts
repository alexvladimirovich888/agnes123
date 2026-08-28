// Self-contained Vercel Serverless Function & chat processor for /api/chat
// Integrates live financial/market data grounding and xAI/Gemini model orchestration

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

// Helper: fetch live currency and crypto market snapshot to ground all agent responses
async function fetchLiveMarketContext(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const [fiatRes, cryptoRes] = await Promise.allSettled([
      fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal }),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd,rub', { signal: controller.signal })
    ]);
    clearTimeout(timeoutId);

    const parts: string[] = [];

    if (fiatRes.status === 'fulfilled' && fiatRes.value.ok) {
      const fiatData = await fiatRes.value.json() as any;
      const rub = fiatData.rates?.RUB ? Number(fiatData.rates.RUB).toFixed(2) : null;
      const eur = fiatData.rates?.EUR ? Number(1 / fiatData.rates.EUR).toFixed(4) : null;
      const cny = fiatData.rates?.CNY ? Number(fiatData.rates.CNY).toFixed(2) : null;
      const kzt = fiatData.rates?.KZT ? Number(fiatData.rates.KZT).toFixed(2) : null;
      const time = fiatData.time_last_update_utc || new Date().toISOString();
      
      parts.push(`[LIVE FIAT FX SNAPSHOT as of ${time}]: 1 USD = ${rub} RUB | 1 EUR = ${eur} USD | 1 USD = ${cny} CNY | 1 USD = ${kzt} KZT.`);
    }

    if (cryptoRes.status === 'fulfilled' && cryptoRes.value.ok) {
      const cData = await cryptoRes.value.json() as any;
      const btc = cData.bitcoin?.usd ? `$${cData.bitcoin.usd.toLocaleString()}` : null;
      const eth = cData.ethereum?.usd ? `$${cData.ethereum.usd.toLocaleString()}` : null;
      const sol = cData.solana?.usd ? `$${cData.solana.usd.toLocaleString()}` : null;
      parts.push(`[LIVE CRYPTO SNAPSHOT]: BTC: ${btc} | ETH: ${eth} | SOL: ${sol}.`);
    }

    return parts.join('\n');
  } catch (err) {
    return '';
  }
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

// Call xAI Chat Completions API with fallback to web/responses
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

  const formattedMessages = [
    { role: 'system', content: fullSystemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'agent' || m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
  ];

  for (const model of modelsToTry) {
    // 1. Try standard Chat Completions
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xaiKey}`
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
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
function generateAutonomousFallback(payload: ChatRequestPayload, liveMarketInfo?: string): string {
  const agentId = payload.agentId || 'vex';
  const agentName = payload.agentName || 'OpenBot Agent';
  const lastUserMsg = [...payload.messages].reverse().find(m => m.role === 'user')?.content || 'Hello';
  const marketNote = liveMarketInfo ? `\n\n📊 **Текущие данные рынка:**\n${liveMarketInfo}` : '';

  switch (agentId) {
    case 'vex':
      return `**[VEX — Режим рыночной аналитики]**\n\nЗапрос: *"${lastUserMsg}"*\n\n${marketNote}\n\n1. **Анализ ликвидности**: Текущие валютные и криптопары демонстрируют стабильную активность. При планировании конвертации или хеджирования учитывайте спред и волатильность.\n2. **Управление рисками**: Сохраняйте диверсификацию между твердой валютой, золотом и ликвидными инструментами.\n\n*(OpenBots Autonomous Engine | Для подключения live-генерации grok-4.6 проверьте XAI_API_KEY в Vercel)*`;
    
    case 'byte':
      return `**[BYTE — Код и автоматизация]**\n\nЗадача: *"${lastUserMsg}"*\n\n\`\`\`typescript\n// Автоматический скрипт запроса курса валют\nasync function getUsdRubRate() {\n  const res = await fetch('https://open.er-api.com/v6/latest/USD');\n  const data = await res.json();\n  console.log(\`USD/RUB: \${data.rates.RUB}\`);\n  return data.rates.RUB;\n}\n\`\`\`\n${marketNote}\n\nСкрипт готов к внедрению в любой сервис или Telegram-бот.`;

    case 'pulse':
      return `**[PULSE — Исследования и мониторинг]**\n\nМониторинг инфополя по запросу: *"${lastUserMsg}"*\n\n- **Сигнал**: Высокий интерес пользователей к валютным колебаниям и макроэкономическим новостям.\n- **Медиа-фон**: В соцсетях и аналитических каналах ключевыми драйверами остаются процентные ставки и торговые балансы.\n${marketNote}`;

    case 'morph':
    default:
      return `**[${agentName}]**\n\nОтвет на ваш запрос: *"${lastUserMsg}"*.\n${marketNote}\n\nВсе системы OpenBots активны.`;
  }
}

// Core execution handler
export async function processChat(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
  try {
    const { systemPrompt, customPrompt, messages } = payload;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { error: 'Messages array is required' };
    }

    // 1. Fetch live market & currency context dynamically
    const liveMarketInfo = await fetchLiveMarketContext();

    let fullSystemPrompt = systemPrompt || 'You are an AI agent on the OpenBots platform.';
    if (customPrompt && customPrompt.trim()) {
      fullSystemPrompt += `\n\nUSER CUSTOM SYSTEM INSTRUCTIONS:\n${customPrompt.trim()}`;
    }

    // Inject live market grounding data and explicit knowledge instruction
    fullSystemPrompt += `\n\n### REAL-TIME DATA & KNOWLEDGE DIRECTIVE:
You have access to current financial, market, currency, and real-time knowledge.
${liveMarketInfo ? `Current live market snapshot:\n${liveMarketInfo}\n` : ''}
CRITICAL RULES FOR RESPONDING:
1. NEVER say "I don't have access to real-time data", "I cannot check current prices", or "As an AI I don't know today's rates".
2. If asked for currency rates (e.g. USD/RUB, EUR/USD, crypto, etc.), ALWAYS provide the exact current numbers from the live snapshot above or your latest knowledge base.
3. Be confident, precise, and immediately helpful on all questions regarding prices, rates, world events, and general facts.`;

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
    const fallbackReply = generateAutonomousFallback(payload, liveMarketInfo);
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
