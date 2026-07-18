/**
 * Observability requirement: stuck/failed saga instances must be
 * detectable and alertable, not silently sitting forever.
 */
import { prisma } from '../../config/database'
import { checkSagaHealth, getSagaStats } from '../sagaMonitor'
import { ErrorReporter } from '../../utils/errorReporter'

jest.setTimeout(30000)

describe('sagaMonitor', () => {
  afterEach(async () => {
    await prisma.sagaInstance.deleteMany({ where: { name: 'monitor-test-saga' } })
    jest.restoreAllMocks()
  })

  it('flags an in_progress saga whose heartbeat has gone stale as stuck, and alerts', async () => {
    const staleHeartbeat = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
    const instance = await prisma.sagaInstance.create({
      data: {
        name: 'monitor-test-saga',
        status: 'in_progress',
        payload: {},
        lastHeartbeat: staleHeartbeat,
      },
    })

    const alertSpy = jest.spyOn(ErrorReporter, 'captureMessage')

    const summary = await checkSagaHealth()

    expect(summary.stuck.map((s) => s.id)).toContain(instance.id)
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining(instance.id), 'error')
  })

  it('does not flag an in_progress saga with a recent heartbeat', async () => {
    const instance = await prisma.sagaInstance.create({
      data: {
        name: 'monitor-test-saga',
        status: 'in_progress',
        payload: {},
        lastHeartbeat: new Date(),
      },
    })

    const summary = await checkSagaHealth()
    expect(summary.stuck.map((s) => s.id)).not.toContain(instance.id)
  })

  it('surfaces needs_reconciliation instances regardless of heartbeat age', async () => {
    const instance = await prisma.sagaInstance.create({
      data: {
        name: 'monitor-test-saga',
        status: 'needs_reconciliation',
        payload: {},
        error: 'compensation failed at step X',
      },
    })

    const alertSpy = jest.spyOn(ErrorReporter, 'captureMessage')
    const summary = await checkSagaHealth()

    expect(summary.needsReconciliation.map((s) => s.id)).toContain(instance.id)
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('needs manual reconciliation'), 'error')
  })

  it('getSagaStats groups counts by name and status', async () => {
    await prisma.sagaInstance.createMany({
      data: [
        { name: 'monitor-test-saga', status: 'completed', payload: {} },
        { name: 'monitor-test-saga', status: 'completed', payload: {} },
        { name: 'monitor-test-saga', status: 'failed', payload: {} },
      ],
    })

    const stats = await getSagaStats()
    const completed = stats.find((s) => s.name === 'monitor-test-saga' && s.status === 'completed')
    const failed = stats.find((s) => s.name === 'monitor-test-saga' && s.status === 'failed')

    expect(completed?.count).toBe(2)
    expect(failed?.count).toBe(1)
  })
})
