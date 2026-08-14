import { getSupabaseAdmin } from './supabase-admin'
import { runAgentReachW1Ingestion } from './agent-reach-adapter'
import { scoreTopic, generateDraft } from './ai'
import { runQualityGate } from './quality-gate'
import { runWeeklyScheduler } from './scheduler'
import { publishScheduledPost } from './linkedin-publisher'

export interface PipelineExecutionTrace {
  run_id: string
  user_id: string
  started_at: string
  completed_at: string | null
  current_stage: 'W1_INGESTION' | 'W2_SCORING' | 'W3_DRAFTING' | 'W4_QUALITY_GATE' | 'W5_SCHEDULER' | 'W6_PUBLISHER_DRY_RUN' | 'COMPLETED'
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED'
  error_code: string | null
  failure_reason: string | null
  id_trace: {
    research_signal_id: string | null
    topic_cluster_id: string | null
    topic_score_id: string | null
    draft_id: string | null
    calendar_id: string | null
    publishing_attempt_id: string | null
  }
  stage_results: {
    w1_ingestion?: any
    w2_scoring?: any
    w3_drafting?: any
    w4_quality_gate?: any
    w5_scheduler?: any
    w6_publisher_dry_run?: any
  }
}

/**
 * runProductionPipeline
 * Master production pipeline orchestrator running on Vercel Serverless.
 * Executes W1 -> W6 dry-run using OpenRouter google/gemini-3.5-flash (Text) and google/gemini-3.1-flash-image (Image).
 * Fully fail-closed with persisted run history in public.pipeline_runs.
 */
