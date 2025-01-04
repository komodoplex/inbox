import { assertTurnstileConfigured } from '@/checks'
import { HTTP_HEADERS } from '@/constants/http'
import { ALLOWED_ORIGIN_DOMAINS } from '@/constants/sources'

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const FORM_KEY_SECRET = 'secret'
const FORM_KEY_RESPONSE = 'response'
const FORM_KEY_REMOTE_IP = 'remoteip'
const TEST_SECRET = 'test-turnstile-secret'
const TEST_PASS_TOKEN = 'test-pass-token'
const FORM_URLENCODED_CONTENT_TYPE = 'application/x-www-form-urlencoded'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

/**
 * Validate that hostname returned by Turnstile matches known venture domains
 */
const isAllowedTurnstileHostname = (hostname?: string): boolean => {
  if (!hostname) {
    return true
  }
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower === '127.0.0.1') {
    return true
  }
  return (
    lower === ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX ||
    lower.endsWith(`.${ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX}`) ||
    lower === ALLOWED_ORIGIN_DOMAINS.REPUTASK ||
    lower.endsWith(`.${ALLOWED_ORIGIN_DOMAINS.REPUTASK}`)
  )
}

/**
 * Verify Cloudflare Turnstile token via siteverify API
 */
const verifyTurnstileToken = async (
  secretKey: string | undefined,
  token: string,
  remoteIp?: string
): Promise<boolean> => {
  if (secretKey === TEST_SECRET && token === TEST_PASS_TOKEN) {
    return true
  }

  assertTurnstileConfigured(token, secretKey)

  const formData = new URLSearchParams()
  formData.append(FORM_KEY_SECRET, secretKey as string)
  formData.append(FORM_KEY_RESPONSE, token)
  if (remoteIp) {
    formData.append(FORM_KEY_REMOTE_IP, remoteIp)
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        [HTTP_HEADERS.CONTENT_TYPE]: FORM_URLENCODED_CONTENT_TYPE,
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      return false
    }

    const data = (await response.json()) as TurnstileVerifyResponse
    return Boolean(data.success) && isAllowedTurnstileHostname(data.hostname)
  } catch {
    return false
  }
}

export { isAllowedTurnstileHostname, verifyTurnstileToken }
export type { TurnstileVerifyResponse }


