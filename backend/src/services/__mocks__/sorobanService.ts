export const mockGetAllGroups = jest.fn();
export const mockGetGroup = jest.fn();
export const mockCreateGroup = jest.fn();
export const mockJoinGroup = jest.fn();
export const mockContribute = jest.fn();
export const mockGetGroupMembers = jest.fn();
export const mockGetGroupTransactions = jest.fn();
export const mockExecutePayout = jest.fn();

export class SorobanServiceError extends Error {
  constructor(message: string, public readonly code: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'SorobanServiceError'
  }
}

export class SorobanService {
  getAllGroups = mockGetAllGroups;
  getGroup = mockGetGroup;
  createGroup = mockCreateGroup;
  joinGroup = mockJoinGroup;
  contribute = mockContribute;
  getGroupMembers = mockGetGroupMembers;
  getGroupTransactions = mockGetGroupTransactions;
  executePayout = mockExecutePayout;
}

export const sorobanService = new SorobanService();
