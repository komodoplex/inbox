import { Hono } from 'hono'
import { requestIdMiddleware } from '@/middleware/request-id'
import { errorHandler } from '@/middleware/error-handler'
import { healthRouter } from '@/routes/health'
import { publicRouter } from '@/routes/public'
import { internalRouter } from '@/routes/internal'
import { ERROR_CODES } from '@/constants/errors'
import { HttpHelper } from '@/helpers'
import type { AppEnvironment } from '@/types/env'

const app = new Hono<AppEnvironment>()

app.use('*', requestIdMiddleware())

app.route('/health', healthRouter)
app.route('/v1/public', publicRouter)
app.route('/v1/internal', internalRouter)

app.notFound((c) => {
  return c.json(
    {
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Endpoint not found.',
      },
    },
    404
  )
})

app.onError(errorHandler)

// ponytail: normalize trailing slashes on all incoming requests to prevent 404 without redirect
const originalFetch = app.fetch.bind(app)
app.fetch = (
  request: Parameters<typeof originalFetch>[0],
  env?: Parameters<typeof originalFetch>[1],
  ctx?: Parameters<typeof originalFetch>[2]
) => {
  return originalFetch(
    HttpHelper.normalizeTrailingSlash(request as Request),
    env,
    ctx
  )
}

export { app }
export default app

