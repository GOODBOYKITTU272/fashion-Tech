import { getSupabaseAdmin } from './supabase-admin'

export interface KnownLinkedInPost {
  title: string
  content: string
  planned_date: string
  planned_time: string
  pillar: string
  format: string
  source: 'linkedin_native'
}

export const KNOWN_LINKEDIN_NATIVE_POSTS: KnownLinkedInPost[] = [
  {
    title: 'From code to craft.',
    content: 'From code to craft. Exploring how software architecture and traditional Indian textile weaving converge in contemporary fashion design.',
    planned_date: '2026-08-14',
    planned_time: '20:30:00',
    pillar: 'Fashion Tech & Philosophy',
    format: 'single_image',
    source: 'linkedin_native'
  },
  {
    title: 'When I moved from Computer Science into Fashion Design...',
    content: 'When I moved from Computer Science into Fashion Design, everyone thought it was a complete pivot. But code and craft share the exact same foundation: logic, patterns, and precision.',
    planned_date: '2026-08-17',
    planned_time: '20:30:00',
    pillar: 'Personal Journey',
    format: 'thought_leadership',
    source: 'linkedin_native'
  },
  {
    title: 'One week into my M.Des. in Fashion Design...',
    content: 'One week into my M.Des. in Fashion Design: 3 key takeaways on blending digital 3D garment prototyping (CLO 3D) with heritage Indian craftsmanship.',
    planned_date: '2026-08-18',
    planned_time: '20:30:00',
    pillar: 'Academic & Design Insights',
    format: 'carousel',
    source: 'linkedin_native'
  }
]

export async function importKnownLinkedInNativePosts(userId: string): Promise<{ importedCount: number; mergedCount: number; errors: string[] }> {
  if (!userId) return { importedCount: 0, mergedCount: 0, errors: ['User ID is required'] }

  const admin = getSupabaseAdmin()
  let importedCount = 0
  let mergedCount = 0
  const errors: string[] = []

  for (const post of KNOWN_LINKEDIN_NATIVE_POSTS) {
    try {
      // 1. Deduplication check in content_calendar for existing date or title match
      const { data: existingCalendar } = await admin
        .from('content_calendar')
        .select('id, draft_id, source')
        .eq('user_id', userId)
        .eq('planned_date', post.planned_date)
        .limit(1)

      if (existingCalendar && existingCalendar.length > 0) {
        // Merge metadata if row exists
        const existingRow = existingCalendar[0]
        await admin.from('content_calendar').update({
          source: post.source,
          external_platform: 'linkedin',
          external_post_type: 'scheduled',
          external_status: 'scheduled',
          external_scheduled_at: `${post.planned_date}T${post.planned_time}Z`
        }).eq('id', existingRow.id)
        mergedCount++
        continue
      }

      // 2. Create underlying Draft row so post has valid draft_id
      const { data: draft, error: draftErr } = await admin.from('drafts').insert({
        user_id: userId,
        title: post.title,
        hook: post.title,
        caption: post.content,
        pillar: post.pillar,
        format: post.format,
        status: 'approved',
        quality_gate_status: 'passed',
        confidence_score: 90,
        text_provider: 'linkedin_native',
        text_model: 'manual_import',
        image_generation_status: 'none'
      }).select('id').single()

      if (draftErr || !draft) {
        errors.push(`Failed to create draft for ${post.title}: ${draftErr?.message}`)
        continue
      }

      // 3. Insert into content_calendar
      const { error: calendarErr } = await admin.from('content_calendar').insert({
        user_id: userId,
        draft_id: draft.id,
        planned_date: post.planned_date,
        planned_time: post.planned_time,
        pillar: post.pillar,
        format: post.format,
        status: 'scheduled',
        quality_gate_status: 'passed',
        confidence_score: 90,
        source: post.source,
        external_platform: 'linkedin',
        external_post_type: 'scheduled',
        external_status: 'scheduled',
        external_scheduled_at: `${post.planned_date}T${post.planned_time}Z`
      })

      if (calendarErr) {
        errors.push(`Failed to insert calendar row for ${post.title}: ${calendarErr.message}`)
      } else {
        importedCount++
      }
    } catch (err: any) {
      errors.push(`Error importing ${post.title}: ${err.message}`)
    }
  }

  return { importedCount, mergedCount, errors }
}
