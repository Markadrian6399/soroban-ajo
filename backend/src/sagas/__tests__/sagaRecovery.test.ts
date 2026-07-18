/**
 * recoverIncompleteSagas() is what a process runs on startup to resume or
 * roll back whatever a previous crashed process left mid-flight.
 */
import { prisma } from '../../config/database'
import { recoverIncompleteSagas } from '../sagaRecovery'
import { registerSaga, getSagaDefinition } from '../sagaRegistry'
import { SagaDefinition } from '../sagaOrchestrator'

jest.setTimeout(30000)

describe('recoverIncompleteSagas', () => {
  const sagaName = `recovery-test-saga-${Date.now()}`

  afterEach(async () => {
    await prisma.sagaInstance.deleteMany({ where: { name: sagaName } })
  })

  it('resumes an in_progress instance to completion using the registered definition', async () => {
    const stepSpy = jest.fn(async () => ({ done: true }))
    const definition: SagaDefinition<{}, { done?: boolean }> = {
      name: sagaName,
      buildSteps: () => [{ name: 'only-step', retryable: true, action: stepSpy }],
    }
    if (!getSagaDefinition(sagaName)) registerSaga(definition)

    const instance = await prisma.sagaInstance.create({
      data: { name: sagaName, status: 'in_progress', currentStep: 0, payload: {}, context: {} },
    })

    // Scoped to this test's own saga name — recoverIncompleteSagas() sweeps
    // every in_progress/compensating instance by default, and this suite
    // may run alongside other test files sharing the same test DB.
    await recoverIncompleteSagas([sagaName])

    expect(stepSpy).toHaveBeenCalledTimes(1)

    const row = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: instance.id } })
    expect(row.status).toBe('completed')
  })

  it('marks an instance needing reconciliation when no saga definition is registered for its name', async () => {
    const unregisteredName = `unregistered-saga-${Date.now()}`
    const instance = await prisma.sagaInstance.create({
      data: { name: unregisteredName, status: 'in_progress', currentStep: 0, payload: {}, context: {} },
    })

    await recoverIncompleteSagas([unregisteredName])

    const row = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: instance.id } })
    expect(row.status).toBe('needs_reconciliation')
    expect(row.error).toContain('No saga definition registered')

    await prisma.sagaInstance.deleteMany({ where: { name: unregisteredName } })
  })

  it('ignores sagas that already reached a terminal state', async () => {
    const instance = await prisma.sagaInstance.create({
      data: { name: sagaName, status: 'completed', currentStep: 1, payload: {}, context: {}, completedAt: new Date() },
    })

    await recoverIncompleteSagas([sagaName])

    const row = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: instance.id } })
    expect(row.status).toBe('completed')
  })
})
