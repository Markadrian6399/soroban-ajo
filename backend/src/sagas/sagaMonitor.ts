import { prisma } from '../config/database'
import { createModuleLogger } from '../utils/logger'
import { ErrorReporter } from '../utils/errorReporter'

const logger = createModuleLogger('SagaMonitor')

// A saga whose lastHeartbeat hasn't moved in this long while still
// "in_progress"/"compensating" is presumed stuck (crashed process that
// hasn't been recovered, or a step wedged on a hanging external call).
const STUCK_THRESHOLD_MS = 5 * 60 * 1000

export interface SagaHealthSummary {
  stuck: { id: string; name: string; status: string; lastHeartbeat: Date }[]
  needsReconciliation: { id: string; name: string; error: string | null; updatedAt: Date }[]
  failed: { id: string; name: string; error: string | null; updatedAt: Date }[]
}

/**
 * Scans persisted saga state for instances that are stuck or in a
 * terminal-but-unresolved state, and alerts via the existing error
 * reporting pipeline instead of letting them sit silently forever.
 * Intended to be run on a schedule (see cron/scheduler.ts).
 */
export async function checkSagaHealth(): Promise<SagaHealthSummary> {
  const staleCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS)

  const [stuck, needsReconciliation, failed] = await Promise.all([
    prisma.sagaInstance.findMany({
      where: { status: { in: ['in_progress', 'compensating'] }, lastHeartbeat: { lt: staleCutoff } },
      select: { id: true, name: true, status: true, lastHeartbeat: true },
    }),
    prisma.sagaInstance.findMany({
      where: { status: 'needs_reconciliation' },
      select: { id: true, name: true, error: true, updatedAt: true },
    }),
    prisma.sagaInstance.findMany({
      where: { status: 'failed', updatedAt: { gte: staleCutoff } },
      select: { id: true, name: true, error: true, updatedAt: true },
    }),
  ])

  for (const saga of stuck) {
    logger.error('Saga stuck — no progress past heartbeat threshold', {
      sagaId: saga.id,
      name: saga.name,
      status: saga.status,
      lastHeartbeat: saga.lastHeartbeat,
    })
    ErrorReporter.captureMessage(
      `Saga ${saga.id} (${saga.name}) is stuck in "${saga.status}" — no heartbeat since ${saga.lastHeartbeat.toISOString()}`,
      'error'
    )
  }

  for (const saga of needsReconciliation) {
    logger.error('Saga needs manual reconciliation', { sagaId: saga.id, name: saga.name, error: saga.error })
    ErrorReporter.captureMessage(
      `Saga ${saga.id} (${saga.name}) needs manual reconciliation: ${saga.error}`,
      'error'
    )
  }

  const summary = { stuck, needsReconciliation, failed }
  if (stuck.length || needsReconciliation.length) {
    logger.warn('Saga health check found unhealthy instances', {
      stuckCount: stuck.length,
      needsReconciliationCount: needsReconciliation.length,
      failedCount: failed.length,
    })
  }
  return summary
}

export async function getSagaStats() {
  const grouped = await prisma.sagaInstance.groupBy({
    by: ['name', 'status'],
    _count: { _all: true },
  })

  return grouped.map((g) => ({ name: g.name, status: g.status, count: g._count._all }))
}
