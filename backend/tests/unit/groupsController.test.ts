import { GroupsController } from '../../src/controllers/groupsController';
import { createMockRequest, createMockResponse, mockNext } from '../fixtures/mockExpress';
import { GroupFactory } from '../factories';

// Create mock service
const mockSorobanService = {
  getAllGroups: jest.fn(),
  getGroup: jest.fn(),
  createGroup: jest.fn(),
  joinGroup: jest.fn(),
  contribute: jest.fn(),
  getGroupMembers: jest.fn(),
  getGroupTransactions: jest.fn(),
};

describe('GroupsController', () => {
  let controller: GroupsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new GroupsController(mockSorobanService as any);
    
    // Default mock implementations
    mockSorobanService.getAllGroups.mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
    mockSorobanService.getGroup.mockResolvedValue(null);
    mockSorobanService.createGroup.mockResolvedValue({ groupId: 'test-group-id' });
    mockSorobanService.joinGroup.mockResolvedValue({ success: true });
    mockSorobanService.contribute.mockResolvedValue({ success: true, transactionId: 'tx-123' });
    mockSorobanService.getGroupMembers.mockResolvedValue([]);
    mockSorobanService.getGroupTransactions.mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  });

  describe('listGroups', () => {
    it('should return paginated groups with default pagination', async () => {
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();

      await controller.listGroups(req, res, mockNext);

      expect(mockSorobanService.getAllGroups).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body).not.toBeNull();
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should handle custom pagination parameters', async () => {
      const req = createMockRequest({ query: { page: '2', limit: '5' } });
      const res = createMockResponse();

      mockSorobanService.getAllGroups.mockResolvedValueOnce({
        data: [],
        pagination: {
          page: 2,
          limit: 5,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: true,
        },
      });

      await controller.listGroups(req, res, mockNext);

      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(5);
    });

    it('should handle invalid pagination parameters gracefully', async () => {
      const req = createMockRequest({ query: { page: 'invalid', limit: 'invalid' } });
      const res = createMockResponse();

      await controller.listGroups(req, res, mockNext);

      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
    });

    it('should enforce max limit', async () => {
      const req = createMockRequest({ query: { limit: '1000' } });
      const res = createMockResponse();

      await controller.listGroups(req, res, mockNext);

      expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('should call next on error', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Database error');

      mockSorobanService.getAllGroups.mockRejectedValueOnce(error);

      await controller.listGroups(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getGroup', () => {
    it('should return group by ID', async () => {
      const req = createMockRequest({ params: { id: 'group-1' } });
      const res = createMockResponse();

      await controller.getGroup(req, res, mockNext);

      expect(res.body).toHaveProperty('success');
    });

    it('should return 404 for non-existent group', async () => {
      const req = createMockRequest({ params: { id: 'non-existent' } });
      const res = createMockResponse();

      await controller.getGroup(req, res, mockNext);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Group not found');
    });

    it('should call next on error', async () => {
      const req = createMockRequest({ params: { id: 'group-1' } });
      const res = createMockResponse();

      await controller.getGroup(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(0);
    });
  });

  describe('createGroup', () => {
    it('should return the unsigned XDR for phase 1 (no signedXdr in the request)', async () => {
      const groupData = GroupFactory.create();
      mockSorobanService.createGroup.mockResolvedValue({ unsignedXdr: 'AAAA...XDR' });
      const req = createMockRequest({ body: groupData });
      const res = createMockResponse();

      await controller.createGroup(req, res, mockNext);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('unsignedXdr');
    });

    it('should handle missing required fields', async () => {
      mockSorobanService.createGroup.mockResolvedValue({ unsignedXdr: 'AAAA...XDR' });
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await controller.createGroup(req, res, mockNext);

      expect(res.statusCode).toBe(200);
    });

    it('should call next on error', async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await controller.createGroup(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(0);
    });
  });

  describe('joinGroup', () => {
    it('should allow user to join group', async () => {
      const req = createMockRequest({
        params: { id: 'group-1' },
        body: { publicKey: 'GABC123...' },
      });
      const res = createMockResponse();

      await controller.joinGroup(req, res, mockNext);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should require publicKey', async () => {
      const req = createMockRequest({
        params: { id: 'group-1' },
        body: {},
      });
      const res = createMockResponse();

      await controller.joinGroup(req, res, mockNext);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('contribute', () => {
    it('should process contribution', async () => {
      const req = createMockRequest({
        params: { id: 'group-1' },
        body: { amount: '100', publicKey: 'GABC123...' },
      });
      const res = createMockResponse();

      await controller.contribute(req, res, mockNext);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should require amount and publicKey', async () => {
      const req = createMockRequest({
        params: { id: 'group-1' },
        body: {},
      });
      const res = createMockResponse();

      await controller.contribute(req, res, mockNext);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('getMembers', () => {
    it('should return group members', async () => {
      const req = createMockRequest({ params: { id: 'group-1' } });
      const res = createMockResponse();

      await controller.getMembers(req, res, mockNext);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const req = createMockRequest({
        params: { id: 'group-1' },
        query: { page: '1', limit: '10' },
      });
      const res = createMockResponse();

      await controller.getTransactions(req, res, mockNext);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const req = createMockRequest({
        params: { id: 'group-1' },
        query: { page: '2', limit: '5' },
      });
      const res = createMockResponse();

      mockSorobanService.getGroupTransactions.mockResolvedValueOnce({
        data: [],
        pagination: {
          page: 2,
          limit: 5,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: true,
        },
      });

      await controller.getTransactions(req, res, mockNext);

      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(5);
    });
  });
});
