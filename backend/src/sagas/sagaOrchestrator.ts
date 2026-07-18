import { prisma } from '../config/database'
import { createModuleLogger } from '../utils/logger'
import { ErrorReporter } from '../utils/errorReporter'

const logger = createModuleLogger('SagaOrchestrator')

export type SagaStatus =
  | 'pending'
  | 'in_progress'
  | 'compensating'
  | 'completed'
  | 'failed'
  | 'needs_reconciliation'

export type StepStatus = 'pending' | 'completed' | 'failed' | 'compensated' | 'compensation_failed'

/**
 * Thrown by a non-retryable/irreversible step's action to assert that the
 * failure happened *before* any real-world effect occurred (e.g. the
 * transaction was rejected during simulation and never broadcast). This
 * downgrades what would otherwise be an uncertain `needs_reconciliation`
 * outcome into a normal, safely-compensatable failure. Only throw this when
 * you can actually prove no side effect occurred — when in doubt, let the
 * original error propagate so the saga is conservatively flagged instead.
 */
export class SagaStepNoEffectError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'SagaStepNoEffectError'
  }
}

export interface StepLogEntry {
  name: string
  status: StepStatus
  attempts: number
  startedAt?: string
  completedAt?: string
  error?: string
}

/**
 * A single saga step, defined against a plain-object context so it can be
 * rebuilt deterministically from persisted state on recovery — no closures
 * are ever persisted, only the `payload`/`context` data they operate on.
 *
 * `retryable` steps are safe to re-run after a crash without re-doing
 * external side effects (e.g. an idempotent upsert). Non-retryable steps
 * that already ran a real-world/irreversible action (an on-chain transfer)
 * must not be retried — recovery treats them as complete once a later step
 * confirms progress, or routes the saga to `needs_reconciliation` if it's
 * unclear whether the step actually completed.
 */
export interface SagaStep<TContext = any> {
  name: string
  /** Steps whose action can safely be re-invoked (idempotent) after a crash mid-step. */
  retryable: boolean
  /**
   * Once this step completes, its real-world effect cannot be undone (an
   * on-chain transfer, a dispatched payment). If a later step then fails
   * permanently, the saga cannot honestly report `failed` (implying a
   * clean rollback to nothing-happened) — it reports `needs_reconciliation`
   * instead, after compensating whatever reversible steps it can.
   */
  irreversible?: boolean
  /** Runs the step. Returns a partial context patch merged into the saga's persisted context. */
  action: (context: TContext) => Promise<Partial<TContext> | void>
  /**
   * Reverses the step's effect. Only invoked for steps that completed
   * successfully before a later step failed. Omit for steps with no
   * real-world effect to undo (pure reads) or `irreversible` steps.
   */
  compensation?: (context: TContext) => Promise<void>
}

export interface SagaDefinition<TPayload = any, TContext = any> {
  name: string
  buildSteps: (payload: TPayload) => SagaStep<TContext>[]
}

const MAX_STEP_ATTEMPTS = 5
const RETRY_BACKOFF_MS = 200

function toJson(value: unknown): any {
  return JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? `${v}n` : v)))
}

/** Reverses the bigint-tagging done by toJson so context reads get native bigints back. */
function fromJson(value: unknown): any {
  if (typeof value === 'string' && /^-?\d+n$/.test(value)) return BigInt(value.slice(0, -1))
  if (Array.isArray(value)) return value.map(fromJson)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fromJson(v)]))
  }
  return value
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function assertValidSteps(steps: SagaStep<any>[]): void {
  for (const step of steps) {
    if (step.irreversible && step.compensation) {
      throw new Error(
        `Saga step "${step.name}" is marked irreversible but also defines a compensation — ` +
          `an irreversible step's effect cannot be undone, so it must not declare one.`
      )
    }
  }
}

export class SagaOrchestrator {
  /**
   * Starts a brand-new saga instance, persists it, and runs it to
   * completion (or to a terminal failed/needs_reconciliation state).
   */
  async run<TPayload, TContext extends Record<string, any>>(
    definition: SagaDefinition<TPayload, TContext>,
    payload: TPayload
  ): Promise<{ sagaId: string; status: SagaStatus; context: TContext }> {
    const steps = definition.buildSteps(payload)
    assertValidSteps(steps)

    const instance = await prisma.sagaInstance.create({
      data: {
        name: definition.name,
        status: 'in_progress',
        currentStep: 0,
        payload: toJson(payload),
        context: toJson({}),
        stepLog: toJson(steps.map((s) => ({ name: s.name, status: 'pending', attempts: 0 }))),
      },
    })

    return this.execute(definition, steps, instance.id, 0, {} as TContext)
  }

