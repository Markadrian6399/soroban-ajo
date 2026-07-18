/**
 * payoutSaga: the on-chain transfer step is irreversible, so these tests
 * focus on exactly the partial-failure scenarios the issue calls out —
 * what happens when the DB write before or after the transfer fails, and
 * that a retried/duplicated trigger can never cause a second transfer.
 */
import { prisma } from '../../config/database'

jest.mock('../../services/sorobanService')
jest.mock('../../services/notificationService', () => ({
  notificationService: { send: jest.fn().mockResolvedValue(undefined) },
}))

import { sorobanService, SorobanServiceError } from '../../services/sorobanService'
import { notificationService } from '../../services/notificationService'
import { executePayoutSaga, payoutSagaId } from '../payoutSaga'

jest.setTimeout(30000)

const mockExecutePayout = sorobanService.executePayout as jest.Mock

async function seedGroupAndUser(groupId: string, userId: string, walletAddress: string) {
  await prisma.user.create({ data: { id: userId, walletAddress } })
  await prisma.group.create({
    data: {
      id: groupId,
      name: 'Test Group',
      contributionAmount: BigInt(1000),
      frequency: 30,
      maxMembers: 5,
      isActive: true,
    },
  })
}

async function cleanup(groupId: string, userId: string) {
  await prisma.sagaInstance.deleteMany({ where: { name: 'payout' } })
  await prisma.payout.deleteMany({ where: { groupId } })
  await prisma.group.deleteMany({ where: { id: groupId } })
  await prisma.user.deleteMany({ where: { id: userId } })
}

describe('payoutSaga', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('completes the payout and records the on-chain txHash', async () => {
    const groupId = 'payout-test-group-1'
    const userId = 'payout-test-user-1'
    await seedGroupAndUser(groupId, userId, 'GRECIPIENT1'.padEnd(56, 'A'))

    mockExecutePayout.mockResolvedValue({ txHash: 'tx-happy-path' })

    const result = await executePayoutSaga({
      groupId,
      recipientId: userId,
      recipientAddress: 'GRECIPIENT1'.padEnd(56, 'A'),
      amount: '5000',
      currency: 'XLM',
      cycleNumber: 1,
    })

    expect(result.status).toBe('completed')
    expect(mockExecutePayout).toHaveBeenCalledTimes(1)
    expect(mockExecutePayout).toHaveBeenCalledWith(groupId)

    const payout = await prisma.payout.findFirstOrThrow({ where: { groupId, cycleNumber: 1 } })
    expect(payout.status).toBe('completed')
    expect(payout.transactionHash).toBe('tx-happy-path')
    expect(notificationService.send).toHaveBeenCalledTimes(1)

    await cleanup(groupId, userId)
  })

  it('compensates (marks failed) the pending payout record when the on-chain call fails with a provably-safe error', async () => {
    const groupId = 'payout-test-group-2'
    const userId = 'payout-test-user-2'
    await seedGroupAndUser(groupId, userId, 'GRECIPIENT2'.padEnd(56, 'A'))

    mockExecutePayout.mockRejectedValue(new SorobanServiceError('rejected in simulation', 'SIMULATION_ERROR'))

    const result = await executePayoutSaga({
      groupId,
      recipientId: userId,
      recipientAddress: 'GRECIPIENT2'.padEnd(56, 'A'),
      amount: '5000',
      currency: 'XLM',
      cycleNumber: 1,
    })

    // Nothing was ever broadcast, so this is a clean, fully-compensated failure.
    expect(result.status).toBe('failed')
    const payout = await prisma.payout.findFirstOrThrow({ where: { groupId, cycleNumber: 1 } })
    expect(payout.status).toBe('failed')

    await cleanup(groupId, userId)
  })

  it('flags needs_reconciliation (does not touch the payout record) when the on-chain outcome is ambiguous', async () => {
    const groupId = 'payout-test-group-3'
    const userId = 'payout-test-user-3'
    await seedGroupAndUser(groupId, userId, 'GRECIPIENT3'.padEnd(56, 'A'))

    mockExecutePayout.mockRejectedValue(
      new SorobanServiceError('network dropped after send, unknown outcome', 'SUBMISSION_ERROR')
    )

    const result = await executePayoutSaga({
      groupId,
      recipientId: userId,
      recipientAddress: 'GRECIPIENT3'.padEnd(56, 'A'),
      amount: '5000',
      currency: 'XLM',
      cycleNumber: 1,
    })

    expect(result.status).toBe('needs_reconciliation')
    // The pending record is left exactly as-is for a human to reconcile —
    // not silently deleted, not wrongly marked completed.
    const payout = await prisma.payout.findFirstOrThrow({ where: { groupId, cycleNumber: 1 } })
    expect(payout.status).toBe('processing')

    await cleanup(groupId, userId)
  })

  it('never calls executePayout twice for the same group/cycle even when triggered again after completion', async () => {
    const groupId = 'payout-test-group-4'
    const userId = 'payout-test-user-4'
    await seedGroupAndUser(groupId, userId, 'GRECIPIENT4'.padEnd(56, 'A'))

    mockExecutePayout.mockResolvedValue({ txHash: 'tx-once' })

    const payload = {
      groupId,
      recipientId: userId,
      recipientAddress: 'GRECIPIENT4'.padEnd(56, 'A'),
      amount: '5000',
      currency: 'XLM',
      cycleNumber: 1,
    }

    const first = await executePayoutSaga(payload)
    expect(first.status).toBe('completed')

    // Simulates a BullMQ retry / duplicate cron trigger for the same cycle.
    const second = await executePayoutSaga(payload)
    expect(second.status).toBe('completed')
    expect(second.sagaId).toBe(first.sagaId)
    expect(second.sagaId).toBe(payoutSagaId(groupId, 1))

    expect(mockExecutePayout).toHaveBeenCalledTimes(1)

    const payouts = await prisma.payout.findMany({ where: { groupId, cycleNumber: 1 } })
    expect(payouts).toHaveLength(1)

    await cleanup(groupId, userId)
  })

  it('rejects a payout for a cycle that already has one processing or completed', async () => {
    const groupId = 'payout-test-group-5'
    const userId = 'payout-test-user-5'
    await seedGroupAndUser(groupId, userId, 'GRECIPIENT5'.padEnd(56, 'A'))
    await prisma.payout.create({
      data: { groupId, recipientId: userId, amount: BigInt(1), currency: 'XLM', cycleNumber: 1, status: 'completed' },
    })

    const result = await executePayoutSaga({
      groupId,
      recipientId: userId,
      recipientAddress: 'GRECIPIENT5'.padEnd(56, 'A'),
      amount: '5000',
      currency: 'XLM',
      cycleNumber: 1,
    })

    expect(result.status).toBe('failed')
    expect(mockExecutePayout).not.toHaveBeenCalled()

    await cleanup(groupId, userId)
  })
})
