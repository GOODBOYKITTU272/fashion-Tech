import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface AutomationState {
  auto_mode_enabled: boolean
  pause_all_publishing: boolean
  min_confidence_score: number
  state_valid: boolean
  updated_at: string | null
  research_sources_status?: Record<string, string>
}

// Strictly read-only helper — performs ZERO mutations/upserts
export async function getAutomationState(userId: string): Promise<AutomationState> {
  if (!userId) {
    return {
      auto_mode_enabled: false,
      pause_all_publishing: true,
      min_confidence_score: 70,
      state_valid: false,
      updated_at: null
    }
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('automation_settings')
      .select('auto_mode_enabled, pause_all_publishing, min_confidence_score, updated_at, research_sources_status')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    // Fail closed if state is missing, unverified, or query errors (DO NOT auto-create rows)
    if (error || !data || data.length === 0) {
      return {
        auto_mode_enabled: false,
        pause_all_publishing: true,
        min_confidence_score: 70,
        state_valid: false,
        updated_at: null
      }
    }

    const row = data[0]
    return {
      auto_mode_enabled: row.auto_mode_enabled ?? false,
      pause_all_publishing: row.pause_all_publishing ?? true,
      min_confidence_score: row.min_confidence_score ?? 70,
      state_valid: true,
      updated_at: row.updated_at || null,
      research_sources_status: row.research_sources_status || {}
    }
  } catch (err) {
    console.error('Failed to query automation_settings (failing closed):', err)
    return {
      auto_mode_enabled: false,
      pause_all_publishing: true,
      min_confidence_score: 70,
      state_valid: false,
      updated_at: null
    }
  }
}
