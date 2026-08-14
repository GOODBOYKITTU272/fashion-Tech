import { promises as fs } from 'fs'
import path from 'path'

export type ScoringResult = {
  freshness_score: number
  source_trust_score: number
  us_relevance_score: number
  uk_relevance_score: number
  pranavi_alignment_score: number
  total_opportunity_score: number
  reasoning: string
  recommended_pillar: 'Educational' | 'Storytelling' | 'Soft Selling'
  recommended_format: 'carousel' | 'text' | 'image' | 'video'
}

export type DraftResult = {
  hooks: string[]
  body: string
  cta: string
  hashtags: string[]
  fact_flags: string[]
}

// Helper to read prompt files from /prompts/ directory
async function readPromptFile(filename: string): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), '..', 'prompts', filename)
    return await fs.readFile(filePath, 'utf8')
  } catch {
    try {
      // Fallback if running in build context
      const filePath = path.join(process.cwd(), 'prompts', filename)
      return await fs.readFile(filePath, 'utf8')
    } catch {
      return ''
    }
  }
}

// Call configured AI provider
async function callModel(systemPrompt: string, userPrompt: string, jsonMode = false): Promise<string> {
  const provider = process.env.AI_PROVIDER || 'openai'
  
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey.startsWith('your-')) {
      throw new Error('OpenAI API key not configured')
    }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        temperature: 0.7
      })
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI API error: ${err}`)
    }
    const data = await res.json()
    return data.choices[0].message.content || ''
  }

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Gemini API key not configured')
    }
    // Using Gemini 1.5 Flash
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Input:\n${userPrompt}` }] }
        ],
        generationConfig: jsonMode ? { responseMimeType: 'application/json' } : undefined
      })
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini API error: ${err}`)
    }
    const data = await res.json()
    return data.candidates[0].content.parts[0].text || ''
  }

  if (provider === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434'
    const model = process.env.OLLAMA_MODEL || 'mistral'
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        format: jsonMode ? 'json' : undefined
      })
    })
    if (!res.ok) {
      throw new Error(`Ollama error: failed to connect to local model ${model}`)
    }
    const data = await res.json()
    return data.message.content || ''
  }

  throw new Error(`Unknown AI provider: ${provider}`)
}

export async function scoreTopic(title: string, summary: string): Promise<ScoringResult> {
  const promptTemplate = await readPromptFile('topic-scoring.md')
  const systemPrompt = promptTemplate || 'Score this topic for relevance.'
  const userPrompt = JSON.stringify({ title, summary })

  try {
    const rawResponse = await callModel(systemPrompt, userPrompt, true)
    // Parse response
    const parsed = JSON.parse(rawResponse)
    // If it returns an array, take the first element
    const data = Array.isArray(parsed) ? parsed[0] : parsed
    return {
      freshness_score: Number(data.freshness_score ?? 50),
      source_trust_score: Number(data.source_trust_score ?? 50),
      us_relevance_score: Number(data.us_relevance_score ?? 50),
      uk_relevance_score: Number(data.uk_relevance_score ?? 50),
      pranavi_alignment_score: Number(data.pranavi_alignment_score ?? 50),
      total_opportunity_score: Number(data.total_opportunity_score ?? 50),
      reasoning: data.reasoning ?? 'Scored by AI abstraction layer.',
      recommended_pillar: data.recommended_pillar ?? 'Educational',
      recommended_format: data.recommended_format ?? 'carousel'
    }
  } catch (error: any) {
    console.error('Scoring AI failure, using fallback scores:', error)
    // Fallback safe values if AI fails or key is missing
    return {
      freshness_score: 50,
      source_trust_score: 50,
      us_relevance_score: 50,
      uk_relevance_score: 50,
      pranavi_alignment_score: 50,
      total_opportunity_score: 50,
      reasoning: `Fallback scoring activated. Reason: ${error.message || 'unknown error'}`,
      recommended_pillar: 'Educational',
      recommended_format: 'carousel'
    }
  }
}

export async function generateDraft(
  title: string,
  summary: string,
  pillar: string,
  format: string,
  personalInput?: string
): Promise<DraftResult> {
  const promptTemplate = await readPromptFile('post-drafting.md')
  const systemPrompt = promptTemplate || 'Draft a LinkedIn post.'
  const userPrompt = JSON.stringify({
    topic_title: title,
    topic_summary: summary,
    pillar,
    format,
    personal_input: personalInput || ''
  })

  try {
    const rawResponse = await callModel(systemPrompt, userPrompt, true)
    const data = JSON.parse(rawResponse)
    return {
      hooks: Array.isArray(data.hooks) ? data.hooks : [data.hook || ''],
      body: data.body || '',
      cta: data.cta || '',
      hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
      fact_flags: Array.isArray(data.fact_flags) ? data.fact_flags : []
    }
  } catch (error: any) {
    console.error('Drafting AI failure, using fallback draft:', error)
    return {
      hooks: [
        `Exploring the latest developments in ${title}...`,
        `Have you seen the recent updates regarding ${title}?`
      ],
      body: `Here is a placeholder draft for ${title}. Summary: ${summary}. \n\nPlease write your thoughts here.`,
      cta: 'What are your thoughts on this?',
      hashtags: ['#FashionTech', '#IndianCraft'],
      fact_flags: [`Fallback draft mode active due to AI error: ${error.message}`]
    }
  }
}

export type CarouselSlide = {
  slide_no: number
  type: string
  headline: string
  subtext: string
  visual_description: string
  layout_note: string
}

export type CarouselResult = {
  template_family: 'A' | 'B' | 'C'
  slide_count: number
  slides: CarouselSlide[]
  overall_visual_note: string
  image_generation_prompt: string
}

export async function generateCarouselOutline(
  postBody: string,
  pillar: string,
  topicSummary: string,
  hookSelected: string
): Promise<CarouselResult> {
  const promptTemplate = await readPromptFile('carousel-generation.md')
  const systemPrompt = promptTemplate || 'Generate a visual brief and carousel outline.'
  const userPrompt = JSON.stringify({
    post_body: postBody,
    pillar,
    topic_summary: topicSummary,
    hook_selected: hookSelected
  })

  try {
    const rawResponse = await callModel(systemPrompt, userPrompt, true)
    const data = JSON.parse(rawResponse)
    return {
      template_family: data.template_family || 'A',
      slide_count: Number(data.slide_count || 5),
      slides: Array.isArray(data.slides) ? data.slides : [],
      overall_visual_note: data.overall_visual_note || 'A clean, modern grid style.',
      image_generation_prompt: data.image_generation_prompt || 'A minimal clean graphic.'
    }
  } catch (error: any) {
    console.error('Carousel AI failure, using fallback:', error)
    return {
      template_family: 'A',
      slide_count: 5,
      slides: [
        { slide_no: 1, type: 'cover', headline: 'Code × Craft', subtext: 'Exploring contemporary design.', visual_description: 'Minimal text graphic.', layout_note: 'Centered text' },
        { slide_no: 2, type: 'content', headline: 'The Evolution', subtext: 'How digital tools interface with craft.', visual_description: 'Split screen diagram.', layout_note: 'Side-by-side' },
        { slide_no: 3, type: 'content', headline: 'The Opportunity', subtext: 'Streamlining craft design cycles.', visual_description: 'Graph showing efficiency.', layout_note: 'Data visual' },
        { slide_no: 4, type: 'insight', headline: 'Authenticity First', subtext: 'Indian craftsmanship on global couture.', visual_description: 'Artisan textile closeup.', layout_note: 'Image focused' },
        { slide_no: 5, type: 'cta', headline: 'Join the Conversation', subtext: 'Follow for weekly design updates.', visual_description: 'CTA buttons.', layout_note: 'Minimal footer' }
      ],
      overall_visual_note: `Fallback visual strategy active due to error: ${error.message}`,
      image_generation_prompt: 'A minimal modern fashion technology aesthetic background'
    }
  }
}

export async function generateWeeklyReview(metrics: any[], brandProfile: any): Promise<{ summary: string; recommendations: any }> {
  // Try loading prompts/weekly-review.md if it exists, otherwise use fallback system prompt
  let systemPrompt = 'Analyze these LinkedIn post metrics against the brand profile. Identify insights and list 3 recommendations for next week.'
  try {
    const filePath = path.join(process.cwd(), '..', 'prompts', 'weekly-review.md')
    systemPrompt = await fs.readFile(filePath, 'utf8')
  } catch {}

  const userPrompt = JSON.stringify({ metrics, brandProfile })

  try {
    const rawResponse = await callModel(systemPrompt, userPrompt, true)
    const data = JSON.parse(rawResponse)
    return {
      summary: data.summary || 'Weekly review complete.',
      recommendations: data.recommendations || {}
    }
  } catch (error: any) {
    console.error('Weekly Review AI failure, using fallback:', error)
    return {
      summary: `Weekly performance review could not be processed automatically due to AI error: ${error.message}`,
      recommendations: {
        insight_1: 'Maintain consistent posting schedule of 4 posts per week.',
        insight_2: 'Increase focus on digital draping (CLO3D) posts which show high interest.',
        insight_3: 'Ensure hooks are under 2 lines to maximize mobile readability.'
      }
    }
  }
}


