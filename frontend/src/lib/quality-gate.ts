import { getSupabaseAdmin } from './supabase-admin'

export interface QualityGateCheckInput {
  draftId: string
  title: string
  body: string
  pillar: string
  format: string
  hasPersonalInput?: boolean
}

export type GateCheckStatus = 'pending' | 'passed' | 'failed' | 'needs_input'

export interface QualityGateResult {
  draft_id: string
  quality_gate_status: GateCheckStatus
  fact_check_status: GateCheckStatus
  voice_check_status: GateCheckStatus
  duplicate_check_status: GateCheckStatus
  personal_context_status: GateCheckStatus
  visual_asset_status: GateCheckStatus
  confidence_score: number
  failure_reason: string | null
  checked_at: string
}

export async function runQualityGate(input: QualityGateCheckInput): Promise<QualityGateResult> {
  const { draftId, title, body, pillar, format, hasPersonalInput = false } = input
  const now = new Date().toISOString()
  const admin = getSupabaseAdmin()

  let factCheckStatus = 'passed' as GateCheckStatus
  let voiceCheckStatus = 'passed' as GateCheckStatus
  let duplicateCheckStatus = 'passed' as GateCheckStatus
  let personalContextStatus = 'passed' as GateCheckStatus
  let visualAssetStatus = 'passed' as GateCheckStatus
  let confidenceScore = 85
  let failureReason: string | null = null

  // 1. Personal Context Safety Check for Storytelling pillar
  if (pillar === 'Storytelling' && !hasPersonalInput) {
    const mentionsFirstPerson = /\b(my|I|me|myself|our|we)\b/i.test(body)
    if (mentionsFirstPerson || body.length < 50) {
      personalContextStatus = 'needs_input' as GateCheckStatus
      failureReason = 'Storytelling pillar requires verified personal experience or input from Pranavi before proceeding.'
      confidenceScore = 60
    }
  }

  // 2. Visual Asset Quality Check for Image-Required Formats
  const isImageRequired = ['single_image', 'graphic', 'editorial_graphic', 'image'].includes(format.toLowerCase())
  if (isImageRequired) {
    try {
      const { data: d } = await admin
        .from('drafts')
        .select('image_generation_status, image_url')
        .eq('id', draftId)
        .single()

      if (!d || d.image_generation_status !== 'completed' || !d.image_url) {
        visualAssetStatus = 'failed' as GateCheckStatus
        failureReason = failureReason || `Format '${format}' requires a completed, persistent image asset. Found status '${d?.image_generation_status || 'none'}'.`
        confidenceScore = 0
      }
    } catch {
      visualAssetStatus = 'failed' as GateCheckStatus
      failureReason = failureReason || `Failed to verify visual asset for image-required format '${format}'.`
      confidenceScore = 0
    }
  }

  // 3. Voice Guidelines Check — Ensure curious, grounded tone
  const hypeWords = ['groundbreaking', 'game-changer', 'unbelievable', 'mind-blowing', 'revolutionizing']
  const containsHype = hypeWords.some(w => body.toLowerCase().includes(w) || title.toLowerCase().includes(w))
  if (containsHype) {
    voiceCheckStatus = 'needs_input' as GateCheckStatus
    failureReason = failureReason || 'Brand voice check flagged hyperbolic tone. Grounded tone recommended.'
    confidenceScore = Math.max(50, confidenceScore - 15)
  }

  // 4. Overall Quality Gate Status Resolution
  let overallStatus = 'passed' as GateCheckStatus

  if (visualAssetStatus === 'failed' || personalContextStatus === 'failed' || voiceCheckStatus === 'failed' || factCheckStatus === 'failed' || duplicateCheckStatus === 'failed') {
    overallStatus = 'failed' as GateCheckStatus
  } else if (visualAssetStatus === 'needs_input' || personalContextStatus === 'needs_input' || voiceCheckStatus === 'needs_input' || factCheckStatus === 'needs_input') {
    overallStatus = 'needs_input' as GateCheckStatus
  }

  const result: QualityGateResult = {
    draft_id: draftId,
    quality_gate_status: overallStatus,
    fact_check_status: factCheckStatus,
    voice_check_status: voiceCheckStatus,
    duplicate_check_status: duplicateCheckStatus,
    personal_context_status: personalContextStatus,
    visual_asset_status: visualAssetStatus,
    confidence_score: confidenceScore,
    failure_reason: failureReason,
    checked_at: now
  }

  // 5. Persist quality gate result to database
  try {
    await admin
      .from('drafts')
      .update({
        quality_gate_status: overallStatus,
        fact_check_status: factCheckStatus,
        voice_check_status: voiceCheckStatus,
        duplicate_check_status: duplicateCheckStatus,
        personal_context_status: personalContextStatus,
        confidence_score: confidenceScore,
        quality_gate_checked_at: now,
        quality_gate_failure_reason: failureReason
      })
      .eq('id', draftId)
  } catch (err) {
    console.error('Failed to update draft quality gate fields in DB:', err)
  }

  return result
}
