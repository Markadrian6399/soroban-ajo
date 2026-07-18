import { Router, Request, Response } from 'express'
import { multiSigService } from '@/services/multisig/MultiSigService'
import {
  multiSigConfigSchema,
  createProposalSchema,
  signProposalSchema,
} from '@/types/multisig'
import { ZodError } from 'zod'

const router = Router()

// Validation middleware
const validateRequest = (schema: any) => (req: Request, res: Response, next: Function) => {
  try {
    const validated = schema.parse(req.body)
    ;(req as any).validated = validated
    next()
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }
    return res.status(400).json({ error: 'Validation failed' })
  }
}

/**
 * POST /multisig/config
 * Create a multi-sig configuration for a group
 */
router.post('/config', validateRequest(multiSigConfigSchema), async (req: Request, res: Response) => {
  try {
    const config = await multiSigService.createMultiSigConfig(req.body)
    res.status(201).json(config)
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create multi-sig config',
    })
  }
})

/**
 * GET /multisig/config/:groupId
 * Fetch multi-sig configuration for a group
 */
router.get('/config/:groupId', async (req: Request, res: Response) => {
  try {
    const config = await multiSigService.getMultiSigConfig(req.params.groupId)
    if (!config) {
      return res.status(404).json({ error: 'Multi-sig configuration not found' })
    }
    res.json(config)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch multi-sig config',
    })
  }
})

/**
 * POST /multisig/proposals
 * Create a new proposal
 */
router.post('/proposals', validateRequest(createProposalSchema), async (req: Request, res: Response) => {
  try {
    // Extract proposer from request context (typically from JWT)
    const proposerId = (req as any).user?.walletAddress || (req.body.proposerId as string)

    if (!proposerId) {
      return res.status(400).json({
        error: 'Proposer wallet address not found. Authenticate first or provide proposerId in request.',
      })
    }

    const proposal = await multiSigService.createProposal(
      req.body.groupId,
      proposerId,
      req.body.operationType,
      req.body.transactionXdr,
      req.body.metadata,
      req.body.expiresIn
    )
    res.status(201).json(proposal)
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create proposal',
    })
  }
})

/**
 * GET /multisig/proposals/:proposalId
 * Fetch a specific proposal
 */
router.get('/proposals/:proposalId', async (req: Request, res: Response) => {
  try {
    const proposal = await multiSigService.getProposal(req.params.proposalId)
    res.json(proposal)
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch proposal',
    })
  }
})

/**
 * POST /multisig/proposals/:proposalId/sign
 * Sign a proposal with your wallet
 */
router.post('/proposals/:proposalId/sign', validateRequest(signProposalSchema), async (req: Request, res: Response) => {
  try {
    // Get signer from request context or body
    const signerWalletAddress = (req as any).user?.walletAddress || req.body.signerWalletAddress

    if (!signerWalletAddress) {
      return res.status(400).json({
        error: 'Signer wallet address not found. Authenticate first.',
      })
    }

    const result = await multiSigService.signProposal(
      req.params.proposalId,
      signerWalletAddress,
      req.body.signature
    )
    res.json(result)
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to sign proposal',
    })
  }
})

/**
 * POST /multisig/proposals/:proposalId/execute
 * Execute a proposal (after threshold is reached)
 */
router.post('/proposals/:proposalId/execute', async (req: Request, res: Response) => {
  try {
    const result = await multiSigService.executeProposal(req.params.proposalId)
    res.json(result)
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to execute proposal',
    })
  }
})

/**
 * GET /multisig/groups/:groupId/proposals
 * List all proposals for a group with optional status filter
 */
router.get('/groups/:groupId/proposals', async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || undefined
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0

    const proposals = await multiSigService.getGroupProposals(
      req.params.groupId,
      status as any,
      limit,
      offset
    )
    res.json({
      data: proposals,
      limit,
      offset,
      count: proposals.length,
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch proposals',
    })
  }
})

export default router
