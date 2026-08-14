import fs from 'fs/promises'
import path from 'path'

export interface ScoringResult {
  freshness_score: number
  source_trust_score: number
  us_relevance_score: number
  uk_relevance_score: number
  pranavi_alignment_score: number
  total_opportunity_score: number
  classification: 'HIGH' | 'GOOD' | 'BACKUP' | 'REJECT'
  reasoning: string
  recommended_pillar: 'Educational' | 'Storytelling' | 'Soft Selling'
  recommended_format: string
  provider: string
  model: string
}

export interface DraftResult {
  title: string
  hook: string
  full_content: string
  pillar: string
  format: string
  provider: string
  model: string
  pdf_url?: string
}

export function normalizePillar(inputPillar?: string): 'Educational' | 'Storytelling' | 'Soft Selling' {
  if (!inputPillar) return 'Educational'
  const p = inputPillar.toLowerCase()
  if (p.includes('story') || p.includes('brand') || p.includes('craft') || p.includes('evolution')) return 'Storytelling'
  if (p.includes('sell') || p.includes('product') || p.includes('conversion') || p.includes('market')) return 'Soft Selling'
  return 'Educational'
}

export function classifyScore(score: number): 'HIGH' | 'GOOD' | 'BACKUP' | 'REJECT' {
  if (score >= 85) return 'HIGH'
  if (score >= 75) return 'GOOD'
  if (score >= 65) return 'BACKUP'
  return 'REJECT'
}

async function readPromptFile(filename: string): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), 'src/prompts', filename)
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
}

function validateScoreField(fieldValue: any, fieldName: string): number {
  const num = Number(fieldValue)
  if (isNaN(num) || num < 0 || num > 100) {
    throw new Error(`SCORING_UNAVAILABLE: Field '${fieldName}' must be a valid number between 0 and 100. Received: ${fieldValue}`)
  }
  return num
}

export interface CallModelResponse {
  content: string
  provider: string
  model: string
  latency_ms: number
}

// Call configured AI provider (OpenRouter / OpenAI / Gemini)
async function callModel(systemPrompt: string, userPrompt: string, jsonMode = false): Promise<CallModelResponse> {
  const startTime = Date.now()
  const provider = (process.env.AI_PROVIDER || 'openrouter').toLowerCase()
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (provider === 'openrouter' || (openrouterKey && openrouterKey.startsWith('sk-or-v1-'))) {
    if (!openrouterKey || openrouterKey.startsWith('your-')) {
      throw new Error('OPENROUTER_UNAVAILABLE: OPENROUTER_API_KEY is not configured in environment')
    }

    const modelName = process.env.OPENROUTER_MODEL || 'google/gemini-3.5-flash'
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://fashion-tech-delta.vercel.app',
        'X-Title': 'Pranavi Fashion Tech Content Engine'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        temperature: 0.7
      })
    })

    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OPENROUTER_UNAVAILABLE: OpenRouter API error (HTTP ${res.status}): ${err}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('OPENROUTER_UNAVAILABLE: OpenRouter returned empty completion content')
    }

    return {
      content,
      provider: 'openrouter',
      model: modelName,
      latency_ms: latencyMs
    }
  }

  if (provider === 'openai') {
    if (!openaiKey || openaiKey.startsWith('your-')) {
      throw new Error('OPENAI_UNAVAILABLE: OpenAI API key is not configured in environment')
    }

    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        temperature: 0.7
      })
    })

    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OPENAI_UNAVAILABLE: OpenAI API error (HTTP ${res.status}): ${err}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('OPENAI_UNAVAILABLE: OpenAI returned empty completion content')
    }

    return {
      content,
      provider: 'openai',
      model: modelName,
      latency_ms: latencyMs
    }
  }

  throw new Error(`AI_PROVIDER_UNAVAILABLE: Unsupported AI provider '${provider}'`)
}

/**
 * scoreTopic
 * Evaluates topic relevance using LLM.
 * Strictly validates all score fields (0-100). Normalizes recommended_pillar to schema check constraint.
 * Truthfully records provider and model metadata.
 */
