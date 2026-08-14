import { getSupabaseAdmin } from './supabase-admin'

export interface RelevanceEvaluationResult {
  eligible: boolean
  relevance_score: number
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
 * Enforces strict minimum relevance threshold (relevance_score >= 70).
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
      topic_family: 'Generic News / Off-Topic',
      relevance_reason: 'Deterministic check flagged off-topic keywords (entertainment, corporate finance, or politics).',
      relevance_status: 'rejected'
    }
  }

  // 2. Semantic AI Relevance Evaluation via OpenRouter Text Model (google/gemini-3.5-flash)
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
  const textModel = process.env.OPENROUTER_TEXT_MODEL || 'google/gemini-3.5-flash'

  if (!openrouterKey || openrouterKey.startsWith('your-')) {
    // If AI unavailable and deterministic check is inconclusive, fail closed
    if (hasAllowedKeyword) {
      return {
        eligible: true,
        relevance_score: 75,
        topic_family: 'Textile Innovation & Craftsmanship',
        relevance_reason: 'Deterministic keyword match accepted signal in fallback mode.',
        relevance_status: 'accepted'
      }
    }
    throw new Error('RESEARCH_RELEVANCE_UNAVAILABLE: AI provider is unconfigured and deterministic relevance was inconclusive.')
  }

  const systemPrompt = `You are a fashion-tech editorial evaluator for Pranavi Yadav (Positioning: Code x Craft x Contemporary Design). 
Evaluate whether the research topic is relevant to:
Allowed Topics: Fashion technology, Indian craftsmanship/textiles (Ajrakh, Ikat, Kantha, Chikankari, Kalamkari), textile & material innovation, sustainable/circular fashion, CLO 3D, digital garments, contemporary design trends, fashion supply chain tech.
Rejected Topics: Celebrity gossip, generic entertainment, sports, politics, generic corporate earnings, store openings, executive shuffles.

Return JSON object:
{
  "eligible": boolean,
  "relevance_score": number (0 to 100),
  "topic_family": string,
  "reason": string
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
        temperature: 0.3
      })
    })

    if (!res.ok) {
      throw new Error(`OpenRouter HTTP ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    const parsed = JSON.parse(content)

    const score = Number(parsed.relevance_score) || 0
    const isEligible = Boolean(parsed.eligible) && score >= 70

    return {
      eligible: isEligible,
      relevance_score: score,
      topic_family: String(parsed.topic_family || 'Fashion Innovation'),
      relevance_reason: String(parsed.reason || 'Semantic relevance evaluated by AI.'),
      relevance_status: isEligible ? 'accepted' : 'rejected'
    }
  } catch (err: any) {
    if (hasAllowedKeyword) {
      return {
        eligible: true,
        relevance_score: 75,
        topic_family: 'Fashion Innovation',
        relevance_reason: 'Fallback keyword match accepted topic following AI error.',
        relevance_status: 'accepted'
      }
    }
    return {
      eligible: false,
      relevance_score: 40,
      topic_family: 'Unverified Topic',
      relevance_reason: `Relevance gate failed closed due to AI error: ${err.message}`,
      relevance_status: 'failed'
    }
  }
}
