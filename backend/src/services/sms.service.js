import { env, isSmsConfigured } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * SMS India Hub (https://www.smsindiahub.in) HTTP API.
 *
 *   GET https://cloud.smsindiahub.in/vendorsms/pushsms.aspx
 *       ?APIKey=..   (or user=..&password=..)
 *       &msisdn=91XXXXXXXXXX&sid=SENDER&msg=..&fl=0&gwid=2
 *       [&DLT_TE_ID=template id][&PEId=entity id]
 *
 * Success responds with { ErrorCode: "000", ErrorMessage: "Success", ... }.
 * The message text must match the DLT-approved template exactly.
 */
export async function sendSms(phone, message) {
  if (!isSmsConfigured) {
    throw new ApiError(503, 'SMS service is not configured. Please try again later.', { code: 'SMS_NOT_CONFIGURED' })
  }

  const cfg = env.smsIndiaHub
  const params = new URLSearchParams({
    msisdn: `91${phone}`,
    sid: cfg.senderId,
    msg: message,
    fl: '0',
    gwid: cfg.gwid,
  })
  if (cfg.apiKey) params.set('APIKey', cfg.apiKey)
  else {
    params.set('user', cfg.user)
    params.set('password', cfg.password)
  }
  if (cfg.templateId) params.set('DLT_TE_ID', cfg.templateId)
  if (cfg.peId) params.set('PEId', cfg.peId)

  let body
  try {
    const res = await fetch(`${cfg.url}?${params.toString()}`, { signal: AbortSignal.timeout(10000) })
    const raw = await res.text()
    try {
      body = JSON.parse(raw)
    } catch {
      body = { ErrorCode: res.ok ? '000' : String(res.status), ErrorMessage: raw.slice(0, 200) }
    }
  } catch (err) {
    console.error('[sms] request failed:', err.message)
    throw new ApiError(502, 'Could not send the OTP right now. Please try again.', { code: 'SMS_FAILED' })
  }

  if (String(body.ErrorCode) !== '000') {
    console.error('[sms] provider error:', body.ErrorCode, body.ErrorMessage)
    throw new ApiError(502, 'Could not send the OTP right now. Please try again.', { code: 'SMS_FAILED' })
  }
  return body
}
