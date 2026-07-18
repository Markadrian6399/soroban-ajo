/**
 * Manual Jest mock for stellar-sdk (node_modules mock).
 * Covers all APIs used by SorobanService.
 */

// --- SorobanRpc.Server mock ---

const mockSimulateTransaction = jest.fn()
const mockSendTransaction = jest.fn()
const mockGetAccount = jest.fn()
const mockGetTransaction = jest.fn()
const mockGetLatestLedger = jest.fn()

class MockServer {
  simulateTransaction = mockSimulateTransaction
  sendTransaction = mockSendTransaction
  getAccount = mockGetAccount
  getTransaction = mockGetTransaction
  getLatestLedger = mockGetLatestLedger
}

// --- TransactionBuilder mock ---

const mockBuild = jest.fn()
const mockAddOperation = jest.fn()
const mockSetTimeout = jest.fn()
const mockFromXDR = jest.fn()

class MockTransactionBuilder {
  constructor(_account: unknown, _opts: unknown) {}

  addOperation(_op: unknown) {
    mockAddOperation(_op)
    return this
  }

  setTimeout(_timeout: number) {
    mockSetTimeout(_timeout)
    return this
  }

  build() {
    return mockBuild()
  }

  static fromXDR(xdr: string, networkPassphrase: string) {
    return mockFromXDR(xdr, networkPassphrase)
  }
}

// --- Contract mock ---

const mockContractCall = jest.fn()

class MockContract {
  constructor(_contractId: string) {}

  call(method: string, ...args: unknown[]) {
    return mockContractCall(method, ...args)
  }
}

// --- Address mock ---

const mockAddressFromString = jest.fn()
const mockAddressToScVal = jest.fn()

class MockAddress {
  constructor(private readonly address: string) {}

  toScVal() {
    return mockAddressToScVal(this.address)
  }

  toString() {
    return this.address
  }

  static fromString(address: string) {
    mockAddressFromString(address)
    return new MockAddress(address)
  }

  static fromScVal(scVal: unknown) {
    return new MockAddress('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN')
  }
}

// --- nativeToScVal mock ---

const mockNativeToScVal = jest.fn()

// --- Keypair mock ---

const mockKeypairSign = jest.fn()
const mockKeypairFromSecret = jest.fn()

class MockKeypair {
  constructor(private readonly secret: string) {}

  publicKey() {
    return 'GKEEPERMOCKPUBLICKEY00000000000000000000000000000000000'
  }

  sign(data: Buffer) {
    return mockKeypairSign(data)
  }

  static fromSecret(secret: string) {
    mockKeypairFromSecret(secret)
    if (secret === 'invalid-secret') {
      throw new Error('Invalid secret key')
    }
    return new MockKeypair(secret)
  }
}

// --- SorobanRpc namespace ---

const mockAssembleTransaction = jest.fn()

const SorobanRpc = {
  Server: MockServer,
  assembleTransaction: mockAssembleTransaction,
  Api: {
    GetTransactionStatus: {
      SUCCESS: 'SUCCESS',
      FAILED: 'FAILED',
      NOT_FOUND: 'NOT_FOUND',
    },
    isSimulationError: jest.fn((result: unknown) => {
      return (result as { error?: unknown })?.error !== undefined
    }),
  },
}

// --- Constants ---

const BASE_FEE = '100'

const Networks = {
  TESTNET: 'Test SDF Network ; September 2015',
  PUBLIC: 'Public Global Stellar Network ; September 2015',
}

// --- resetStellarMocks ---

