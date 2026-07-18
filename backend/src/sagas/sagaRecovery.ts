import { prisma } from '../config/database'
import { createModuleLogger } from '../utils/logger'
import { ErrorReporter } from '../utils/errorReporter'
import { sagaOrchestrator } from './sagaOrchestrator'
import { getSagaDefinition } from './sagaRegistry'

const logger = createModuleLogger('SagaRecovery')

/**
 * Runs once at process startup. Finds every saga instance left in a
 * non-terminal state by a process that crashed mid-saga (status
 * `in_progress` or `compensating`) and resumes it — either continuing
 * forward execution from the last completed step, or continuing
 * compensation from wherever it stopped. This is what makes saga state
 * crash-recoverable rather than just in-memory step tracking.
 *
 * @param names - Optional allowlist of saga names to recover. Defaults to
 *   every registered saga; useful to scope a manual/targeted recovery run.
 */
export async function recoverIncompleteSagas(names?: string[]): Promise<{ recovered: number; skipped: number }> {
  const stuckInstances = await prisma.sagaInstance.findMany({
    where: {
      status: { in: ['in_progress', 'compensating'] },
      ...(names ? { name: { in: names } } : {}),
    },
  })

  let recovered = 0
  let skipped = 0

  for (const instance of stuckInstances) {
    const definition = getSagaDefinition(instance.name)
    if (!definition) {
      logger.error('No registered saga definition for persisted instance — leaving for manual reconciliation', {
        sagaId: instance.id,
        name: instance.name,
      })
      await prisma.sagaInstance.update({
        where: { id: instance.id },
        data: {
          status: 'needs_reconciliation',
          error: `No saga definition registered for name "${instance.name}" at recovery time`,
        },
      })
      skipped++
      continue
    }

    logger.info('Recovering saga instance from previous process', {
      sagaId: instance.id,
      name: instance.name,
      status: instance.status,
      currentStep: instance.currentStep,
    })

    try {
      await sagaOrchestrator.resume(definition, instance.id)
      recovered++
    } catch (error) {
      logger.error('Failed to recover saga instance', {
        sagaId: instance.id,
        name: instance.name,
        error: error instanceof Error ? error.message : String(error),
      })
      ErrorReporter.captureException(error instanceof Error ? error : new Error(String(error)), {
        sagaId: instance.id,
        name: instance.name,
        phase: 'recovery',
      })
      skipped++
    }
  }

  logger.info('Saga recovery pass complete', { recovered, skipped, total: stuckInstances.length })
  return { recovered, skipped }
}
