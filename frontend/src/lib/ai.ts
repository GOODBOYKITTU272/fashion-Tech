import fs from 'fs/promises'
import path from 'path'
import { getSupabaseAdmin } from './supabase-admin'

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
  text_provider: string
  text_model: string
  image_provider?: string
  image_model?: string
  image_url?: string
  image_prompt?: string
  image_generation_status: 'none' | 'pending' | 'completed' | 'skipped' | 'failed'
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

// Call configured AI Text Provider (OpenRouter google/gemini-3.5-flash)
async function callTextModel(systemPrompt: string, userPrompt: string, jsonMode = false): Promise<CallModelResponse> {
  const startTime = Date.now()
  const provider = (process.env.AI_PROVIDER || 'openrouter').toLowerCase()
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const textModel = process.env.OPENROUTER_TEXT_MODEL || process.env.OPENROUTER_MODEL || 'google/gemini-3.5-flash'

  if (provider === 'openrouter' || (openrouterKey && openrouterKey.startsWith('sk-or-v1-'))) {
    if (!openrouterKey || openrouterKey.startsWith('your-')) {
      throw new Error('OPENROUTER_UNAVAILABLE: OPENROUTER_API_KEY is not configured in environment')
    }

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
      model: textModel,
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
 * generateImage
 * Generates visual asset via OpenRouter image generation model google/gemini-3.1-flash-image (Nano Banana 2).
 * Uploads generated asset to Supabase Storage bucket for persistent URL storage.
 * Throws IMAGE_GENERATION_UNAVAILABLE on failure.
 */
export async function generateImage(prompt: string): Promise<{
  image_url: string
  image_provider: string
  image_model: string
  image_prompt: string
}> {
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
  if (!openrouterKey || openrouterKey.startsWith('your-')) {
    throw new Error('IMAGE_GENERATION_UNAVAILABLE: OPENROUTER_API_KEY is not configured')
  }

  const imageModel = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-3.1-flash-image'

  try {
    // Attempt 1: Call OpenRouter images API endpoint
    const res = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://fashion-tech-delta.vercel.app',
        'X-Title': 'Pranavi Fashion Tech Content Engine'
      },
      body: JSON.stringify({
        model: imageModel,
        prompt: prompt,
        n: 1,
        size: '1024x1024'
      })
    })

    let imageUrl = ''
    if (res.ok) {
      const data = await res.json()
      imageUrl = data.data?.[0]?.url || data.images?.[0]?.url || ''
    }

    if (!imageUrl) {
      // Fallback Attempt 2: OpenRouter chat completions for image generation model
      const chatRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://fashion-tech-delta.vercel.app',
          'X-Title': 'Pranavi Fashion Tech Content Engine'
        },
        body: JSON.stringify({
          model: imageModel,
          messages: [{ role: 'user', content: `Generate fashion-tech graphic image for prompt: ${prompt}` }]
        })
      })

      if (chatRes.ok) {
        const chatData = await chatRes.json()
        const content = chatData.choices?.[0]?.message?.content || ''
        const urlMatch = content.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|webp)/i)
        imageUrl = urlMatch ? urlMatch[0] : ''
      }
    }

    if (!imageUrl) {
      throw new Error(`IMAGE_GENERATION_UNAVAILABLE: Image model ${imageModel} returned no image URL`)
    }

    // Persist image binary into Supabase Storage
    const imgBuffer = await (await fetch(imageUrl)).arrayBuffer()
    const fileName = `generated_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
    const admin = getSupabaseAdmin()

    const { data: storageData, error: storageErr } = await admin.storage
      .from('media')
      .upload(`fashion_tech/${fileName}`, imgBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    let persistentUrl = imageUrl
    if (!storageErr && storageData) {
      const { data: pubUrlData } = admin.storage.from('media').getPublicUrl(`fashion_tech/${fileName}`)
      persistentUrl = pubUrlData.publicUrl
    }

    return {
      image_url: persistentUrl,
      image_provider: 'openrouter',
      image_model: imageModel,
      image_prompt: prompt
    }
  } catch (err: any) {
    console.error('generateImage exception:', err)
    throw new Error(`IMAGE_GENERATION_UNAVAILABLE: Failed to generate image via ${imageModel}: ${err.message}`)
  }
}

/**
 * scoreTopic
 * Evaluates topic relevance using Text Model (google/gemini-3.5-flash).
 * Strictly validates all score fields (0-100). Normalizes recommended_pillar to schema check constraint.
 */
export async function scoreTopic(title: string, summary: string): Promise<ScoringResult> {
  const promptTemplate = await readPromptFile('topic-scoring.md')
  const systemPrompt = promptTemplate || 'Score this topic for relevance. Return JSON object with numeric scores between 0 and 100 for freshness_score, source_trust_score, us_relevance_score, uk_relevance_score, pranavi_alignment_score, total_opportunity_score, and string fields reasoning, recommended_pillar (one of Educational, Storytelling, Soft Selling), recommended_format.'
  const userPrompt = JSON.stringify({ title, summary })

  const aiRes = await callTextModel(systemPrompt, userPrompt, true)
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
 * Generates post text copy via Text Model (google/gemini-3.5-flash) and visual asset via Image Model (google/gemini-3.1-flash-image) when required.
 * Fails closed on any error.
 */
export async function generateDraft(title: string, summary: string, pillar = 'Educational', format = 'carousel', personalInput = ''): Promise<DraftResult> {
  const normPillar = normalizePillar(pillar)
  const systemPrompt = `You are an expert fashion-tech content creator for Pranavi (Positioning: Code × Craft × Contemporary Design). Generate a high-quality ${format} draft on pillar '${normPillar}'. Return JSON with keys: title, hook, full_content, pillar, format, image_prompt (a detailed prompt for fashion-tech visual generator).`
  const userPrompt = JSON.stringify({ title, summary, pillar: normPillar, format, personalInput })

  const aiRes = await callTextModel(systemPrompt, userPrompt, true)
  let data: any
  try {
    data = JSON.parse(aiRes.content)
  } catch (err: any) {
    throw new Error(`DRAFT_GENERATION_UNAVAILABLE: Failed to parse AI draft JSON response: ${err.message}`)
  }

  if (!data || typeof data !== 'object' || !data.title || !data.hook || !data.full_content) {
    throw new Error('DRAFT_GENERATION_UNAVAILABLE: AI draft output incomplete or missing required title/hook/full_content fields')
  }

  const isImageRequired = ['single_image', 'image', 'graphic', 'editorial_graphic'].includes(format.toLowerCase())
  const isTextOnly = ['text', 'text_only', 'article'].includes(format.toLowerCase())

  let imageResult: { image_url?: string; image_provider?: string; image_model?: string; image_prompt?: string } = {}
  let imageStatus: DraftResult['image_generation_status'] = 'none'

  const imagePromptText = data.image_prompt || `Editorial fashion-tech graphic: ${data.title}. Aesthetic: Code x Craft x Contemporary Design.`

  if (isImageRequired) {
    try {
      imageResult = await generateImage(imagePromptText)
      imageStatus = 'completed'
    } catch (err) {
      throw new Error(`IMAGE_GENERATION_UNAVAILABLE: Mandatory image generation failed for single-image format: ${(err as Error).message}`)
    }
  } else if (isTextOnly) {
    imageStatus = 'skipped'
  } else {
    // Optional image attempt for carousels / standard posts
    try {
      imageResult = await generateImage(imagePromptText)
      imageStatus = 'completed'
    } catch {
      imageStatus = 'skipped'
    }
  }

  return {
    title: String(data.title).trim(),
    hook: String(data.hook).trim(),
    full_content: String(data.full_content).trim(),
    pillar: normalizePillar(data.pillar || normPillar),
    format: String(data.format || format).trim(),
    text_provider: aiRes.provider,
    text_model: aiRes.model,
    image_provider: imageResult.image_provider || (imageStatus === 'completed' ? 'openrouter' : undefined),
    image_model: imageResult.image_model || (imageStatus === 'completed' ? (process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-3.1-flash-image') : undefined),
    image_url: imageResult.image_url,
    image_prompt: imagePromptText,
    image_generation_status: imageStatus
  }
}

/**
 * generateCarouselOutline
 */
export async function generateCarouselOutline(postBody: string, pillar = 'Educational', topicSummary = '', hookSelected = ''): Promise<any> {
  const systemPrompt = 'Generate a 5-slide carousel outline for LinkedIn. Return JSON object with title, slides array (with slide_no, headline, text), cta.'
  const userPrompt = JSON.stringify({ postBody, pillar: normalizePillar(pillar), topicSummary, hookSelected })

  const aiRes = await callTextModel(systemPrompt, userPrompt, true)
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
 */
export async function generateWeeklyReview(metricsData: any, brandProfile = {}): Promise<any> {
  const systemPrompt = 'Analyze weekly publishing metrics and generate insights. Return JSON object with summary, top_performing_pillar, recommendations array.'
  const userPrompt = JSON.stringify({ metricsData, brandProfile })

  const aiRes = await callTextModel(systemPrompt, userPrompt, true)
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
