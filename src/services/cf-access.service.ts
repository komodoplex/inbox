import { verifyWithJwks } from 'hono/jwt'
import type { Bindings } from '@/types/env'

interface JwkKey {
  kty: string
  kid?: string
  alg?: string
  use?: string
  n?: string
  e?: string
  [key: string]: unknown
}

interface JwksCache {
  keys: JwkKey[]
  expiresAt: number
}

interface VerifiedAccessPayload {
  email: string
}

let jwksCache: JwksCache | null = null
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000

/**
 * Clear cached JWKS keys (useful for test isolation)
 */
const clearJwksCache = (): void => {
  jwksCache = null
}

/**
 * Resolve Cloudflare Access verification parameters from environment bindings
 */
const resolveAccessConfig = (
  env: Bindings
): { issuer: string; aud: string; certsUrl: string } | null => {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN
  const aud = env.CF_ACCESS_AUD
  if (!teamDomain || !aud) {
    return null
  }

  const cleanDomain = teamDomain
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
  const teamHost = cleanDomain.includes('.')
    ? cleanDomain
    : `${cleanDomain}.cloudflareaccess.com`

  const issuer = `https://${teamHost}`
  const certsUrl = env.CF_ACCESS_CERTS_URL || `${issuer}/cdn-cgi/access/certs`

  return { issuer, aud, certsUrl }
}

/**
 * Fetch JWKS public keys from Cloudflare Access certs endpoint
 */
const fetchJwksKeys = async (certsUrl: string): Promise<JwkKey[] | null> => {
  try {
    const response = await fetch(certsUrl)
    if (!response.ok) {
      return null
    }
    const data = (await response.json()) as { keys?: JwkKey[] }
    if (!data.keys || !Array.isArray(data.keys)) {
      return null
    }
    return data.keys
  } catch {
    return null
  }
}

/**
 * Cryptographically verify Cloudflare Access JWT assertion
 */
const verifyAccessJwt = async (
  jwt: string | undefined,
  env: Bindings
): Promise<VerifiedAccessPayload | null> => {
  if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
    return null
  }

  const config = resolveAccessConfig(env)
  if (!config) {
    return null
  }

  const now = Date.now()

  if (jwksCache && jwksCache.expiresAt > now) {
    try {
      const payload = await verifyWithJwks(jwt, {
        keys: jwksCache.keys,
        allowedAlgorithms: ['RS256'],
        verification: {
          iss: config.issuer,
          aud: config.aud,
        },
      })
      if (typeof payload.email === 'string' && payload.email.length > 0) {
        return { email: payload.email }
      }
    } catch {
      // Key may have been rotated; proceed to fresh fetch
    }
  }

  const freshKeys = await fetchJwksKeys(config.certsUrl)
  if (!freshKeys || freshKeys.length === 0) {
    return null
  }

  jwksCache = {
    keys: freshKeys,
    expiresAt: now + JWKS_CACHE_TTL_MS,
  }

  try {
    const payload = await verifyWithJwks(jwt, {
      keys: freshKeys,
      allowedAlgorithms: ['RS256'],
      verification: {
        iss: config.issuer,
        aud: config.aud,
      },
    })
    if (typeof payload.email === 'string' && payload.email.length > 0) {
      return { email: payload.email }
    }
    return null
  } catch {
    return null
  }
}

export { clearJwksCache, resolveAccessConfig, verifyAccessJwt }
export type { JwkKey, VerifiedAccessPayload }
