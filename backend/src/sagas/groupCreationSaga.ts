import { prisma } from '../config/database'
import { dbService } from '../services/databaseService'
import { sorobanService, SorobanServiceError } from '../services/sorobanService'
import { createModuleLogger } from '../utils/logger'
import { ErrorReporter } from '../utils/errorReporter'
import { sagaOrchestrator, SagaDefinition, SagaStepNoEffectError } from './sagaOrchestrator'
import { registerSaga } from './sagaRegistry'

const logger = createModuleLogger('GroupCreationSaga')

// Failures known to mean create_group never actually reached the ledger —
// safe to treat as a normal, fully-compensatable failure. Anything else
// (a timeout after send, a submission error) is conservatively treated as
// an unknown outcome and routed to needs_reconciliation instead.
const NO_ONCHAIN_EFFECT_CODES = new Set(['SIMULATION_ERROR', 'BUILD_ERROR'])

export interface GroupCreationPayload {
  /** Stellar address of the group admin/creator, already used to sign `signedXdr`. */
  adminPublicKey: string
  /** Client-signed `create_group` transaction XDR — signing happens client-side before the saga runs. */
  signedXdr: string
  name: string
  description?: string
  /** Contribution amount in stroops, as a string (safe for JSON persistence). */
  contributionAmount: string
  /** Cycle length in days. */
  frequency: number
  maxMembers: number
  /** Wallet addresses to seed as initial members (typically just the creator). */
  members: string[]
}

interface GroupCreationContext {
  groupId?: string
  txHash?: string
}

function scheduleFrequencyLabel(days: number): { frequency: string; intervalDays?: number } {
  if (days === 7) return { frequency: 'WEEKLY' }
  if (days === 14) return { frequency: 'BI_WEEKLY' }
  if (days === 30) return { frequency: 'MONTHLY' }
  return { frequency: 'CUSTOM', intervalDays: days }
}

export const groupCreationSagaDefinition: SagaDefinition<GroupCreationPayload, GroupCreationContext> = {
  name: 'group-creation',
  buildSteps: (payload) => [
    {
      name: 'submit-onchain-create-group',
      // Broadcasting is a one-shot, real-world action: if the network
      // accepted it, blindly retrying would attempt to create a second
      // group. If we're not sure whether it landed, that's a job for
      // reconciliation (a human checking chain state), not an automatic retry.
      retryable: false,
      irreversible: true,
      action: async () => {
        try {
          const result = await sorobanService.createGroup({
            name: payload.name,
            description: payload.description ?? '',
            contributionAmount: payload.contributionAmount,
            frequency: String(payload.frequency),
            maxMembers: payload.maxMembers,
            adminPublicKey: payload.adminPublicKey,
            signedXdr: payload.signedXdr,
          })
          if (!result.groupId) {
            throw new Error('create_group submission did not return a groupId')
          }
          return { groupId: result.groupId, txHash: result.txHash }
        } catch (error) {
          if (error instanceof SorobanServiceError && NO_ONCHAIN_EFFECT_CODES.has(error.code)) {
            throw new SagaStepNoEffectError(error.message, error)
          }
          throw error
        }
      },
    },
    {
      name: 'persist-group-row',
      // Idempotent upsert keyed on the on-chain groupId — safe to retry
      // (and safe to re-run on crash recovery) without risk of duplicates.
      retryable: true,
      action: async (context) => {
        await dbService.upsertGroup(context.groupId!, {
          name: payload.name,
          contributionAmount: BigInt(payload.contributionAmount),
          frequency: payload.frequency,
          maxMembers: payload.maxMembers,
          currentRound: 0,
          isActive: true,
        })
      },
    },
    {
      name: 'add-initial-members',
      retryable: true,
      action: async (context) => {
        for (const walletAddress of payload.members) {
          await dbService.addGroupMember(context.groupId!, walletAddress)
        }
      },
    },
    {
      name: 'initialize-contribution-schedule',
      retryable: true,
      action: async (context) => {
        const { frequency, intervalDays } = scheduleFrequencyLabel(payload.frequency)
        const startDate = new Date()
        const nextDueDate = new Date(startDate.getTime() + payload.frequency * 24 * 60 * 60 * 1000)

        await prisma.contributionSchedule.upsert({
          where: { groupId: context.groupId! },
          update: {},
          create: {
            groupId: context.groupId!,
            frequency,
            intervalDays,
            startDate,
            nextDueDate,
            isActive: true,
          },
        })
      },
    },
    {
      name: 'notify-members',
      // Best-effort: a failed/undeliverable welcome notification is not a
      // reason to roll back an otherwise-successful group creation, so
      // failures here are reported but swallowed rather than thrown.
      retryable: true,
      action: async (context) => {
        // Lazily imported so importing this saga (e.g. from the groups HTTP
        // controller) doesn't force a live Redis/BullMQ connection to be
        // opened just to load the module — only paid when this step runs.
        const { notificationService } = await import('../services/notificationService')
        for (const walletAddress of payload.members) {
          try {
            await notificationService.send({
              userId: walletAddress,
              type: 'group_created',
              title: 'Group created',
              message: `"${payload.name}" is ready to go.`,
              data: { groupId: context.groupId },
            })
          } catch (error) {
            logger.warn('Failed to notify member of group creation', {
              groupId: context.groupId,
              walletAddress,
              error: error instanceof Error ? error.message : String(error),
            })
            ErrorReporter.captureException(error instanceof Error ? error : new Error(String(error)), {
              step: 'notify-members',
              groupId: context.groupId,
              walletAddress,
            })
          }
        }
      },
    },
  ],
}

registerSaga(groupCreationSagaDefinition)

export async function executeGroupCreationSaga(payload: GroupCreationPayload) {
  return sagaOrchestrator.run(groupCreationSagaDefinition, payload)
}
