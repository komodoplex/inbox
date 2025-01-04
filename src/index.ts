import { Hono } from 'hono'
import { requestIdMiddleware } from '@/middleware/request-id'
import { errorHandler } from '@/middleware/error-handler'
import { healthRouter } from '@/routes/health'
import { publicRouter } from '@/routes/public'
import { internalRouter } from '@/routes/internal'
import { ERROR_CODES } from '@/constants/errors'
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

export { app }
export default app

