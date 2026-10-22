// Self-contained Vercel Serverless Function for /api/status

function getApiKeys() {
  const rawXai = process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';
  const xaiKey = rawXai.trim() !== '' && rawXai !== 'YOUR_SECRET_KEY' && rawXai !== 'MY_XAI_KEY' ? rawXai.trim() : null;

  const rawGemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || '';
  const geminiKey = rawGemini.trim() !== '' && rawGemini !== 'MY_GEMINI_API_KEY' ? rawGemini.trim() : null;

  const rawModel = (process.env.XAI_MODEL || '').trim();
  let xaiModel = 'grok-4.6';
  if (rawModel && !rawModel.startsWith('grok-2') && rawModel !== 'grok-beta') {
    xaiModel = rawModel;
  }

  const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim() || null;
  const anthropicModel = (process.env.ANTHROPIC_MODEL || '').trim() || 'claude-haiku-5-5';

  const localBaseUrl = (process.env.LOCAL_MODEL_BASE_URL || '').trim() || null;
  const localModel = (process.env.LOCAL_MODEL_NAME || '').trim() || 'llama3.1';

  return { xaiKey, geminiKey, xaiModel, anthropicKey, anthropicModel, localBaseUrl, localModel };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { xaiKey, geminiKey, xaiModel, anthropicKey, anthropicModel, localBaseUrl, localModel } = getApiKeys();

  return res.status(200).json({
    status: 'online',
    platform: 'SourceBots',
    environment: 'vercel-serverless',
    xaiModel,
    hasXaiKey: !!xaiKey,
    hasGeminiKey: !!geminiKey,
    anthropicModel,
    hasAnthropicKey: !!anthropicKey,
    localModel: localBaseUrl ? localModel : null,
    hasLocalModel: !!localBaseUrl,
  });
}
