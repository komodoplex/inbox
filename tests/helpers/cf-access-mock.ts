import { sign } from 'hono/jwt'
import type { JwkKey } from '@/services/cf-access.service'

interface MockAccessContext {
  keyPair: CryptoKeyPair
  publicJwk: JwkKey
  teamDomain: string
  aud: string
  issuer: string
  certsUrl: string
  createToken: (claims?: Record<string, unknown>) => Promise<string>
}

/**
 * Setup a mock Cloudflare Access RSA keypair and token signer for testing
 */
export const setupMockCloudflareAccess = async (
  teamDomain: string = 'komodoplex',
  aud: string = 'test-access-aud-123'
): Promise<MockAccessContext> => {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair

  const kid = 'test-access-kid-1'
  const privateKeyWithMetadata = keyPair.privateKey as CryptoKey & {
    kid?: string
    alg?: string
  }
  privateKeyWithMetadata.kid = kid
  privateKeyWithMetadata.alg = 'RS256'

  const publicJwk = (await crypto.subtle.exportKey(
    'jwk',
    keyPair.publicKey
  )) as JwkKey
  publicJwk.kid = kid
  publicJwk.alg = 'RS256'

  const cleanDomain = teamDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const teamHost = cleanDomain.includes('.')
    ? cleanDomain
    : `${cleanDomain}.cloudflareaccess.com`
  const issuer = `https://${teamHost}`
  const certsUrl = `${issuer}/cdn-cgi/access/certs`

  const createToken = async (claims: Record<string, unknown> = {}) => {
    const now = Math.floor(Date.now() / 1000)
    return sign(
      {
        iss: issuer,
        aud,
        sub: 'mock-user-id',
        email: 'admin@komodoplex.com',
        nbf: now - 5,
        exp: now + 3600,
        iat: now,
        ...claims,
      },
      keyPair.privateKey
    )
  }

  return {
    keyPair,
    publicJwk,
    teamDomain,
    aud,
    issuer,
    certsUrl,
    createToken,
  }
}
