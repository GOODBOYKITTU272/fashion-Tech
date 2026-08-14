import { getSupabaseAdmin } from './supabase-admin'

export interface TelegramApprovalRequestInput {
  calendar_id: string
  title: string
  pillar: string
  format: string
  planned_date: string
  planned_time: string
  caption: string
  sources: string[]
  image_url?: string | null
  carousel_pdf_url?: string | null
  carousel_cover_url?: string | null
}

export interface TelegramApprovalResult {
  success: boolean
  status: 'SENT' | 'TELEGRAM_NOT_CONFIGURED' | 'FAILED'
  message_id?: number
  error?: string
}

/**
 * sendTelegramApprovalRequest
 * Sends human approval notification to Telegram with inline buttons: APPROVE, REJECT, EDIT.
 * Rejects unauthorized accounts and returns TELEGRAM_NOT_CONFIGURED if token is unconfigured.
 */
export async function sendTelegramApprovalRequest(input: TelegramApprovalRequestInput): Promise<TelegramApprovalResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.TELEGRAM_CHAT_ID

  if (!botToken || botToken.startsWith('your-') || !chatId || chatId.startsWith('your-')) {
    return {
      success: false,
      status: 'TELEGRAM_NOT_CONFIGURED',
      error: 'TELEGRAM_NOT_CONFIGURED: TELEGRAM_BOT_TOKEN or TELEGRAM_ALLOWED_CHAT_ID environment variable is missing.'
    }
  }

  const captionText = input.caption.substring(0, 400)
  const sourceText = input.sources.length > 0 ? input.sources.join(', ') : 'Vogue Business'

  const messageText = `<b>POST READY FOR APPROVAL</b> 🚀

<b>Title:</b> ${escapeHtml(input.title)}
<b>Pillar:</b> ${escapeHtml(input.pillar)}
<b>Format:</b> ${escapeHtml(input.format)}
<b>Scheduled:</b> ${escapeHtml(input.planned_date)} at ${escapeHtml(input.planned_time)} IST

<b>Caption Preview:</b>
${escapeHtml(captionText)}

<b>Sources:</b> ${escapeHtml(sourceText)}
${input.carousel_pdf_url ? `\n<b>PDF Carousel:</b> <a href="${input.carousel_pdf_url}">Download PDF</a>` : ''}`

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ APPROVE', callback_data: `approve:${input.calendar_id}` },
        { text: '❌ REJECT', callback_data: `reject:${input.calendar_id}` },
        { text: '✏️ EDIT', callback_data: `edit:${input.calendar_id}` }
      ]
    ]
  }

  try {
    const endpoint = input.carousel_cover_url || input.image_url
      ? `https://api.telegram.org/bot${botToken}/sendPhoto`
      : `https://api.telegram.org/bot${botToken}/sendMessage`

    const payload: any = {
      chat_id: chatId,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    }

    if (input.carousel_cover_url || input.image_url) {
      payload.photo = input.carousel_cover_url || input.image_url
      payload.caption = messageText
    } else {
      payload.text = messageText
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errJson = await res.json()
      throw new Error(`Telegram API HTTP ${res.status}: ${errJson.description || 'Failed to send message'}`)
    }

    const json = await res.json()
    return {
      success: true,
      status: 'SENT',
      message_id: json.result?.message_id
    }
  } catch (err: any) {
    console.error('Telegram Approval Request Error:', err)
    return {
      success: false,
      status: 'FAILED',
      error: err.message
    }
  }
}

/**
 * handleTelegramWebhookCallback
 * Authenticates callback from Telegram bot, updates content_calendar and drafts approval status cleanly.
 */
export async function handleTelegramWebhookCallback(callbackQuery: any): Promise<{ success: boolean; action: string; message: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.TELEGRAM_CHAT_ID

  const fromId = String(callbackQuery?.from?.id || callbackQuery?.message?.chat?.id || '')
  if (!allowedChatId || fromId !== allowedChatId) {
    return { success: false, action: 'UNAUTHORIZED', message: 'Unauthorized Telegram sender rejected.' }
  }

  const dataStr = String(callbackQuery?.data || '')
  const [action, calendarId] = dataStr.split(':')

  if (!action || !calendarId) {
    return { success: false, action: 'INVALID', message: 'Invalid callback payload' }
  }

  const admin = getSupabaseAdmin()

  if (action === 'approve') {
    await admin.from('content_calendar').update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: 'pranavi'
    }).eq('id', calendarId)

    return { success: true, action: 'APPROVED', message: 'Post marked APPROVED for publication.' }
  }

  if (action === 'reject') {
    await admin.from('content_calendar').update({
      approval_status: 'rejected',
      quality_gate_status: 'failed'
    }).eq('id', calendarId)

    return { success: true, action: 'REJECTED', message: 'Post marked REJECTED. Publication blocked.' }
  }

  if (action === 'edit') {
    await admin.from('content_calendar').update({
      approval_status: 'changes_requested'
    }).eq('id', calendarId)

    return { success: true, action: 'CHANGES_REQUESTED', message: 'Post marked CHANGES_REQUESTED. Please reply with requested edits.' }
  }

  return { success: false, action: 'UNKNOWN', message: 'Unknown action' }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#039;'
      default: return m
    }
  })
}
