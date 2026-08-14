import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface NextScheduledPost {
  id: string
  title: string
  pillar: string
  format: string
  planned_date: string
  planned_time: string | null
  status: string
  quality_gate_status: string
  confidence_score: number | null
}

export async function getNextScheduledPost(userId: string): Promise<NextScheduledPost | null> {
  if (!userId) return null

  try {
    const admin = getSupabaseAdmin()
    const todayStr = new Date().toISOString().split('T')[0]

    // Query next future scheduled post for user from public.content_calendar
    const { data: calRows, error } = await admin
      .from('content_calendar')
      .select('id, content_idea_id, draft_id, planned_date, planned_time, pillar, format, status, quality_gate_status')
      .eq('user_id', userId)
      .gte('planned_date', todayStr)
      .in('status', ['scheduled', 'approved', 'draft'])
      .order('planned_date', { ascending: true })
      .order('planned_time', { ascending: true })
      .limit(1)

    if (error || !calRows || calRows.length === 0) {
      return null
    }

    const item = calRows[0]
    let title = `${item.pillar} Content Post`
    let confidenceScore: number | null = null
    let qualityGateStatus = item.quality_gate_status || 'pending'

    // Fetch associated draft details if available
    if (item.draft_id) {
      const { data: draft } = await admin
        .from('drafts')
        .select('quality_gate_status, confidence_score, content_idea_id')
        .eq('id', item.draft_id)
        .single()

      if (draft) {
        qualityGateStatus = draft.quality_gate_status || qualityGateStatus
        confidenceScore = draft.confidence_score ?? null

        if (draft.content_idea_id) {
          const { data: idea } = await admin
            .from('content_ideas')
            .select('title')
            .eq('id', draft.content_idea_id)
            .single()

          if (idea?.title) {
            title = idea.title
          }
        }
      }
    } else if (item.content_idea_id) {
      const { data: idea } = await admin
        .from('content_ideas')
        .select('title')
        .eq('id', item.content_idea_id)
        .single()

      if (idea?.title) {
        title = idea.title
      }
    }

    return {
      id: item.id,
      title,
      pillar: item.pillar,
      format: item.format,
      planned_date: item.planned_date,
      planned_time: item.planned_time || null,
      status: item.status,
      quality_gate_status: qualityGateStatus,
      confidence_score: confidenceScore
    }
  } catch (err) {
    console.error('Failed to query next scheduled post:', err)
    return null
  }
}
