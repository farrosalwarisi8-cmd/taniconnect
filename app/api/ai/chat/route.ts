import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { groq, GROQ_MODEL, AGRI_SYSTEM_PROMPT } from '@/lib/groq'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).max(20),
})

export async function POST(req: NextRequest) {
  try {
    // ─── 1. AUTH CHECK ────────────────────────────────────────
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── 2. RATE LIMIT (30 req/menit per user) ────────────────
    const rate = checkRateLimit({
      key:         `ai-chat:${user.id}`,
      maxRequests: 30,
      windowMs:    60 * 1000,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak pesan. Tunggu sebentar.' },
        { status: 429 }
      )
    }

    // ─── 3. VALIDATE ──────────────────────────────────────────
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Format pesan tidak valid' },
        { status: 400 }
      )
    }

    // ─── 4. CALL GROQ LLM ─────────────────────────────────────
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('dummy')) {
      return NextResponse.json({
        reply: 'Fitur Tanya AI sedang dalam mode fallback karena API key Groq belum siap. Coba lagi nanti atau gunakan fitur lain seperti prediksi harga.',
      })
    }

    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: AGRI_SYSTEM_PROMPT },
          ...parsed.data.messages,
        ],
        temperature: 0.7,
        max_tokens: 800,
      })

      const reply = completion.choices[0]?.message?.content?.trim() || 'Maaf, saya tidak bisa menjawab saat ini.'

      return NextResponse.json({
        reply,
        usage: completion.usage ?? null,
      })
    } catch (groqError: any) {
      console.error('[GROQ CHAT ERROR]', groqError)
      return NextResponse.json({
        reply: 'Maaf, layanan AI sedang tidak tersedia saat ini. Silakan coba beberapa saat lagi.',
      })
    }
  } catch (err: any) {
    console.error('[AI CHAT ERROR]', err)
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    )
  }
}