import { prisma } from '../config/database'
import { sorobanService, SorobanServiceError } from '../services/sorobanService'
import { createModuleLogger } from '../utils/logger'
import { ErrorReporter } from '../utils/errorReporter'
import { sagaOrchestrator, SagaDefinition, SagaStepNoEffectError } from './sagaOrchestrator'
import { registerSaga } from './sagaRegistry'

const logger = createModuleLogger('PayoutSaga')

export interface PayoutPayload {
  groupId: string
  recipientId: string
  recipientAddress: string
  /** Payout amount in stroops, as a string (safe for JSON persistence). */
  amount: string
  currency: string
  cycleNumber: number
}

interface PayoutContext {
  payoutId?: string
  txHash?: string
}

// Failures known to mean execute_payout never actually moved funds — safe
// to compensate the pending payout record instead of flagging for a human.
const NO_ONCHAIN_EFFECT_CODES = new Set(['SIMULATION_ERROR', 'BUILD_ERROR', 'TX_FAILED', 'KEEPER_NOT_CONFIGURED'])

export const payoutSagaDefinition: SagaDefinition<PayoutPayload, PayoutContext> = {
  name: 'payout',
  buildSteps: (payload) => [
    {
      name: 'validate-payout',
      retryable: true,
      action: async () => {
        const group = await prisma.group.findUnique({ where: { id: payload.groupId } })
        if (!group) throw new Error(`Group ${payload.groupId} not found`)
        if (!group.isActive) throw new Error(`Group ${payload.groupId} is not active`)

        const existing = await prisma.payout.findFirst({
          where: {
            groupId: payload.groupId,
            cycleNumber: payload.cycleNumber,
            status: { in: ['processing', 'completed'] },
          },
        })
        if (existing) {
          throw new Error(
            `Payout for group ${payload.groupId} cycle ${payload.cycleNumber} is already ${existing.status}`
          )
        }
      },
    },
    {
      name: 'create-pending-payout-record',
      // Idempotent: upsert keyed on (groupId, cycleNumber), safe to re-run.
      retryable: true,
      action: async () => {
        const row = await prisma.payout.upsert({
          where: { groupId_cycleNumber: { groupId: payload.groupId, cycleNumber: payload.cycleNumber } },
          update: {},
          create: {
            groupId: payload.groupId,
            recipientId: payload.recipientId,
            amount: BigInt(payload.amount),
            currency: payload.currency,
            cycleNumber: payload.cycleNumber,
            status: 'processing',
          },
        })
        return { payoutId: row.id }
      },
      // Only reached if a later step fails *before* the on-chain transfer
      // step (which is irreversible) — safe to fully undo here.
      compensation: async (context) => {
        if (!context.payoutId) return
        await prisma.payout.update({
          where: { id: context.payoutId },
          data: { status: 'failed' },
        })
      },
    },
    {
      name: 'submit-onchain-payout',
      // execute_payout actually moves funds once broadcast — never blindly
      // retried. If we can prove nothing was transferred, the action below
      // throws SagaStepNoEffectError so this failure is still compensatable;
      // otherwise it's flagged for reconciliation.
      retryable: false,
      irreversible: true,
      action: async () => {
        try {
          const result = await sorobanService.executePayout(payload.groupId)
          return { txHash: result.txHash }
        } catch (error) {
          if (error instanceof SorobanServiceError && NO_ONCHAIN_EFFECT_CODES.has(error.code)) {
            throw new SagaStepNoEffectError(error.message, error)
          }
          throw error
        }
      },
    },
    {
      name: 'finalize-payout-record',
      // Funds already moved on-chain by this point — this step only needs
      // to retry the (idempotent, id-keyed) DB update until it lands. If it
      // never does, the saga surfaces as needs_reconciliation rather than
      // silently forgetting a completed on-chain payout.
      retryable: true,
      action: async (context) => {
        await prisma.payout.update({
          where: { id: context.payoutId! },
          data: { status: 'completed', transactionHash: context.txHash, processedAt: new Date() },
        })
      },
    },
    {
      name: 'notify-recipient',
      retryable: true,
      action: async (context) => {
        // Lazily imported so importing this saga doesn't force a live
        // Redis/BullMQ connection to be opened just to load the module —
        // only paid when this step actually runs.
        const { notificationService } = await import('../services/notificationService')
        try {
          await notificationService.send({
            userId: payload.recipientAddress,
            type: 'payout_received',
            title: 'Payout received',
            message: `You received a payout of ${payload.amount} ${payload.currency}.`,
            data: { groupId: payload.groupId, payoutId: context.payoutId, txHash: context.txHash },
          })
        } catch (error) {
          logger.warn('Failed to notify recipient of payout', {
            payoutId: context.payoutId,
            error: error instanceof Error ? error.message : String(error),
          })
          ErrorReporter.captureException(error instanceof Error ? error : new Error(String(error)), {
            step: 'notify-recipient',
            payoutId: context.payoutId,
          })
        }
      },
    },
  ],
}

registerSaga(payoutSagaDefinition)

/**
 * `groupId:cycleNumber` is used as the saga's deterministic id so that a
 * BullMQ job retry (or an operator re-triggering a payout) converges on the
 * same saga instance instead of re-running the irreversible on-chain step.
 */
export function payoutSagaId(groupId: string, cycleNumber: number): string {
  return `payout-${groupId}-${cycleNumber}`
}

export async function executePayoutSaga(payload: PayoutPayload) {
  return sagaOrchestrator.startOrResume(payoutSagaDefinition, payload, payoutSagaId(payload.groupId, payload.cycleNumber))
}
