import { getSupabaseAdmin } from './supabase-admin'
import { getAutomationState } from './automation-control'

export interface SchedulerRunResult {
  scheduled_count: number
  slots_filled: Array<{
    day: string
    date: string
    pillar: string
    title: string
    status: string
  }>
  skipped_candidates: Array<{
    draft_id: string
    reason: string
  }>
}

export async function runWeeklyScheduler(userId: string): Promise<SchedulerRunResult> {
  if (!userId) {
    throw new Error('SCHEDULER_BLOCKED: userId is required for weekly scheduler')
  }

  const admin = getSupabaseAdmin()
  const autoState = await getAutomationState(userId)
  const minConfidence = autoState.min_confidence_score ?? 70

  const now = new Date()

  // Determine target week dates (Mon, Wed, Thu, Sat)
  const monday = new Date(now)
  const dayOfWeek = monday.getDay()
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  const slots = [
    { dayOffset: 0, dayName: 'Mon', pillarTarget: 'Educational' },
    { dayOffset: 2, dayName: 'Wed', pillarTarget: 'Storytelling' },
    { dayOffset: 3, dayName: 'Thu', pillarTarget: 'Educational' },
    { dayOffset: 5, dayName: 'Sat', pillarTarget: 'Soft Selling' },
  ]

  const slotsFilled: SchedulerRunResult['slots_filled'] = []
  const skippedCandidates: SchedulerRunResult['skipped_candidates'] = []

  // Fetch quality-passed candidates from DB with non-null confidence >= threshold
  const { data: candidates } = await admin
    .from('drafts')
    .select('id, user_id, title, pillar, format, quality_gate_status, confidence_score')
    .eq('user_id', userId)
    .eq('quality_gate_status', 'passed')
    .not('confidence_score', 'is', null)
    .gte('confidence_score', minConfidence)
    .order('created_at', { ascending: false })

  // Log skipped candidates with pending/failed or low confidence
  const { data: unapproved } = await admin
    .from('drafts')
    .select('id, quality_gate_status, confidence_score')
    .eq('user_id', userId)
    .or(`quality_gate_status.neq.passed,confidence_score.is.null,confidence_score.lt.${minConfidence}`)

  if (unapproved) {
    for (const d of unapproved) {
      skippedCandidates.push({
        draft_id: d.id,
        reason: `Quality gate not passed or confidence (${d.confidence_score}) below threshold (${minConfidence}%)`
      })
    }
  }

  let scheduledCount = 0

  if (candidates && candidates.length > 0) {
    let candidateIndex = 0

    for (const slot of slots) {
      if (candidateIndex >= candidates.length) break

      const candidate = candidates[candidateIndex]
      const slotDate = new Date(monday)
      slotDate.setDate(slotDate.getDate() + slot.dayOffset)
      const formattedDate = slotDate.toISOString().split('T')[0]

      const { error: insertErr } = await admin.from('content_calendar').insert({
        user_id: userId,
        draft_id: candidate.id,
        title: candidate.title || `Scheduled ${slot.pillarTarget} Post`,
        planned_date: formattedDate,
        planned_time: '18:30:00',
        pillar: candidate.pillar || slot.pillarTarget,
        format: candidate.format || 'carousel',
        status: 'scheduled',
        quality_gate_status: 'passed',
        confidence_score: candidate.confidence_score
      })

      if (!insertErr) {
        slotsFilled.push({
          day: slot.dayName,
          date: formattedDate,
          pillar: candidate.pillar || slot.pillarTarget,
          title: candidate.title || `Scheduled ${slot.pillarTarget} Post`,
          status: 'scheduled'
        })
        scheduledCount++
        candidateIndex++
      }
    }
  }

  return {
    scheduled_count: scheduledCount,
    slots_filled: slotsFilled,
    skipped_candidates: skippedCandidates
  }
}