export function resetStellarMocks(): void {
  mockSimulateTransaction.mockReset()
  mockSendTransaction.mockReset()
  mockGetAccount.mockReset()
  mockGetTransaction.mockReset()
  mockGetLatestLedger.mockReset()
  mockBuild.mockReset()
  mockAddOperation.mockReset()
  mockSetTimeout.mockReset()
  mockFromXDR.mockReset()
  mockContractCall.mockReset()
  mockAddressFromString.mockReset()
  mockAddressToScVal.mockReset()
  mockNativeToScVal.mockReset()
  mockAssembleTransaction.mockReset()
  ;(SorobanRpc.Api.isSimulationError as jest.Mock).mockReset()
  ;(SorobanRpc.Api.isSimulationError as jest.Mock).mockImplementation(
    (result: unknown) => (result as { error?: unknown })?.error !== undefined
  )

  // Restore sensible defaults
  mockGetAccount.mockResolvedValue({
    accountId: () => 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    sequenceNumber: () => '1000',
    incrementSequenceNumber: jest.fn(),
  })

  mockSimulateTransaction.mockResolvedValue({
    result: { retval: null },
  })

  mockSendTransaction.mockResolvedValue({
    status: 'PENDING',
    hash: 'mock-tx-hash',
  })

  mockGetTransaction.mockResolvedValue({
    status: 'SUCCESS',
  })

  mockGetLatestLedger.mockResolvedValue({
    sequence: 1000,
  })

  mockBuild.mockReturnValue({
    toXDR: () => 'mock-xdr-base64',
    hash: () => Buffer.from('mock-hash'),
  })

  mockFromXDR.mockReturnValue({
    toXDR: () => 'mock-xdr-base64',
    hash: () => Buffer.from('mock-hash'),
  })

  mockAssembleTransaction.mockReturnValue({
    build: () => ({
      toXDR: () => 'mock-assembled-xdr',
      sign: mockKeypairSign,
    }),
  })

  mockNativeToScVal.mockImplementation((val: unknown) => ({ value: val }))
  mockAddressToScVal.mockReturnValue({ type: 'address' })

  mockKeypairSign.mockReset()
  mockKeypairFromSecret.mockReset()
}

// --- Factory functions for domain objects ---

export interface Group {
  id: string
  name: string
  description: string
  contributionAmount: string
  frequency: string
  maxMembers: number
  currentMembers: number
  admin: string
  createdAt: number
  isActive: boolean
}

export interface GroupMember {
  publicKey: string
  joinedAt: number
  totalContributed: string
  hasReceivedPayout: boolean
}

export interface GroupTransaction {
  id: string
  groupId: string
  publicKey: string
  amount: string
  type: 'contribution' | 'payout'
  timestamp: number
  ledger: number
}

export function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-001',
    name: 'Test Ajo Group',
    description: 'A realistic fake group for testing',
    contributionAmount: '10000000', // 1 XLM in stroops
    frequency: 'monthly',
    maxMembers: 10,
    currentMembers: 3,
    admin: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    createdAt: 1700000000,
    isActive: true,
    ...overrides,
  }
}

export function makeGroupMember(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    publicKey: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    joinedAt: 1700000100,
    totalContributed: '30000000', // 3 XLM in stroops
    hasReceivedPayout: false,
    ...overrides,
  }
}

export function makeGroupTransaction(overrides: Partial<GroupTransaction> = {}): GroupTransaction {
  return {
    id: 'tx-001',
    groupId: 'group-001',
    publicKey: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    amount: '10000000', // 1 XLM in stroops
    type: 'contribution',
    timestamp: 1700000200,
    ledger: 1001,
    ...overrides,
  }
}

// Export mocks for direct access in tests
export {
  mockSimulateTransaction,
  mockSendTransaction,
  mockGetAccount,
  mockGetTransaction,
  mockGetLatestLedger,
  mockBuild,
  mockAddOperation,
  mockSetTimeout,
  mockFromXDR,
  mockContractCall,
  mockAddressFromString,
  mockAddressToScVal,
  mockNativeToScVal,
  mockAssembleTransaction,
  mockKeypairSign,
  mockKeypairFromSecret,
}

export { SorobanRpc, BASE_FEE, Networks }
export const TransactionBuilder = MockTransactionBuilder
export const Contract = MockContract
export const Address = MockAddress
export const nativeToScVal = mockNativeToScVal
export const Keypair = MockKeypair