export async function scoreTopic(title: string, summary: string): Promise<ScoringResult> {
  const promptTemplate = await readPromptFile('topic-scoring.md')
  const systemPrompt = promptTemplate || 'Score this topic for relevance. Return JSON object with numeric scores between 0 and 100 for freshness_score, source_trust_score, us_relevance_score, uk_relevance_score, pranavi_alignment_score, total_opportunity_score, and string fields reasoning, recommended_pillar (one of Educational, Storytelling, Soft Selling), recommended_format.'
  const userPrompt = JSON.stringify({ title, summary })

  const aiRes = await callModel(systemPrompt, userPrompt, true)
  let parsed: any
  try {
    parsed = JSON.parse(aiRes.content)
  } catch (err: any) {
    throw new Error(`SCORING_UNAVAILABLE: Failed to parse AI JSON response: ${err.message}`)
  }

  const data = Array.isArray(parsed) ? parsed[0] : parsed
  if (!data || typeof data !== 'object') {
    throw new Error('SCORING_UNAVAILABLE: AI response did not contain a valid JSON object')
  }

  const freshness_score = validateScoreField(data.freshness_score, 'freshness_score')
  const source_trust_score = validateScoreField(data.source_trust_score, 'source_trust_score')
  const us_relevance_score = validateScoreField(data.us_relevance_score, 'us_relevance_score')
  const uk_relevance_score = validateScoreField(data.uk_relevance_score, 'uk_relevance_score')
  const pranavi_alignment_score = validateScoreField(data.pranavi_alignment_score, 'pranavi_alignment_score')
  const total_opportunity_score = validateScoreField(data.total_opportunity_score, 'total_opportunity_score')

  if (!data.reasoning || typeof data.reasoning !== 'string') {
    throw new Error('SCORING_UNAVAILABLE: Missing or invalid reasoning string in AI response')
  }

  const classification = classifyScore(total_opportunity_score)

  return {
    freshness_score,
    source_trust_score,
    us_relevance_score,
    uk_relevance_score,
    pranavi_alignment_score,
    total_opportunity_score,
    classification,
    reasoning: data.reasoning,
    recommended_pillar: normalizePillar(data.recommended_pillar),
    recommended_format: String(data.recommended_format || 'carousel'),
    provider: aiRes.provider,
    model: aiRes.model
  }
}

/**
 * generateDraft
 * Generates post draft using LLM.
 * Fails closed on any API error or missing content. ZERO synthetic copy fabrication.
 */
export async function generateDraft(title: string, summary: string, pillar = 'Educational', format = 'carousel', personalInput = ''): Promise<DraftResult> {
  const normPillar = normalizePillar(pillar)
  const systemPrompt = `You are an expert fashion-tech content creator for Pranavi (Positioning: Code × Craft × Contemporary Design). Generate a high-quality ${format} draft on pillar '${normPillar}'. Return JSON with keys: title, hook, full_content, pillar, format.`
  const userPrompt = JSON.stringify({ title, summary, pillar: normPillar, format, personalInput })

  const aiRes = await callModel(systemPrompt, userPrompt, true)
  let data: any
  try {
    data = JSON.parse(aiRes.content)
  } catch (err: any) {
    throw new Error(`DRAFT_GENERATION_UNAVAILABLE: Failed to parse AI draft JSON response: ${err.message}`)
  }

  if (!data || typeof data !== 'object' || !data.title || !data.hook || !data.full_content) {
    throw new Error('DRAFT_GENERATION_UNAVAILABLE: AI draft output incomplete or missing required title/hook/full_content fields')
  }

  return {
    title: String(data.title).trim(),
    hook: String(data.hook).trim(),
    full_content: String(data.full_content).trim(),
    pillar: normalizePillar(data.pillar || normPillar),
    format: String(data.format || format).trim(),
    provider: aiRes.provider,
    model: aiRes.model
  }
}

/**
 * generateCarouselOutline
 * Fails closed on any API error or invalid response.
 */
export async function generateCarouselOutline(postBody: string, pillar = 'Educational', topicSummary = '', hookSelected = ''): Promise<any> {
  const systemPrompt = 'Generate a 5-slide carousel outline for LinkedIn. Return JSON object with title, slides array (with slide_no, headline, text), cta.'
  const userPrompt = JSON.stringify({ postBody, pillar: normalizePillar(pillar), topicSummary, hookSelected })

  const aiRes = await callModel(systemPrompt, userPrompt, true)
  let data: any
  try {
    data = JSON.parse(aiRes.content)
  } catch (err: any) {
    throw new Error(`CAROUSEL_GENERATION_UNAVAILABLE: Failed to parse AI carousel JSON response: ${err.message}`)
  }

  if (!data || !Array.isArray(data.slides) || data.slides.length === 0) {
    throw new Error('CAROUSEL_GENERATION_UNAVAILABLE: AI carousel response missing required slides array')
  }

  return data
}

/**
 * generateWeeklyReview
 * Fails closed on any API error or invalid response.
 */
export async function generateWeeklyReview(metricsData: any, brandProfile = {}): Promise<any> {
  const systemPrompt = 'Analyze weekly publishing metrics and generate insights. Return JSON object with summary, top_performing_pillar, recommendations array.'
  const userPrompt = JSON.stringify({ metricsData, brandProfile })

  const aiRes = await callModel(systemPrompt, userPrompt, true)
  let data: any
  try {
    data = JSON.parse(aiRes.content)
  } catch (err: any) {
    throw new Error(`REVIEW_GENERATION_UNAVAILABLE: Failed to parse AI review JSON response: ${err.message}`)
  }

  if (!data || !data.summary) {
    throw new Error('REVIEW_GENERATION_UNAVAILABLE: AI review response incomplete')
  }

  return data
}
