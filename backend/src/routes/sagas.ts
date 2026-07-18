import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { adminAuth } from '../middleware/adminAuth'
import { NotFoundError } from '../errors/AppError'
import { sagaOrchestrator, SagaStatus } from '../sagas/sagaOrchestrator'
import { checkSagaHealth, getSagaStats } from '../sagas/sagaMonitor'

const router = Router()

const VALID_STATUSES: SagaStatus[] = [
  'pending',
  'in_progress',
  'compensating',
  'completed',
  'failed',
  'needs_reconciliation',
]

/**
 * GET /api/sagas?status=&name=
 * Lists saga instances for debugging stuck/failed sagas — the core
 * observability requirement: every saga's current state/step must be
 * queryable, not just inferable from logs.
 */
router.get(
  '/',
  adminAuth('transactions:read'),
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined
    const name = req.query.name as string | undefined

    if (status && !VALID_STATUSES.includes(status as SagaStatus)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
    }

    const instances = await sagaOrchestrator.list({ status: status as SagaStatus | undefined, name }, 100)
    res.json({ success: true, data: instances })
  })
)

/** GET /api/sagas/stats — per-name/status counts, for dashboards. */
router.get(
  '/stats',
  adminAuth('transactions:read'),
  asyncHandler(async (_req, res) => {
    const stats = await getSagaStats()
    res.json({ success: true, data: stats })
  })
)

/** GET /api/sagas/health — stuck / needs-reconciliation / recently-failed summary. */
router.get(
  '/health',
  adminAuth('transactions:read'),
  asyncHandler(async (_req, res) => {
    const summary = await checkSagaHealth()
    res.json({ success: true, data: summary })
  })
)

/** GET /api/sagas/:id — full state of a single saga instance, including its step log. */
router.get(
  '/:id',
  adminAuth('transactions:read'),
  asyncHandler(async (req, res) => {
    const instance = await sagaOrchestrator.getState(req.params.id)
    if (!instance) throw new NotFoundError('SagaInstance', req.params.id)
    res.json({ success: true, data: instance })
  })
)

export { router as sagasRouter }
