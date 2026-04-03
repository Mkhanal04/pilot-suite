// Vercel serverless function — Gemini API proxy for FinPilot
// Uses direct REST API calls (no npm dependencies, no build step)
// Models: gemini-2.5-pro for reconciliation, gemini-2.5-flash for schema mapping

const SCHEMA_MAPPING_PROMPT = (context) => `You are a financial data schema mapping analyst. Your job is to analyze field mappings across three financial data sources and return structured analysis in JSON format.

Context:
- Source A (Custodian/BNY Mellon): ${JSON.stringify(context.fields?.sourceA || {})}
- Source B (Fund Admin/SS&C): ${JSON.stringify(context.fields?.sourceB || {})}
- Source C (Internal Portfolio): ${JSON.stringify(context.fields?.sourceC || {})}

Return a JSON object with this exact structure:
{
  "analysis": "Plain English explanation of how these fields relate",
  "confidence": <number 0-100>,
  "reasoning": ["step 1", "step 2", "step 3"],
  "recommendation": "What the user should do",
  "historicalContext": "Any relevant historical patterns"
}

Confidence scoring guide: 90+ for clearly equivalent fields, 50-89 for likely equivalent, under 50 for uncertain mappings.`;

const RECONCILIATION_PROMPT = (context) => `You are a financial data reconciliation analyst at an investment operations firm. Analyze this security position across three data sources and return structured analysis in JSON format.

Security: ${context.security} (${context.ticker})
Current assessment tier: ${context.tier} (resolved=match, flagged=needs review, escalated=investigate)

Source A (Custodian/BNY Mellon):
- Shares: ${context.sourceA?.shares || 'N/A'}
- Value: ${context.sourceA?.value || 'N/A'}
- Note: ${context.sourceA?.note || 'none'}

Source B (Fund Admin/SS&C):
- Shares: ${context.sourceB?.shares || 'N/A'}
- Value: ${context.sourceB?.value || 'N/A'}
- Note: ${context.sourceB?.note || 'none'}

Source C (Internal Portfolio System):
- Shares: ${context.sourceC?.shares || 'N/A'}
- Value: ${context.sourceC?.value || 'N/A'}
- Note: ${context.sourceC?.note || 'none'}

Analyze this reconciliation exception and return a JSON object with this exact structure:
{
  "analysis": "Plain English explanation (2-3 sentences) of what is happening with this position across the three sources",
  "confidence": <number 0-100 — how confident you are in your explanation>,
  "reasoning": ["observation 1", "observation 2", "observation 3"],
  "recommendation": "One sentence describing what the operations team should do",
  "recommendationSteps": ["specific action 1", "specific action 2", "specific action 3"],
  "historicalContext": "Brief note about similar patterns or precedents (or empty string if none)",
  "impact": "Financial impact description (e.g. '$207,500 variance' or 'No financial impact')"
}

Confidence scoring: 80+ for well-understood discrepancies with clear explanations (stock splits, timing), 40-79 for likely explanations, under 40 for unexplained genuine breaks.`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    // Return fallback signal — client will use mock data
    return res.status(200).json({ fallback: true, reason: 'API key not configured' });
  }

  const { type, context } = req.body || {};
  if (!type || !context) {
    return res.status(400).json({ error: 'Missing type or context' });
  }

  // Select model and build prompt based on request type
  const model = type === 'reconciliation' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const prompt = type === 'reconciliation'
    ? RECONCILIATION_PROMPT(context)
    : SCHEMA_MAPPING_PROMPT(context);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      }),
      signal: AbortSignal.timeout(9000)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error('Gemini API error:', geminiRes.status, errText);
      return res.status(200).json({ fallback: true, reason: `Gemini error ${geminiRes.status}` });
    }

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(200).json({ fallback: true, reason: 'Empty response from Gemini' });
    }

    // Parse JSON response from Gemini
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      // Try to extract JSON from within the text
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
      }
    }

    if (!parsed) {
      return res.status(200).json({ fallback: true, reason: 'Could not parse Gemini response as JSON' });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.error('Gemini request timed out');
    } else {
      console.error('Fetch error calling Gemini:', err.message);
    }
    return res.status(200).json({ fallback: true, reason: 'Request failed or timed out' });
  }
}
