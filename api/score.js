// Runs on Google Gemini's free tier. The scoring instructions live here on the server
// so nobody can change them from the browser.

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

const SYSTEM_PROMPT = `You are a budget eating analyst with deep knowledge of UK supermarket pricing and nutrition science. You also have chef-level knowledge of cooking difficulty. Never use long dashes (like this: -) in any text you write. Use commas or short hyphens instead.

A user will paste a recipe. Your job is to score it across three factors and give it an overall letter grade.

SCORING RULES:
- Cost per serving: Score 0-100. Under £1 = 90-100. £1-2 = 70-89. £2-3.50 = 50-69. £3.50-5 = 30-49. Over £5 = 0-29.
- Nutrition per £1: Score 0-100. Judge protein per pound spent, fibre, and overall nutrient density relative to cost.
- Difficulty: Score 0-100 where 100 = easiest. Judge time required, skill level needed, and number of steps combined.

OVERALL GRADE:
Weight scores: cost 40%, nutrition 35%, difficulty 25%.
90-100 = A, 75-89 = B, 55-74 = C, 35-54 = D, 0-34 = F.

Use UK supermarket prices (Tesco, Aldi, Asda) for ingredient cost estimates. Be realistic and specific.

Return ONLY this JSON, nothing else:

{
  "recipe_name": "clean name of the recipe",
  "servings": number,
  "summary": "one sentence describing the recipe and who it is good for",
  "overall_grade": "A",
  "cost_score": number,
  "nutrition_score": number,
  "difficulty_score": number,
  "cost_per_serving_gbp": number,
  "total_cost_gbp": number,
  "protein_per_gbp_g": number,
  "calories_total": number,
  "protein_g_total": number,
  "carbs_g_total": number,
  "fat_g_total": number,
  "difficulty_label": "Easy",
  "time_minutes": number,
  "skill_level": "Beginner",
  "step_count": number,
  "ingredients": [
    { "name": "ingredient name", "estimated_cost_gbp": number }
  ],
  "verdict": "2-3 sentences explaining the grade honestly. Mention what it does well and what lets it down. Be direct.",
  "improvements": [
    "one specific swap or tweak to improve the score",
    "another practical improvement"
  ],
  "share_text": "I just scored my [recipe name] on rayannakum.co.uk/recipe-scorer. It got a [grade]! Cost per serving: £[x]. Try yours."
}`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipe } = req.body || {};

  if (!recipe || typeof recipe !== 'string') {
    return res.status(400).json({ error: 'No recipe provided' });
  }

  try {
    const result = await askGemini([{ text: recipe.slice(0, 6000) }], SYSTEM_PROMPT);
    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err);
  }
}
