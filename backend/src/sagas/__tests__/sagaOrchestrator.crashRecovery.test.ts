/**
 * Proves saga state is crash-recoverable: a real OS process is started,
 * completes two steps, and is hard-killed mid-saga (process.exit inside the
 * third step's action — no graceful shutdown). A separate orchestrator
 * instance (this test process) then resumes the same saga id and confirms
 * it picks up exactly where the crashed process left off, re-using the
 * already-persisted context instead of recomputing it.
 */
import { execFileSync } from 'child_process'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '../../config/database'
import { sagaOrchestrator, SagaDefinition } from '../sagaOrchestrator'

jest.setTimeout(90000)

interface CrashTestContext {
  a?: string
  b?: string
  c?: string
}

describe('saga crash recovery (real process kill)', () => {
  afterEach(async () => {
    await prisma.sagaInstance.deleteMany({ where: { name: 'crash-test-saga' } })
  })

  it('resumes from the last persisted step after the process that started the saga is killed', async () => {
    const dedupeId = `crash-test-${randomUUID()}`
    const fixture = path.resolve(__dirname, '../testFixtures/crashMidSaga.ts')
    const tsxBin = path.resolve(__dirname, '../../../../node_modules/.bin/tsx')

    // Start the saga in a real child process and let it crash mid-flight.
    // process.exit(1) inside the fixture makes execFileSync throw — capture
    // stdout/stderr so a genuine startup failure (vs. the expected crash)
    // is diagnosable instead of just failing the next assertion.
    let crashed = false
    try {
      execFileSync(tsxBin, [fixture, dedupeId], {
        cwd: path.resolve(__dirname, '../../..'),
        env: process.env,
        stdio: 'pipe',
        timeout: 60000,
      })
    } catch (error: any) {
      crashed = true
      if (error.status !== 1) {
        throw new Error(
          `Fixture subprocess did not exit the way the test expects (status=${error.status}).\n` +
            `stdout: ${error.stdout}\nstderr: ${error.stderr}`
        )
      }
    }
    expect(crashed).toBe(true)

    // Confirm the crash really did leave the saga mid-flight, not finished.
    const midCrashState = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: dedupeId } })
    expect(midCrashState.status).toBe('in_progress')
    expect(midCrashState.currentStep).toBe(2) // step-a and step-b committed; step-c never did
    expect(midCrashState.context).toMatchObject({ a: 'done', b: 'done' })

    // A fresh orchestrator instance (standing in for a restarted process)
    // resumes the same saga id, using a step-c that succeeds this time.
    const stepASpy = jest.fn(async () => ({ a: 'done' }))
    const stepBSpy = jest.fn(async () => ({ b: 'done' }))
    const stepCSpy = jest.fn(async () => ({ c: 'done' }))

    const resumedDefinition: SagaDefinition<{ dedupeId: string }, CrashTestContext> = {
      name: 'crash-test-saga',
      buildSteps: () => [
        { name: 'step-a', retryable: true, action: stepASpy },
        { name: 'step-b', retryable: true, action: stepBSpy },
        { name: 'step-c-never-completes-here', retryable: true, action: stepCSpy },
      ],
    }

    const result = await sagaOrchestrator.resume(resumedDefinition, dedupeId)

    expect(result.status).toBe('completed')
    expect(result.context).toEqual({ a: 'done', b: 'done', c: 'done' })

    // The already-committed steps must not be re-run on recovery — only
    // step-c (the one the crash interrupted) executes in this process.
    expect(stepASpy).not.toHaveBeenCalled()
    expect(stepBSpy).not.toHaveBeenCalled()
    expect(stepCSpy).toHaveBeenCalledTimes(1)

    const finalState = await prisma.sagaInstance.findUniqueOrThrow({ where: { id: dedupeId } })
    expect(finalState.status).toBe('completed')
    expect(finalState.completedAt).not.toBeNull()
  })
})
