/**
 * @deprecated Gunakan /api/user/roles sebagai gantinya.
 * Endpoint ini di-proxy ke /api/user/roles agar tidak breaking bagi caller lama.
 */
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.text()
  const res = await fetch(new URL('/api/user/roles', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') ?? '' },
    body,
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