export async function runProductionPipeline(userId: string): Promise<PipelineExecutionTrace> {
  if (!userId) {
    throw new Error('PIPELINE_BLOCKED: userId is required for production pipeline execution')
  }

  const admin = getSupabaseAdmin()
  const startedAt = new Date().toISOString()

  // 1. Create pipeline_runs record in DB
  const { data: runRecord, error: runErr } = await admin
    .from('pipeline_runs')
    .insert({
      user_id: userId,
      started_at: startedAt,
      current_stage: 'W1_INGESTION',
      status: 'RUNNING'
    })
    .select()
    .single()

  if (runErr || !runRecord) {
    throw new Error(`Failed to initialize pipeline_runs DB record: ${runErr?.message}`)
  }

  const runId = runRecord.id
  const trace: PipelineExecutionTrace = {
    run_id: runId,
    user_id: userId,
    started_at: startedAt,
    completed_at: null,
    current_stage: 'W1_INGESTION',
    status: 'RUNNING',
    error_code: null,
    failure_reason: null,
    id_trace: {
      research_signal_id: null,
      topic_cluster_id: null,
      topic_score_id: null,
      draft_id: null,
      calendar_id: null,
      publishing_attempt_id: null
    },
    stage_results: {}
  }

  const updateDbRun = async (updates: Record<string, any>) => {
    const { error: updErr } = await admin.from('pipeline_runs').update(updates).eq('id', runId)
    if (updErr) {
      console.error(`Fail-closed DB write error updating pipeline_runs record ${runId}:`, updErr)
    }
  }

  try {
    // ==================================================
    // STAGE W1: SAFE RESEARCH SIGNAL INGESTION
    // ==================================================
    trace.current_stage = 'W1_INGESTION'
    await updateDbRun({ current_stage: 'W1_INGESTION' })

    const w1Result = await runAgentReachW1Ingestion(userId)
    trace.stage_results.w1_ingestion = w1Result

    // ==================================================
    // STAGE W2: PROCESS & SCORE UNPROCESSED SIGNALS STRICTLY
    // ==================================================
    trace.current_stage = 'W2_SCORING'
    await updateDbRun({ current_stage: 'W2_SCORING' })

    // Query strictly for unprocessed research signals (processed = false)
    const { data: unprocessedSignals } = await admin
      .from('research_signals')
      .select('*')
      .eq('processed', false)
      .order('captured_at', { ascending: false })
      .limit(1)

    if (!unprocessedSignals || unprocessedSignals.length === 0) {
      trace.status = 'BLOCKED'
      trace.error_code = 'NO_ELIGIBLE_SIGNAL'
      trace.failure_reason = 'No unprocessed research signals found in database for pipeline evaluation.'
      trace.completed_at = new Date().toISOString()
      await updateDbRun({
        status: 'BLOCKED',
        error_code: trace.error_code,
        failure_reason: trace.failure_reason,
        completed_at: trace.completed_at
      })
      return trace
    }

    const signal = unprocessedSignals[0]
    trace.id_trace.research_signal_id = signal.id

    // Call W2 scoreTopic via Text Model (OpenRouter google/gemini-3.5-flash)
    const scoreResult = await scoreTopic(signal.title, signal.summary || '')

    // Create topic_clusters record
    const { data: cluster, error: clusterErr } = await admin
      .from('topic_clusters')
      .insert({
        primary_signal_id: signal.id,
        cluster_title: signal.title,
        summary: signal.summary || 'Summary pending analysis.',
        signal_count: 1
      })
      .select()
      .single()

    if (clusterErr || !cluster) {
      throw new Error(`Failed to persist topic_cluster: ${clusterErr?.message}`)
    }

    trace.id_trace.topic_cluster_id = cluster.id

    // Persist topic_scores record with truthful model metadata
    const modelMetadata = `${scoreResult.provider}/${scoreResult.model}`
    const { data: topicScoreRow, error: scoreErr } = await admin
      .from('topic_scores')
      .insert({
        cluster_id: cluster.id,
        freshness_score: scoreResult.freshness_score,
        source_trust_score: scoreResult.source_trust_score,
        us_relevance_score: scoreResult.us_relevance_score,
        uk_relevance_score: scoreResult.uk_relevance_score,
        pranavi_alignment_score: scoreResult.pranavi_alignment_score,
        total_opportunity_score: scoreResult.total_opportunity_score,
        scored_by_model: modelMetadata
      })
      .select()
      .single()

    if (scoreErr || !topicScoreRow) {
      throw new Error(`Failed to persist topic_scores: ${scoreErr?.message}`)
    }

    trace.id_trace.topic_score_id = topicScoreRow.id

    // Mark signal as processed
    await admin.from('research_signals').update({ processed: true }).eq('id', signal.id)

    trace.stage_results.w2_scoring = {
      text_provider: scoreResult.provider,
      text_model: scoreResult.model,
      signal_id: signal.id,
      cluster_id: cluster.id,
      topic_score_id: topicScoreRow.id,
      score_breakdown: {
        freshness: scoreResult.freshness_score,
        source_trust: scoreResult.source_trust_score,
        us_relevance: scoreResult.us_relevance_score,
        uk_relevance: scoreResult.uk_relevance_score,
        pranavi_alignment: scoreResult.pranavi_alignment_score
      },
      total_opportunity_score: scoreResult.total_opportunity_score,
      classification: scoreResult.classification,
      recommended_pillar: scoreResult.recommended_pillar,
      recommended_format: scoreResult.recommended_format
    }

    await updateDbRun({
      research_signal_id: signal.id,
      topic_cluster_id: cluster.id,
      topic_score_id: topicScoreRow.id
    })

    // Strict score threshold gate: Must be >= 75 (GOOD or HIGH) to proceed automatically
    if (scoreResult.total_opportunity_score < 75) {
      trace.status = 'BLOCKED'
      trace.error_code = 'SCORE_BELOW_THRESHOLD'
      trace.failure_reason = `Topic score (${scoreResult.total_opportunity_score}) classification '${scoreResult.classification}' is below minimum required threshold (75).`
      trace.completed_at = new Date().toISOString()
      await updateDbRun({
        status: 'BLOCKED',
        error_code: trace.error_code,
        failure_reason: trace.failure_reason,
        completed_at: trace.completed_at
      })
      return trace
    }

    // ==================================================
    // STAGE W3: DRAFT GENERATION (TEXT + IMAGE SPLIT)
    // ==================================================
    trace.current_stage = 'W3_DRAFTING'
    await updateDbRun({ current_stage: 'W3_DRAFTING' })

    const draftResult = await generateDraft(
      signal.title,
      signal.summary || '',
      scoreResult.recommended_pillar,
      scoreResult.recommended_format
    )

    // Insert draft into DB with text & image provider model metadata
    const { data: draft, error: draftErr } = await admin
      .from('drafts')
      .insert({
        user_id: userId,
        content_idea_id: null,
        title: draftResult.title,
        hook: draftResult.hook,
        full_content: draftResult.full_content,
        pillar: draftResult.pillar,
        format: draftResult.format,
        quality_gate_status: 'pending',
        confidence_score: null,
        text_provider: draftResult.text_provider,
        text_model: draftResult.text_model,
        image_provider: draftResult.image_provider,
        image_model: draftResult.image_model,
        image_url: draftResult.image_url,
        image_prompt: draftResult.image_prompt,
        image_generation_status: draftResult.image_generation_status
      })
      .select()
      .single()

    if (draftErr || !draft) {
      throw new Error(`Failed to persist draft with image metadata: ${draftErr?.message}`)
    }

    trace.id_trace.draft_id = draft.id
    trace.stage_results.w3_drafting = {
      text_provider: draftResult.text_provider,
      text_model: draftResult.text_model,
      image_provider: draftResult.image_provider,
      image_model: draftResult.image_model,
      image_url: draftResult.image_url,
      image_prompt: draftResult.image_prompt,
      image_generation_status: draftResult.image_generation_status,
      draft_id: draft.id,
      title: draft.title,
      pillar: draft.pillar,
      format: draft.format
    }

    await updateDbRun({ draft_id: draft.id })

    // ==================================================
    // STAGE W4: AUTHORITATIVE QUALITY GATE CHECK
    // ==================================================
    trace.current_stage = 'W4_QUALITY_GATE'
    await updateDbRun({ current_stage: 'W4_QUALITY_GATE' })

    const qgResult = await runQualityGate({
      draftId: draft.id,
      title: draft.title,
      body: draft.full_content,
      pillar: draft.pillar,
      format: draft.format
    })

    trace.stage_results.w4_quality_gate = qgResult

    if (qgResult.quality_gate_status !== 'passed') {
      trace.status = 'BLOCKED'
      trace.error_code = 'QUALITY_GATE_FAILED'
      trace.failure_reason = qgResult.failure_reason || `Quality gate failed with status '${qgResult.quality_gate_status}'`
      trace.completed_at = new Date().toISOString()
      await updateDbRun({
        status: 'BLOCKED',
        error_code: trace.error_code,
        failure_reason: trace.failure_reason,
        completed_at: trace.completed_at
      })
      return trace
    }

    // ==================================================
    // STAGE W5: AUTHORITATIVE WEEKLY SCHEDULER
    // ==================================================
    trace.current_stage = 'W5_SCHEDULER'
    await updateDbRun({ current_stage: 'W5_SCHEDULER' })

    const schedulerResult = await runWeeklyScheduler(userId)
    trace.stage_results.w5_scheduler = schedulerResult

    // Query calendar item scheduled by W5 for this draft
    const { data: calRows } = await admin
      .from('content_calendar')
      .select('id, planned_date, planned_time, status, quality_gate_status')
      .eq('user_id', userId)
      .eq('draft_id', draft.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const calendarId = calRows?.[0]?.id

    if (!calendarId) {
      // W5 is authoritative: If W5 scheduler did not schedule this candidate, halt fail-closed
      trace.status = 'BLOCKED'
      trace.error_code = 'W5_NO_SLOTS_SCHEDULED'
      trace.failure_reason = 'W5 Authoritative Scheduler did not schedule candidate into calendar slots.'
      trace.completed_at = new Date().toISOString()
      await updateDbRun({
        status: 'BLOCKED',
        error_code: trace.error_code,
        failure_reason: trace.failure_reason,
        completed_at: trace.completed_at
      })
      return trace
    }

    trace.id_trace.calendar_id = calendarId
    await updateDbRun({ calendar_id: calendarId })

    // ==================================================
    // STAGE W6: PUBLISHER DRY-RUN
    // ==================================================
    trace.current_stage = 'W6_PUBLISHER_DRY_RUN'
    await updateDbRun({ current_stage: 'W6_PUBLISHER_DRY_RUN' })

    const publishResult = await publishScheduledPost({
      userId,
      calendarId,
      dryRun: true
    })

    trace.stage_results.w6_publisher_dry_run = publishResult

    // Fetch attempt record ID
    const { data: attempts } = await admin
      .from('publishing_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('calendar_id', calendarId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (attempts && attempts.length > 0) {
      trace.id_trace.publishing_attempt_id = attempts[0].id
      await updateDbRun({ publishing_attempt_id: attempts[0].id })
    }

    if (publishResult.status !== 'DRY_RUN_SUCCESS') {
      trace.status = 'BLOCKED'
      trace.error_code = publishResult.reason_code || 'PUBLISHER_DRY_RUN_BLOCKED'
      trace.failure_reason = publishResult.reasons?.[0] || 'Publisher dry-run blocked'
      trace.completed_at = new Date().toISOString()
      await updateDbRun({
        status: 'BLOCKED',
        error_code: trace.error_code,
        failure_reason: trace.failure_reason,
        completed_at: trace.completed_at
      })
      return trace
    }

    // ==================================================
    // PIPELINE COMPLETED SUCCESSFULLY
    // ==================================================
    trace.current_stage = 'COMPLETED'
    trace.status = 'COMPLETED'
    trace.completed_at = new Date().toISOString()

    await updateDbRun({
      current_stage: 'COMPLETED',
      status: 'COMPLETED',
      completed_at: trace.completed_at,
      execution_metadata: trace.stage_results
    })

    return trace

  } catch (err: any) {
    console.error(`Production Pipeline Execution Error at stage ${trace.current_stage}:`, err)
    trace.status = 'FAILED'
    trace.error_code = err.message?.startsWith('IMAGE_') ? 'IMAGE_GENERATION_UNAVAILABLE' : (err.message?.startsWith('OPENROUTER_') ? 'OPENROUTER_UNAVAILABLE' : 'PIPELINE_ERROR')
    trace.failure_reason = err.message || 'Unhandled pipeline execution error'
    trace.completed_at = new Date().toISOString()

    await updateDbRun({
      status: 'FAILED',
      error_code: trace.error_code,
      failure_reason: trace.failure_reason,
      completed_at: trace.completed_at
    })

    return trace
  }
}
