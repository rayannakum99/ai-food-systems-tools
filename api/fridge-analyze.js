// Runs on Google Gemini's free tier.

const MODEL = 'gemini-3.1-flash-lite';

async function askGemini(parts, systemText) {
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192
    }
  };
  if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(body)
    }
  );

  if (response.status === 429) {
    const e = new Error('busy');
    e.busy = true;
    throw e;
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('Gemini API error:', err);
    throw new Error('api');
  }

  const data = await response.json();
  const raw = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  try {
    return JSON.parse(raw);
  } catch {
    const clean = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  }
}

function sendError(res, err) {
  if (err.busy) {
    return res.status(429).json({ error: 'This tool is busy right now as it runs on a free plan. Please try again in a minute, or tomorrow if it is still busy.' });
  }
  console.error('Handler error:', err);
  return res.status(502).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, mimeType, diet } = req.body || {};

  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const dietNote = diet
    ? `The user has the following dietary restrictions: ${String(diet).slice(0, 200)}. Only suggest recipes that respect these restrictions.`
    : 'The user has no dietary restrictions.';

  const prompt = `You are a helpful chef assistant. Analyse this photo of a fridge or food storage area.

${dietNote}

Do the following:
1. Identify every ingredient, food item, condiment, and drink that is actually visible in the photo. List only what you can see. Never add, guess or swap in items to match the dietary restrictions. If something visible does not fit the diet, still list it, but do not use it in any recipe.
2. Suggest exactly 3 recipes that can be made primarily from those ingredients.
3. For each recipe, provide detailed step-by-step cooking instructions.

Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks):
{
  "ingredients": ["ingredient 1", "ingredient 2"],
  "recipes": [
    {
      "name": "Recipe Name",
      "time": "25 mins",
      "difficulty": "Easy",
      "matchScore": 85,
      "missingIngredients": ["butter", "flour"],
      "steps": [
        "Step 1 instruction here.",
        "Step 2 instruction here."
      ]
    }
  ]
}

Rules:
- matchScore is a number 0–100 representing what percentage of ingredients are already in the fridge.
- missingIngredients lists only the extra items needed beyond what is visible.
- steps should be clear, numbered instructions (5–10 steps per recipe).
- Sort recipes from highest to lowest matchScore.
- Do not suggest recipes that violate the dietary restrictions.`;

  try {
    const result = await askGemini([
      { inlineData: { mimeType: mimeType || 'image/jpeg', data: image } },
      { text: prompt }
    ]);
    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err);
  }
}
