import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { z } from 'zod'
import { HttpHelper } from '@/helpers'
import { BadRequestError } from '@/lib/errors'
import { ERROR_CODES } from '@/constants/errors'

describe('HttpHelper', () => {
  const dummySchema = z.object({
    username: z.string().min(3),
    role: z.string(),
  })

  it('parses raw valid JSON request body without schema', async () => {
    const app = new Hono()
    app.post('/test', async (c) => {
      const parsed = await HttpHelper.request<{ message: string }>(c)
      return HttpHelper.response(c, parsed)
    })

    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello world' }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as { message: string }
    expect(json.message).toBe('hello world')
  })

  it('parses and validates JSON body using provided schema', async () => {
    const app = new Hono()
    app.post('/test-schema', async (c) => {
      const validated = await HttpHelper.request(c, dummySchema)
      return HttpHelper.response(c, validated, 201)
    })

    const res = await app.request('/test-schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', role: 'owner' }),
    })

    expect(res.status).toBe(201)
    const json = (await res.json()) as { username: string; role: string }
    expect(json.username).toBe('admin')
    expect(json.role).toBe('owner')
  })

  it('throws BadRequestError when request body is not valid JSON', async () => {
    const app = new Hono()
    app.post('/test-malformed', async (c) => {
      try {
        await HttpHelper.request(c)
        return HttpHelper.response(c, { ok: true })
      } catch (err) {
        if (err instanceof BadRequestError) {
          return HttpHelper.response(
            c,
            { code: err.code, message: err.message },
            400
          )
        }
        throw err
      }
    })

    const res = await app.request('/test-malformed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-non-json-string',
    })

    expect(res.status).toBe(400)
    const json = (await res.json()) as { code: string; message: string }
    expect(json.code).toBe(ERROR_CODES.INVALID_REQUEST)
    expect(json.message).toBe('Request body must be valid JSON.')
  })
})
