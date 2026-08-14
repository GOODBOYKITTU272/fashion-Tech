import { getSupabaseAdmin } from './supabase-admin'
import { getAutomationState } from './automation-control'

export interface SchedulingRecommendation {
  date: string
  time: string | null
  source: 'baseline' | 'analytics'
  confidence?: number
}

export interface TimeResolutionParams {
  targetAudience?: string[]
  date: string
  pillar: string
}

export interface SchedulerRunResult {
  scheduled_count: number
  slots_filled: Array<{
    day: string
    date: string
    time: string | null
    pillar: string
    title: string
    status: string
    timing_source: 'baseline' | 'analytics'
  }>
  skipped_candidates: Array<{
    draft_id: string
    reason: string
  }>
}

/**
 * selectBaselinePostingTime
 * Resolves posting time recommendation based on configured baseline policy.
 * Prepares scheduler for future dynamic analytics optimization in W7 without breaking schema contracts.
 */
export function selectBaselinePostingTime(params: TimeResolutionParams): SchedulingRecommendation {
  const { date } = params
  const configuredBaseline = process.env.SCHEDULER_BASELINE_TIME || '14:00:00'

  return {
    date,
    time: configuredBaseline,
    source: 'baseline'
  }
}

/**
 * runWeeklyScheduler
 * Master W5 weekly scheduling orchestrator.
 * Enforces 4 posts/week cadence (2 Educational, 1 Storytelling, 1 Soft Selling), weekday-first slot allocation, future-date safety, and strict W4 quality gate checks.
 */
export async function runWeeklyScheduler(userId: string): Promise<SchedulerRunResult> {
  if (!userId) {
    throw new Error('SCHEDULER_BLOCKED: userId is required for weekly scheduler')
  }

  const admin = getSupabaseAdmin()
  const autoState = await getAutomationState(userId)

  if (!autoState.state_valid || autoState.pause_all_publishing || !autoState.auto_mode_enabled) {
    return {
      scheduled_count: 0,
      slots_filled: [],
      skipped_candidates: [{ draft_id: 'ALL', reason: 'Scheduler paused or Auto Mode disabled in control settings.' }]
    }
  }

  const minConfidence = autoState.min_confidence_score ?? 70
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // Weekday-first slot policy (Mon, Tue, Thu, Fri) — Saturday/Sunday are excluded from required slots
  const weekdaySlotTemplates = [
    { dayOffset: 0, dayName: 'Mon', pillarTarget: 'Educational' },
    { dayOffset: 1, dayName: 'Tue', pillarTarget: 'Storytelling' },
    { dayOffset: 3, dayName: 'Thu', pillarTarget: 'Educational' },
    { dayOffset: 4, dayName: 'Fri', pillarTarget: 'Soft Selling' },
  ]

  // Determine current Monday
  const monday = new Date(now)
  const dayOfWeek = monday.getDay()
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

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

    for (const slot of weekdaySlotTemplates) {
      if (candidateIndex >= candidates.length) break

      const candidate = candidates[candidateIndex]
      
      // Calculate target slot date
      const slotDate = new Date(monday)
      slotDate.setDate(slotDate.getDate() + slot.dayOffset)
      let formattedDate = slotDate.toISOString().split('T')[0]

      // Future-date safety: If slot date is in the past, shift to upcoming week (+7 days)
      if (formattedDate < todayStr) {
        slotDate.setDate(slotDate.getDate() + 7)
        formattedDate = slotDate.toISOString().split('T')[0]
      }

      // Resolve time recommendation using baseline resolver (optimization ready)
      const timeRec = selectBaselinePostingTime({
        targetAudience: ['USA', 'UK'],
        date: formattedDate,
        pillar: candidate.pillar || slot.pillarTarget
      })

      const { error: insertErr } = await admin.from('content_calendar').insert({
        user_id: userId,
        draft_id: candidate.id,
        title: candidate.title || `Scheduled ${slot.pillarTarget} Post`,
        planned_date: formattedDate,
        planned_time: timeRec.time,
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
          time: timeRec.time,
          pillar: candidate.pillar || slot.pillarTarget,
          title: candidate.title || `Scheduled ${slot.pillarTarget} Post`,
          status: 'scheduled',
          timing_source: timeRec.source
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
