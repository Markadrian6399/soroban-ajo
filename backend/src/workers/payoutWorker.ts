import { Job } from 'bullmq';
import { createWorker } from '../queues/queueManager';
import { PAYOUT_QUEUE_NAME, PayoutJobData } from '../queues/payoutQueue';
import { logger } from '../utils/logger';

interface PayoutResult {
  success: boolean;
  sagaId: string;
  transactionHash?: string;
}

/**
 * Process a payout job by driving it through the payout saga instead of
 * performing the contract call / DB write / notification inline. Doing it
 * inline meant a BullMQ retry (its only failure-recovery mechanism) would
 * blindly re-run the *entire* job function on failure — including a
 * successfully-broadcast on-chain transfer — risking a duplicate payout.
 * The saga is keyed deterministically on `groupId:cycleNumber`, so a retry
 * of this same job (or a crash-recovery resume in a different process)
 * converges on the same saga instance instead of re-executing it.
 */
async function processPayoutJob(job: Job<PayoutJobData>): Promise<PayoutResult> {
  const { groupId, recipientId, recipientAddress, amount, currency, cycleNumber } = job.data;

  logger.info(`Processing payout job ${job.id}`, {
    groupId,
    recipientId,
    amount,
    cycleNumber,
    attempt: job.attemptsMade + 1,
  });

  if (!groupId || !recipientId || !recipientAddress || !amount) {
    throw new Error('Missing required payout fields');
  }
  if (amount <= 0) {
    throw new Error(`Invalid payout amount: ${amount}`);
  }

  await job.updateProgress(10);

  const { executePayoutSaga } = await import('../sagas/payoutSaga');
  const result = await executePayoutSaga({
    groupId,
    recipientId,
    recipientAddress,
    amount: String(amount),
    currency,
    cycleNumber,
  });

  await job.updateProgress(100);

  if (result.status === 'completed') {
    logger.info('Payout processed successfully', {
      jobId: job.id,
      sagaId: result.sagaId,
      transactionHash: result.context.txHash,
    });
    return { success: true, sagaId: result.sagaId, transactionHash: result.context.txHash };
  }

  if (result.status === 'failed') {
    // Rolled back cleanly (no on-chain effect occurred) — safe for BullMQ
    // to retry this job, which will start a fresh saga attempt.
    throw new Error(`Payout saga ${result.sagaId} failed and was rolled back`);
  }

  // needs_reconciliation: an irreversible step may have already completed.
  // Do NOT throw here — throwing would make BullMQ retry the job and
  // re-invoke the saga trigger, but startOrResume already treats a
  // terminal needs_reconciliation instance as done, so a retry would just
  // no-op against it. Surface this as a distinct outcome for on-call instead.
  logger.error('Payout saga needs manual reconciliation', { jobId: job.id, sagaId: result.sagaId });
  return { success: false, sagaId: result.sagaId };
}

/**
 * Initialize payout worker
 */
export function initializePayoutWorker() {
  const worker = createWorker(PAYOUT_QUEUE_NAME, processPayoutJob, 5);

  worker.on('completed', (job) => {
    logger.info(`Payout job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Payout job ${job?.id} failed after all retries`, { error: err.message });
  });

  return worker;
}
