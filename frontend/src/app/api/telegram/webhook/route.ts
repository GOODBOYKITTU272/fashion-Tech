import { NextResponse } from 'next/server'
import {
  handleTelegramWebhookCallback,
  handleTelegramMessageText,
  answerTelegramCallbackQuery,
  sendTelegramTextMessage,
  deleteTelegramMessage
} from '@/lib/telegram-bot'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // 1. Process Callback Query (Button Clicks)
    if (body.callback_query) {
      const callbackQuery = body.callback_query
      const callbackQueryId = callbackQuery.id
      const chatId = callbackQuery.message?.chat?.id
      const messageId = callbackQuery.message?.message_id

      const result = await handleTelegramWebhookCallback(callbackQuery)

      if (callbackQueryId) {
        await answerTelegramCallbackQuery(callbackQueryId, result.message)
      }

      if (chatId) {
        if (result.action === 'REJECTED' && messageId) {
          await deleteTelegramMessage(String(chatId), messageId)
        } else {
          await sendTelegramTextMessage(String(chatId), `<b>Notification:</b> ${result.message}`)
        }
      }

      return NextResponse.json({ ok: true, source: 'callback_query', result })
    }

    // 2. Process Text Message (Edit Instructions Reply)
    if (body.message && body.message.text) {
      const message = body.message
      const chatId = message.chat?.id
      const text = message.text

      if (chatId && text) {
        // Run message processing asynchronously so we respond to Telegram instantly (within 1-2s max)
        // preventing Telegram from retrying webhook requests due to timeout during AI revision.
        handleTelegramMessageText(String(chatId), text).catch(err => {
          console.error('Failed to run asynchronous message handler:', err)
        })
      }

      return NextResponse.json({ ok: true, source: 'message' })
    }

    return NextResponse.json({ ok: true, message: 'No actionable callback_query or message found.' })
  } catch (error: any) {
    console.error('Telegram Webhook Handling Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
