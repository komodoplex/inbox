import { assertTurnstileConfigured } from '@/checks'
import { isDomainOrSubdomain } from '@/middleware/cors'
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
const MAX_CHALLENGE_AGE_MS = 5 * 60 * 1000
const MAX_FUTURE_SKEW_MS = 60 * 1000

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

/**
 * Validate that hostname returned by Turnstile matches known venture domains
 */
const isAllowedTurnstileHostname = (
  hostname?: string,
  isDevOrTest: boolean = false
): boolean => {
  if (!hostname) {
    return false
  }
  const lower = hostname.toLowerCase().trim().replace(/\.+$/, '')
  if (isDevOrTest && (lower === 'localhost' || lower === '127.0.0.1')) {
    return true
  }

  return (
    isDomainOrSubdomain(lower, ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX) ||
    isDomainOrSubdomain(lower, ALLOWED_ORIGIN_DOMAINS.REPUTASK)
  )
}

/**
 * Verify that Turnstile challenge timestamp is within valid window
 */
const isTurnstileTimestampValid = (challengeTs?: string): boolean => {
  if (!challengeTs) {
    return true
  }
  const timestamp = Date.parse(challengeTs)
  if (Number.isNaN(timestamp)) {
    return false
  }
  const ageMs = Date.now() - timestamp
  return ageMs >= -MAX_FUTURE_SKEW_MS && ageMs <= MAX_CHALLENGE_AGE_MS
}

/**
 * Verify Cloudflare Turnstile token via siteverify API
 */
const verifyTurnstileToken = async (
  secretKey: string | undefined,
  token: string,
  remoteIp?: string,
  isDevOrTest: boolean = false
): Promise<boolean> => {
  if (isDevOrTest && secretKey === TEST_SECRET && token === TEST_PASS_TOKEN) {
    return true
  }

  assertTurnstileConfigured(token, secretKey)

  const formData = new URLSearchParams()
  formData.append(FORM_KEY_SECRET, secretKey as string)
  formData.append(FORM_KEY_RESPONSE, token)
  if (remoteIp && remoteIp !== 'unknown-ip') {
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
    const isSuccess = Boolean(data.success)
    const isHostnameValid = isAllowedTurnstileHostname(data.hostname, isDevOrTest)
    const isTimeValid = isTurnstileTimestampValid(data.challenge_ts)

    return isSuccess && isHostnameValid && isTimeValid
  } catch {
    return false
  }
}

export {
  isAllowedTurnstileHostname,
  isTurnstileTimestampValid,
  verifyTurnstileToken,
}
export type { TurnstileVerifyResponse }


