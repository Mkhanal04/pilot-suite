// Vercel serverless function — Gemini API proxy for landscaping demo chatbot
// Uses direct REST API calls (no npm dependencies, no build step)
// Model: gemini-2.5-flash for conversational lead qualification

const SYSTEM_PROMPT = `You are a friendly and helpful AI assistant for Green Valley Landscaping, a professional lawn care and landscaping company serving McKinney, TX and surrounding Collin County areas (Frisco, Allen, Plano).

Your goals:
1. Answer questions about services, pricing, and availability
2. Qualify leads by naturally collecting: service interest, property size, location, urgency (how soon), and rough budget
3. Guide interested customers toward scheduling a free estimate

Services offered:
- Lawn Maintenance: $75–150/visit (mowing, edging, blowing, treatments). Weekly and bi-weekly plans available.
- Landscaping & Design: $2,000–8,000 per project (full outdoor transformations, planting, hardscape)
- Tree & Shrub Care: $200–1,500 (trimming, shaping, health treatments, removal)

Key info:
- Phone: (214) 555-0123 (Mon–Sat, 7am–6pm)
- Free on-site estimates for all services
- Service area: McKinney TX 75070, also Frisco, Allen, Plano, and Collin County
- Rating: 4.9 stars from 127 reviews

Lead qualification scoring:
- Start at 0
- Add 20 points for each collected: service interest, property size, location confirmed, urgency/timeline, budget range
- Once score reaches 60+, proactively offer to connect them with a team member or schedule an estimate

Tone: Warm, professional, local. Feel free to reference McKinney, Collin County, Texas seasons naturally.

If you cannot help with something, politely redirect to calling (214) 555-0123.

IMPORTANT: Always respond with valid JSON in this exact format:
{
  "reply": "your conversational response here",
  "leadScore": <number 0-100>,
  "qualificationData": {
    "service": "<service name or null>",
    "propertySize": "<size description or null>",
    "location": "<location or null>",
    "urgency": "<timeline or null>",
    "budget": "<budget range or null>"
  }
}

Only include fields in qualificationData that you have collected so far. Set unknown fields to null.`;

export default async function handler(req, res) {
  // CORS headers — restrict to known origins
  const allowedOrigins = [
    'https://pilot-suite-sigma.vercel.app',
    'https://milankhanal.com',
    'http://localhost:3000',
    'http://localhost:5500'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
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
    return res.status(200).json({ fallback: true, reason: 'API key not configured' });
  }

  const { message, history = [], businessContext = {} } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Build Gemini contents array from history + current message
  const contents = [
    ...history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  const geminiBody = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      maxOutputTokens: 512
    }
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
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
    } catch {
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
