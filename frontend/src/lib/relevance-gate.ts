import { getSupabaseAdmin } from './supabase-admin'

export interface RelevanceEvaluationResult {
  eligible: boolean
  relevance_score: number
  positioning_fit_score: number
  why_it_matters_to_pranavi: string | null
  topic_family: string
  relevance_reason: string
  relevance_status: 'accepted' | 'rejected' | 'failed'
}

const ALLOWED_KEYWORDS = [
  'fashion tech', 'fashion technology', 'craftsmanship', 'craft', 'textile',
  'ajrakh', 'ikat', 'chikankari', 'kantha', 'kalamkari', 'handloom', 'weaving',
  'sustainable fashion', 'circular fashion', 'clo 3d', '3d garment', 'digital garment',
  'digital fashion', 'apparel innovation', 'material innovation', 'garment manufacturing',
  'fashion supply chain', 'artisan', 'contemporary womenswear', 'design trend',
  'wearable tech', 'smart fabric', 'patternmaking', 'drape'
]

const REJECT_KEYWORDS = [
  'celebrity', 'gossip', 'hollywood', 'bollywood', 'sports', 'football', 'cricket',
  'election', 'politics', 'quarterly revenue', 'q1 profit', 'q2 profit', 'q3 profit', 'q4 profit',
  'earnings call', 'store opening', 'flagship store', 'appointed ceo', 'executive shuffle',
  'lawsuit', 'stock price', 'wall street'
]

/**
 * evaluateResearchRelevance
 * Evaluates whether a research signal genuinely aligns with Pranavi's positioning:
 * Code x Craft x Contemporary Design (Fashion Tech, Indian Textiles, Digital Garments, Sustainable Craft).
 * Enforces strict minimum relevance threshold (relevance_score >= 70 AND positioning_fit_score >= 70).
 */
export async function evaluateResearchRelevance(
  title: string,
  summary: string = '',
  rawContent: string = ''
): Promise<RelevanceEvaluationResult> {
  const combinedText = `${title} ${summary} ${rawContent}`.toLowerCase()

  // 1. Deterministic Rejection Check
  const hasRejectKeyword = REJECT_KEYWORDS.some(kw => combinedText.includes(kw))
  const hasAllowedKeyword = ALLOWED_KEYWORDS.some(kw => combinedText.includes(kw))

  if (hasRejectKeyword && !hasAllowedKeyword) {
    return {
      eligible: false,
      relevance_score: 30,
      positioning_fit_score: 20,
      why_it_matters_to_pranavi: null,
      topic_family: 'Generic News / Off-Topic',
      relevance_reason: 'Deterministic check flagged off-topic keywords (entertainment, corporate finance, or politics).',
      relevance_status: 'rejected'
    }
  }

  // 2. Semantic AI Relevance & Positioning Fit Evaluation via OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
  const textModel = process.env.OPENROUTER_TEXT_MODEL || 'google/gemini-3.5-flash'

  if (!openrouterKey || openrouterKey.startsWith('your-')) {
    // If AI unavailable and deterministic check is inconclusive, fail closed
    if (hasAllowedKeyword) {
      return {
        eligible: true,
        relevance_score: 75,
        positioning_fit_score: 75,
        why_it_matters_to_pranavi: "This topic relates directly to emerging textile and design innovations that Pranavi tracks.",
        topic_family: 'Textile Innovation & Craftsmanship',
        relevance_reason: 'Deterministic keyword match accepted signal in fallback mode.',
        relevance_status: 'accepted'
      }
    }
    throw new Error('RESEARCH_RELEVANCE_UNAVAILABLE: AI provider is unconfigured and deterministic relevance was inconclusive.')
  }

  const systemPrompt = `You are a fashion-tech editorial evaluator for Pranavi Yadav (Positioning: Code x Craft x Contemporary Design).
Evaluate the input research topic and return a JSON object with scores and structured feedback.

For "positioning_fit_score", score from 0 to 100 based on alignment with:
A. Indian craftsmanship / textile knowledge
B. fashion technology
C. AI-assisted design/research
D. CLO3D / 3D garment development
E. material/textile innovation
F. contemporary womenswear
G. craft preservation / artisan knowledge
H. design process / prototyping / iteration
I. intersection of technology + design
J. useful learning for an emerging fashion-tech designer

Stricly REJECT (assign score below 70) broad industry/business stories such as:
- Factory construction/investment
- Generic retail expansions, boutique setups
- Executive appointments, team shuffles
- Company earnings, profit margins, corporate finance
- Mass-market business/industry updates
- General sourcing news without any direct design/material/tech insight

For accepted signals (where both relevance and positioning score >= 70), provide "why_it_matters_to_pranavi":
- Must be a single, concise sentence showing exactly how this is useful to her.
- Start with: "This is useful for Pranavi because..."
- If a convincing sentence cannot be written, assign positioning_fit_score < 70 and make "why_it_matters_to_pranavi" null.

Return JSON object:
{
  "relevance_score": number (0 to 100, fashion/textiles focus),
  "positioning_fit_score": number (0 to 100, matching the Code/Craft/Tech guidelines above),
  "topic_family": string,
  "reason": string (short assessment),
  "why_it_matters_to_pranavi": string | null
}`

  const userPrompt = JSON.stringify({ title, summary: summary.substring(0, 500) })

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://fashion-tech-delta.vercel.app',
        'X-Title': 'Pranavi Fashion Tech Content Engine'
      },
      body: JSON.stringify({
        model: textModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    })

    if (!res.ok) {
      throw new Error(`OpenRouter HTTP ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    const parsed = JSON.parse(content)

    const relevanceScore = Number(parsed.relevance_score) || 0
    const positioningFitScore = Number(parsed.positioning_fit_score) || 0
    const whyItMatters = parsed.why_it_matters_to_pranavi || null

    const isEligible = relevanceScore >= 70 && positioningFitScore >= 70 && whyItMatters !== null

    return {
      eligible: isEligible,
      relevance_score: relevanceScore,
      positioning_fit_score: positioningFitScore,
      why_it_matters_to_pranavi: whyItMatters,
      topic_family: String(parsed.topic_family || 'Fashion Innovation'),
      relevance_reason: String(parsed.reason || 'Semantic relevance evaluated by AI.'),
      relevance_status: isEligible ? 'accepted' : 'rejected'
    }
  } catch (err: any) {
    if (hasAllowedKeyword) {
      return {
        eligible: true,
        relevance_score: 75,
        positioning_fit_score: 75,
        why_it_matters_to_pranavi: "This topic relates directly to emerging textile and design innovations that Pranavi tracks.",
        topic_family: 'Fashion Innovation',
        relevance_reason: 'Fallback keyword match accepted topic following AI error.',
        relevance_status: 'accepted'
      }
    }
    return {
      eligible: false,
      relevance_score: 40,
      positioning_fit_score: 40,
      why_it_matters_to_pranavi: null,
      topic_family: 'Unverified Topic',
      relevance_reason: `Relevance gate failed closed due to AI error: ${err.message}`,
      relevance_status: 'failed'
    }
  }
}
