import { getSupabaseAdmin } from './supabase-admin'

export interface SystemServiceHealth {
  browser_online: boolean
  backend_available: boolean
  supabase_available: boolean
  openrouter_available: boolean
  zernio_available: boolean
  telegram_status: 'AVAILABLE' | 'NOT_CONFIGURED' | 'OFFLINE'
  overall_status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE_READ_ONLY'
}

export async function checkSystemServiceHealth(): Promise<SystemServiceHealth> {
  let supabaseOk = false
  let openrouterOk = false
  let zernioOk = false
  let telegramStatus: 'AVAILABLE' | 'NOT_CONFIGURED' | 'OFFLINE' = 'NOT_CONFIGURED'

  // 1. Supabase Check
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin.from('automation_control').select('id').limit(1)
    supabaseOk = Array.isArray(data)
  } catch {
    supabaseOk = false
  }

  // 2. OpenRouter Key Check
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (openrouterKey && !openrouterKey.startsWith('your-')) {
    openrouterOk = true
  }

  // 3. Zernio Key Check
  const zernioKey = process.env.ZERNIO_API_KEY
  if (zernioKey && !zernioKey.startsWith('your-')) {
    zernioOk = true
  }

  // 4. Telegram Check
  const tgToken = process.env.TELEGRAM_BOT_TOKEN
  const tgChat = process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.TELEGRAM_CHAT_ID
  if (tgToken && !tgToken.startsWith('your-') && tgChat && !tgChat.startsWith('your-')) {
    telegramStatus = 'AVAILABLE'
  } else {
    telegramStatus = 'NOT_CONFIGURED'
  }

  const isHealthy = supabaseOk && openrouterOk && zernioOk
  const overall = isHealthy ? 'HEALTHY' : (supabaseOk ? 'DEGRADED' : 'OFFLINE_READ_ONLY')

  return {
    browser_online: true,
    backend_available: true,
    supabase_available: supabaseOk,
    openrouter_available: openrouterOk,
    zernio_available: zernioOk,
    telegram_status: telegramStatus,
    overall_status: overall
  }
}
