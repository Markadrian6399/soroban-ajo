/**
 * Unit-level coverage of the persisted saga orchestrator: compensation
 * ordering, the irreversible/needs_reconciliation distinction, the
 * SagaStepNoEffectError downgrade path, and startOrResume dedup.
 */
import { prisma } from '../../config/database'
import { sagaOrchestrator, SagaDefinition, SagaStepNoEffectError } from '../sagaOrchestrator'

jest.setTimeout(30000)

interface Ctx {
  [key: string]: any
}

async function cleanup(name: string) {
  await prisma.sagaInstance.deleteMany({ where: { name } })
}

describe('SagaOrchestrator', () => {
  afterEach(async () => {
    await cleanup('test-saga')
  })

  it('persists step-by-step progress and completes when every step succeeds', async () => {
    const definition: SagaDefinition<{}, Ctx> = {
      name: 'test-saga',
      buildSteps: () => [
        { name: 'a', retryable: true, action: async () => ({ a: 1 }) },
        { name: 'b', retryable: true, action: async (ctx) => ({ b: ctx.a + 1 }) },
      ],
    }

    const result = await sagaOrchestrator.run(definition, {})

    expect(result.status).toBe('completed')
    expect(result.context).toEqual({ a: 1, b: 2 })

    const row = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: result.sagaId } })
    expect(row.status).toBe('completed')
    const stepLog = row.stepLog as any[]
    expect(stepLog.map((s) => s.status)).toEqual(['completed', 'completed'])
  })

  it('compensates completed reversible steps, in reverse order, when a later step exhausts retries', async () => {
    const compensateOrder: string[] = []

    const definition: SagaDefinition<{}, Ctx> = {
      name: 'test-saga',
      buildSteps: () => [
        {
          name: 'reserve-a',
          retryable: true,
          action: async () => ({ a: 'reserved' }),
          compensation: async () => {
            compensateOrder.push('reserve-a')
          },
        },
        {
          name: 'reserve-b',
          retryable: true,
          action: async () => ({ b: 'reserved' }),
          compensation: async () => {
            compensateOrder.push('reserve-b')
          },
        },
        {
          name: 'always-fails',
          retryable: true,
          action: async () => {
            throw new Error('downstream system unavailable')
          },
        },
      ],
    }

    const result = await sagaOrchestrator.run(definition, {})

    expect(result.status).toBe('failed')
    // Reverse order: the most-recently-completed step is undone first.
    expect(compensateOrder).toEqual(['reserve-b', 'reserve-a'])

    const row = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: result.sagaId } })
    expect(row.status).toBe('failed')
  })

  it('reports needs_reconciliation instead of failed when an irreversible step already completed', async () => {
    const compensateOrder: string[] = []

    const definition: SagaDefinition<{}, Ctx> = {
      name: 'test-saga',
      buildSteps: () => [
        {
          name: 'call-contract',
          retryable: false,
          irreversible: true,
          action: async () => ({ txHash: '0xabc' }),
        },
        {
          name: 'reserve-b',
          retryable: true,
          action: async () => ({ b: 'reserved' }),
          compensation: async () => {
            compensateOrder.push('reserve-b')
          },
        },
        {
          name: 'always-fails',
          retryable: true,
          action: async () => {
            throw new Error('DB write keeps failing')
          },
        },
      ],
    }

    const result = await sagaOrchestrator.run(definition, {})

    // Not "failed" — that would imply a clean rollback to nothing-happened,
    // but the on-chain call already succeeded for real.
    expect(result.status).toBe('needs_reconciliation')
    // The reversible step between the irreversible one and the failure is
    // still compensated — only the irreversible step itself is left alone.
    expect(compensateOrder).toEqual(['reserve-b'])

    const row = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: result.sagaId } })
    expect(row.status).toBe('needs_reconciliation')
    expect(row.error).toBeTruthy()
  })

  it('flags needs_reconciliation when a non-retryable step itself fails with an unknown real-world outcome', async () => {
    const definition: SagaDefinition<{}, Ctx> = {
      name: 'test-saga',
      buildSteps: () => [
        { name: 'a', retryable: true, action: async () => ({ a: 1 }) },
        {
          name: 'call-contract',
          retryable: false,
          irreversible: true,
          action: async () => {
            throw new Error('network timeout — unknown whether the tx landed')
          },
        },
      ],
    }

    const result = await sagaOrchestrator.run(definition, {})

    expect(result.status).toBe('needs_reconciliation')
    const row = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: result.sagaId } })
    expect(row.error).toContain('unknown real-world outcome')
  })

  it('SagaStepNoEffectError downgrades an irreversible step failure to a normal compensatable failure', async () => {
    const compensateOrder: string[] = []

    const definition: SagaDefinition<{}, Ctx> = {
      name: 'test-saga',
      buildSteps: () => [
        {
          name: 'reserve-a',
          retryable: true,
          action: async () => ({ a: 'reserved' }),
          compensation: async () => {
            compensateOrder.push('reserve-a')
          },
        },
        {
          name: 'call-contract',
          retryable: false,
          irreversible: true,
          action: async () => {
            // Proven safe: this failure happened before anything was broadcast.
            throw new SagaStepNoEffectError('simulation rejected before submission')
          },
        },
      ],
    }

    const result = await sagaOrchestrator.run(definition, {})

    expect(result.status).toBe('failed')
    expect(compensateOrder).toEqual(['reserve-a'])
  })

  it('rejects a step definition that is both irreversible and declares a compensation', async () => {
    const definition: SagaDefinition<{}, Ctx> = {
      name: 'test-saga',
      buildSteps: () => [
        {
          name: 'bad-step',
          retryable: false,
          irreversible: true,
          action: async () => ({}),
          compensation: async () => {},
        },
      ],
    }

    await expect(sagaOrchestrator.run(definition, {})).rejects.toThrow(/must not declare one/)
  })

  it('startOrResume converges concurrent/duplicate triggers on the same saga instance', async () => {
    const actionSpy = jest.fn(async () => ({ done: true }))
    const definition: SagaDefinition<{}, Ctx> = {
      name: 'test-saga',
      buildSteps: () => [{ name: 'only-step', retryable: true, action: actionSpy }],
    }

    const dedupeId = 'test-saga-dedupe-key'
    await prisma.sagaInstance.deleteMany({ where: { id: dedupeId } })

    const first = await sagaOrchestrator.startOrResume(definition, {}, dedupeId)
    expect(first.status).toBe('completed')
    expect(actionSpy).toHaveBeenCalledTimes(1)

    // A second "retry" of the same logical operation (e.g. a BullMQ retry)
    // must not re-run the already-completed step.
    const second = await sagaOrchestrator.startOrResume(definition, {}, dedupeId)
    expect(second.status).toBe('completed')
    expect(actionSpy).toHaveBeenCalledTimes(1)

    await prisma.sagaInstance.deleteMany({ where: { id: dedupeId } })
  })

  it('retries a retryable step before giving up, then compensates', async () => {
    let attempts = 0
    const definition: SagaDefinition<{}, Ctx> = {
      name: 'test-saga',
      buildSteps: () => [
        {
          name: 'flaky',
          retryable: true,
          action: async () => {
            attempts++
            if (attempts < 3) throw new Error('transient failure')
            return { ok: true }
          },
        },
      ],
    }

    const result = await sagaOrchestrator.run(definition, {})
    expect(result.status).toBe('completed')
    expect(attempts).toBe(3)
  })
})