  /**
   * Starts a saga under a caller-supplied deterministic id (e.g. derived
   * from `groupId:cycleNumber`), or resumes it if an instance with that id
   * already exists. This is what makes a saga safe to invoke from an
   * at-least-once trigger (a BullMQ job retry, a duplicate queue message)
   * without re-running an already-broadcast on-chain step — every
   * invocation for the same logical operation converges on one instance.
   */
  async startOrResume<TPayload, TContext extends Record<string, any>>(
    definition: SagaDefinition<TPayload, TContext>,
    payload: TPayload,
    dedupeId: string
  ): Promise<{ sagaId: string; status: SagaStatus; context: TContext }> {
    const existing = await prisma.sagaInstance.findUnique({ where: { id: dedupeId } })
    if (existing) {
      if (existing.status === 'completed' || existing.status === 'failed' || existing.status === 'needs_reconciliation') {
        return { sagaId: existing.id, status: existing.status as SagaStatus, context: fromJson(existing.context) as TContext }
      }
      return this.resume(definition, dedupeId)
    }

    const steps = definition.buildSteps(payload)
    assertValidSteps(steps)

    const instance = await prisma.sagaInstance.create({
      data: {
        id: dedupeId,
        name: definition.name,
        status: 'in_progress',
        currentStep: 0,
        payload: toJson(payload),
        context: toJson({}),
        stepLog: toJson(steps.map((s) => ({ name: s.name, status: 'pending', attempts: 0 }))),
      },
    })

    return this.execute(definition, steps, instance.id, 0, {} as TContext)
  }

