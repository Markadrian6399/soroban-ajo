/**
 * Run as a standalone subprocess by sagaOrchestrator.crashRecovery.test.ts.
 * Starts a saga and hard-exits mid-flight (process.exit, no cleanup) to
 * simulate a real process crash after some steps have committed but before
 * the saga finished — exactly the scenario saga persistence exists to
 * survive.
 */
import { prisma } from '../../config/database'
import { sagaOrchestrator } from '../sagaOrchestrator'
import type { SagaDefinition } from '../sagaOrchestrator'

interface CrashTestContext {
  a?: string
  b?: string
}

const definition: SagaDefinition<{ dedupeId: string }, CrashTestContext> = {
  name: 'crash-test-saga',
  buildSteps: () => [
    { name: 'step-a', retryable: true, action: async () => ({ a: 'done' }) },
    { name: 'step-b', retryable: true, action: async () => ({ b: 'done' }) },
    {
      name: 'step-c-never-completes-here',
      retryable: true,
      action: async () => {
        // Hard-exit with no chance to persist step-c's completion — this is
        // what a crashed process actually looks like, not a caught/rethrown
        // exception.
        process.exit(1)
      },
    },
  ],
}

async function main() {
  const dedupeId = process.argv[2]
  await sagaOrchestrator.startOrResume(definition, { dedupeId }, dedupeId)
  await prisma.$disconnect()
}

if (require.main === module) {
  main()
}
