import { supabase } from '@/lib/supabase'

export interface AutomationState {
  auto_mode_enabled: boolean
  pause_all_publishing: boolean
  min_confidence_score: number
  updated_at: string | null
}

export async function getAutomationState(userId?: string): Promise<AutomationState> {
  try {
    let query = supabase
      .from('automation_settings')
      .select('auto_mode_enabled, pause_all_publishing, min_confidence_score, updated_at')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.order('updated_at', { ascending: false }).limit(1)

    if (error || !data || data.length === 0) {
      // Default fail-safe values if no settings record exists yet
      return {
        auto_mode_enabled: true,
        pause_all_publishing: false,
        min_confidence_score: 70,
        updated_at: null
      }
    }

    const row = data[0]
    return {
      auto_mode_enabled: row.auto_mode_enabled ?? true,
      pause_all_publishing: row.pause_all_publishing ?? false,
      min_confidence_score: row.min_confidence_score ?? 70,
      updated_at: row.updated_at || null
    }
  } catch (err) {
    console.error('Failed to query automation_settings:', err)
    return {
      auto_mode_enabled: true,
      pause_all_publishing: false,
      min_confidence_score: 70,
      updated_at: null
    }
  }
}