  /**
   * Resumes a persisted saga instance from wherever it left off — used both
   * for same-process retries and for crash recovery of a different process.
   */
  async resume<TPayload, TContext extends Record<string, any>>(
    definition: SagaDefinition<TPayload, TContext>,
    sagaId: string
  ): Promise<{ sagaId: string; status: SagaStatus; context: TContext }> {
    const instance = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: sagaId } })
    const payload = fromJson(instance.payload) as TPayload
    const context = fromJson(instance.context) as TContext
    const steps = definition.buildSteps(payload)
    assertValidSteps(steps)

    if (instance.status === 'compensating') {
      return this.compensateFrom(definition, steps, sagaId, instance.currentStep, context, new Error(instance.error ?? 'resumed compensation'))
    }

    return this.execute(definition, steps, sagaId, instance.currentStep, context)
  }

  getState(sagaId: string) {
    return prisma.sagaInstance.findUnique({ where: { id: sagaId } })
  }

  list(filter: { status?: SagaStatus; name?: string } = {}, take = 50) {
    return prisma.sagaInstance.findMany({
      where: { status: filter.status, name: filter.name },
      orderBy: { updatedAt: 'desc' },
      take,
    })
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private async execute<TPayload, TContext extends Record<string, any>>(
    definition: SagaDefinition<TPayload, TContext>,
    steps: SagaStep<TContext>[],
    sagaId: string,
    startIndex: number,
    context: TContext
  ): Promise<{ sagaId: string; status: SagaStatus; context: TContext }> {
    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i]
      let attempts = 0
      let lastError: unknown

      const maxAttempts = step.retryable ? MAX_STEP_ATTEMPTS : 1

      while (attempts < maxAttempts) {
        attempts++
        try {
          await this.markStepLog(sagaId, i, { status: 'pending', attempts, startedAt: new Date().toISOString() })
          const patch = await step.action(context)
          if (patch) Object.assign(context, patch)

          await prisma.sagaInstance.update({
            where: { id: sagaId },
            data: {
              currentStep: i + 1,
              context: toJson(context),
              lastHeartbeat: new Date(),
              stepLog: await this.patchedStepLog(sagaId, i, {
                status: 'completed',
                attempts,
                completedAt: new Date().toISOString(),
              }),
            },
          })
          lastError = undefined
          break
        } catch (error) {
          lastError = error
          logger.warn('Saga step failed', {
            sagaId,
            step: step.name,
            attempt: attempts,
            retryable: step.retryable,
            error: error instanceof Error ? error.message : String(error),
          })
          if (attempts < maxAttempts) await sleep(RETRY_BACKOFF_MS * attempts)
        }
      }

      if (lastError) {
        await this.markStepLog(sagaId, i, {
          status: 'failed',
          attempts,
          error: lastError instanceof Error ? lastError.message : String(lastError),
        })

        const provablyNoEffect = lastError instanceof SagaStepNoEffectError
        if (!step.retryable && !provablyNoEffect) {
          // The step may have partially/fully executed an irreversible
          // action before throwing (e.g. broadcast succeeded, confirmation
          // polling failed). We cannot safely compensate an action whose
          // real-world outcome is unknown, so this is flagged for a human
          // rather than silently rolled back or endlessly retried.
          return this.flagForReconciliation(sagaId, i, context, lastError, steps)
        }

        return this.compensateFrom(definition, steps, sagaId, i - 1, context, lastError)
      }
    }

    await prisma.sagaInstance.update({
      where: { id: sagaId },
      data: { status: 'completed', completedAt: new Date(), lastHeartbeat: new Date() },
    })
    return { sagaId, status: 'completed', context }
  }

  private async compensateFrom<TPayload, TContext extends Record<string, any>>(
    definition: SagaDefinition<TPayload, TContext>,
    steps: SagaStep<TContext>[],
    sagaId: string,
    fromIndex: number,
    context: TContext,
    triggeringError: unknown
  ): Promise<{ sagaId: string; status: SagaStatus; context: TContext }> {
    await prisma.sagaInstance.update({
      where: { id: sagaId },
      data: {
        status: 'compensating',
        currentStep: fromIndex,
        error: triggeringError instanceof Error ? triggeringError.message : String(triggeringError),
        lastHeartbeat: new Date(),
      },
    })

    let touchedIrreversibleStep = false

    for (let i = fromIndex; i >= 0; i--) {
      const step = steps[i]
      if (step.irreversible) touchedIrreversibleStep = true
      if (!step.compensation) continue

      try {
        await step.compensation(context)
        await this.markStepLog(sagaId, i, { status: 'compensated', attempts: 1 })
        // currentStep tracks the next index still owed compensation, so a
        // crash-recovery resume doesn't re-run a compensation that already
        // succeeded.
        await prisma.sagaInstance.update({
          where: { id: sagaId },
          data: { currentStep: i - 1, lastHeartbeat: new Date() },
        })
      } catch (compensationError) {
        logger.error('Saga compensation failed', {
          sagaId,
          step: step.name,
          error: compensationError instanceof Error ? compensationError.message : String(compensationError),
        })
        await this.markStepLog(sagaId, i, {
          status: 'compensation_failed',
          attempts: 1,
          error: compensationError instanceof Error ? compensationError.message : String(compensationError),
        })
        ErrorReporter.captureException(
          compensationError instanceof Error ? compensationError : new Error(String(compensationError)),
          { sagaId, step: step.name, phase: 'compensation' }
        )
        // A failed compensation leaves real state inconsistent — surface it
        // for a human instead of pretending the rollback succeeded.
        await prisma.sagaInstance.update({
          where: { id: sagaId },
          data: {
            status: 'needs_reconciliation',
            error: `Compensation failed at step "${step.name}": ${compensationError instanceof Error ? compensationError.message : String(compensationError)}`,
            lastHeartbeat: new Date(),
          },
        })
        return { sagaId, status: 'needs_reconciliation', context }
      }
    }

    if (touchedIrreversibleStep) {
      // Every reversible step got compensated, but an irreversible action
      // earlier in the chain already happened for real (e.g. an on-chain
      // transfer) — this is not a clean "nothing happened" failure.
      const message = `Compensated all reversible steps, but an irreversible step already completed — real-world state and saga bookkeeping may have diverged.`
      logger.error('Saga rolled back around an irreversible step', { sagaId })
      ErrorReporter.captureMessage(`Saga ${sagaId} needs reconciliation: ${message}`, 'error')
      await prisma.sagaInstance.update({
        where: { id: sagaId },
        data: { status: 'needs_reconciliation', error: message, lastHeartbeat: new Date() },
      })
      return { sagaId, status: 'needs_reconciliation', context }
    }

    await prisma.sagaInstance.update({
      where: { id: sagaId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        lastHeartbeat: new Date(),
      },
    })
    return { sagaId, status: 'failed', context }
  }

  private async flagForReconciliation<TContext extends Record<string, any>>(
    sagaId: string,
    stepIndex: number,
    context: TContext,
    error: unknown,
    steps: SagaStep<TContext>[]
  ): Promise<{ sagaId: string; status: SagaStatus; context: TContext }> {
    const message = `Non-retryable step "${steps[stepIndex].name}" failed with unknown real-world outcome: ${error instanceof Error ? error.message : String(error)}`
    logger.error('Saga needs manual reconciliation', { sagaId, step: steps[stepIndex].name })
    ErrorReporter.captureMessage(`Saga ${sagaId} needs reconciliation: ${message}`, 'error')

    await prisma.sagaInstance.update({
      where: { id: sagaId },
      data: {
        status: 'needs_reconciliation',
        error: message,
        lastHeartbeat: new Date(),
      },
    })
    return { sagaId, status: 'needs_reconciliation', context }
  }

  private async patchedStepLog(sagaId: string, index: number, patch: Partial<StepLogEntry>) {
    const instance = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: sagaId } })
    const log = (fromJson(instance.stepLog) as StepLogEntry[]) ?? []
    log[index] = { ...log[index], ...patch }
    return toJson(log)
  }

  private async markStepLog(sagaId: string, index: number, patch: Partial<StepLogEntry>) {
    const log = await this.patchedStepLog(sagaId, index, patch)
    await prisma.sagaInstance.update({ where: { id: sagaId }, data: { stepLog: log, lastHeartbeat: new Date() } })
  }
}

export const sagaOrchestrator = new SagaOrchestrator()
