import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface AutomationState {
  auto_mode_enabled: boolean
  pause_all_publishing: boolean
  min_confidence_score: number
  state_valid: boolean
  updated_at: string | null
}

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
      .select('auto_mode_enabled, pause_all_publishing, min_confidence_score, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      // If no row exists yet, insert default initial row for the user
      const now = new Date().toISOString()
      const { data: newRow, error: insertErr } = await admin
        .from('automation_settings')
        .upsert({
          user_id: userId,
          auto_mode_enabled: true,
          pause_all_publishing: false,
          min_confidence_score: 70,
          updated_at: now
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (insertErr || !newRow) {
        return {
          auto_mode_enabled: false,
          pause_all_publishing: true,
          min_confidence_score: 70,
          state_valid: false,
          updated_at: null
        }
      }

      return {
        auto_mode_enabled: newRow.auto_mode_enabled ?? true,
        pause_all_publishing: newRow.pause_all_publishing ?? false,
        min_confidence_score: newRow.min_confidence_score ?? 70,
        state_valid: true,
        updated_at: newRow.updated_at || null
      }
    }

    const row = data[0]
    return {
      auto_mode_enabled: row.auto_mode_enabled ?? true,
      pause_all_publishing: row.pause_all_publishing ?? false,
      min_confidence_score: row.min_confidence_score ?? 70,
      state_valid: true,
      updated_at: row.updated_at || null
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
