import midtransClient from 'midtrans-client'
import crypto from 'crypto'

/**
 * Midtrans Snap client — untuk membuat transaction & snap token.
 * HANYA dijalankan di server (API Route).
 */
export const midtransSnap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey:    process.env.MIDTRANS_SERVER_KEY!,
  clientKey:    process.env.MIDTRANS_CLIENT_KEY!,
})

/**
 * Midtrans Core API client — untuk cek status & verifikasi.
 */
export const midtransCore = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey:    process.env.MIDTRANS_SERVER_KEY!,
  clientKey:    process.env.MIDTRANS_CLIENT_KEY!,
})

/**
 * Verifikasi signature webhook Midtrans.
 *
 * Formula (dari dokumentasi Midtrans):
 * signature_key = SHA512(order_id + status_code + gross_amount + server_key)
 *
 * WAJIB dilakukan di setiap webhook untuk mencegah callback palsu!
 */
export function verifyMidtransSignature(payload: {
  order_id:      string
  status_code:   string
  gross_amount:  string
  signature_key: string
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY!

  const expectedSignature = crypto
    .createHash('sha512')
    .update(
      payload.order_id +
      payload.status_code +
      payload.gross_amount +
      serverKey
    )
    .digest('hex')

  // Constant-time comparison untuk mencegah timing attack
  const a = Buffer.from(expectedSignature, 'utf8')
  const b = Buffer.from(payload.signature_key, 'utf8')

  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Map status Midtrans → status internal payment
 */
export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): 'pending' | 'settlement' | 'expire' | 'cancel' | 'refund' {
  if (transactionStatus === 'capture') {
    if (fraudStatus === 'accept') return 'settlement'
    if (fraudStatus === 'challenge') return 'pending'
    return 'cancel'
  }
  if (transactionStatus === 'settlement') return 'settlement'
  if (transactionStatus === 'pending')    return 'pending'
  if (transactionStatus === 'deny' || transactionStatus === 'cancel')
    return 'cancel'
  if (transactionStatus === 'expire')     return 'expire'
  if (transactionStatus === 'refund' || transactionStatus === 'partial_refund')
    return 'refund'
  return 'pending'
}