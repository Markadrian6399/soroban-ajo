/**
 * groupCreationSaga: the on-chain create_group call is irreversible, so
 * these tests focus on what happens when the DB persistence steps that
 * follow it fail — the exact "orphaned on-chain group with no matching DB
 * row" scenario the issue calls out.
 */
import { prisma } from '../../config/database'

jest.mock('../../services/sorobanService')
jest.mock('../../services/notificationService', () => ({
  notificationService: { send: jest.fn().mockResolvedValue(undefined) },
}))

import { sorobanService, SorobanServiceError } from '../../services/sorobanService'
import { executeGroupCreationSaga } from '../groupCreationSaga'

jest.setTimeout(30000)

const mockCreateGroup = sorobanService.createGroup as jest.Mock

async function cleanup(groupId: string) {
  await prisma.sagaInstance.deleteMany({ where: { name: 'group-creation' } })
  await prisma.contributionSchedule.deleteMany({ where: { groupId } })
  await prisma.groupMember.deleteMany({ where: { groupId } })
  await prisma.group.deleteMany({ where: { id: groupId } })
}

describe('groupCreationSaga', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('creates the group on-chain then persists the DB row, members, and schedule', async () => {
    const groupId = 'saga-created-group-1'
    mockCreateGroup.mockResolvedValue({ groupId, txHash: 'tx-create-1' })

    const admin = 'GADMIN1'.padEnd(56, 'A')

    const result = await executeGroupCreationSaga({
      adminPublicKey: admin,
      signedXdr: 'signed-xdr-blob',
      name: 'Roommates Ajo',
      description: 'Monthly rent pool',
      contributionAmount: '10000000',
      frequency: 30,
      maxMembers: 6,
      members: [admin],
    })

    expect(result.status).toBe('completed')
    expect(result.context.groupId).toBe(groupId)

    const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } })
    expect(group.name).toBe('Roommates Ajo')
    expect(group.contributionAmount).toBe(BigInt('10000000'))

    const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: admin } })
    expect(membership).not.toBeNull()

    const schedule = await prisma.contributionSchedule.findUnique({ where: { groupId } })
    expect(schedule).not.toBeNull()

    await cleanup(groupId)
  })

  it('reports needs_reconciliation (not failed) when the DB write fails after the on-chain group already exists', async () => {
    const groupId = 'saga-created-group-2'
    mockCreateGroup.mockResolvedValue({ groupId, txHash: 'tx-create-2' })

    const admin = 'GADMIN2'.padEnd(56, 'A')

    // Force the idempotent DB-persistence step to fail every attempt by
    // giving it a contributionAmount that can't become a BigInt — the
    // on-chain step has already "happened" by this point via the mock.
    const result = await executeGroupCreationSaga({
      adminPublicKey: admin,
      signedXdr: 'signed-xdr-blob',
      name: 'Broken Group',
      contributionAmount: 'not-a-number',
      frequency: 30,
      maxMembers: 6,
      members: [admin],
    })

    expect(result.status).toBe('needs_reconciliation')
    // The on-chain call is never retried/undone — the group genuinely
    // exists on-chain even though the DB row never got written.
    expect(mockCreateGroup).toHaveBeenCalledTimes(1)

    await cleanup(groupId)
  })

  it('reports a clean failure when create_group is provably rejected before broadcast (simulation error)', async () => {
    mockCreateGroup.mockRejectedValue(new SorobanServiceError('simulation failed: bad params', 'SIMULATION_ERROR'))

    const admin = 'GADMIN3'.padEnd(56, 'A')

    const result = await executeGroupCreationSaga({
      adminPublicKey: admin,
      signedXdr: 'signed-xdr-blob',
      name: 'Never Created',
      contributionAmount: '1000',
      frequency: 30,
      maxMembers: 6,
      members: [admin],
    })

    // Proven safe: nothing was ever broadcast, so no reconciliation is needed.
    expect(result.status).toBe('failed')
    expect(result.context.groupId).toBeUndefined()
  })

  it('flags needs_reconciliation (does not report a clean failure) when create_group fails ambiguously', async () => {
    mockCreateGroup.mockRejectedValue(new Error('network timeout — unknown whether the tx landed'))

    const admin = 'GADMIN4'.padEnd(56, 'A')

    const result = await executeGroupCreationSaga({
      adminPublicKey: admin,
      signedXdr: 'signed-xdr-blob',
      name: 'Ambiguous Outcome',
      contributionAmount: '1000',
      frequency: 30,
      maxMembers: 6,
      members: [admin],
    })

    // We can't prove the on-chain call didn't land, so this must not be
    // reported as a safe "nothing happened" failure.
    expect(result.status).toBe('needs_reconciliation')
  })
})
