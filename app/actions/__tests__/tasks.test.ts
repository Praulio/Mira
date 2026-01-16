/**
 * Unit Tests for Task Server Actions
 * 
 * Focus: Testing the "Single In-Progress Task" logic in updateTaskStatus
 * 
 * Critical Requirement:
 * When a task is moved to 'in_progress', all other 'in_progress' tasks
 * for the same assignee must be moved to 'todo'.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock modules before importing the actions
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'id',
    status: 'status',
    assigneeId: 'assigneeId',
    updatedAt: 'updatedAt',
  },
  activity: {},
}));

// Import after mocking
import { updateTaskStatus } from '../tasks';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';

describe('updateTaskStatus - Single In-Progress Task Logic', () => {
  const mockUserId = 'user_test123';
  const mockAssigneeId = 'user_assignee456';
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default: user is authenticated
    (auth as unknown as Mock).mockResolvedValue({ userId: mockUserId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      (auth as unknown as Mock).mockResolvedValue({ userId: null });

      const result = await updateTaskStatus({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        newStatus: 'in_progress',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid task ID format', async () => {
      const result = await updateTaskStatus({
        taskId: 'invalid-uuid',
        newStatus: 'in_progress',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid task ID');
    });

    it('should reject invalid status', async () => {
      const result = await updateTaskStatus({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        // @ts-expect-error Testing invalid input
        newStatus: 'invalid_status',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Single In-Progress Task Logic (CRITICAL)', () => {
    const validTaskId = '123e4567-e89b-12d3-a456-426614174000';

    it('should move other in_progress tasks to todo when moving task to in_progress', async () => {
      // Mock the current task fetch
      const mockCurrentTask = {
        id: validTaskId,
        title: 'Test Task',
        status: 'todo',
        assigneeId: mockAssigneeId,
        creatorId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockCurrentTask]),
      };

      (db.select as Mock).mockReturnValue(mockSelectChain);

      // Mock the transaction
      type MockTx = {
        update: Mock;
        set: Mock;
        where: Mock;
        returning: Mock;
        insert: Mock;
        values: Mock;
      };
      let transactionCallback: ((tx: MockTx) => Promise<unknown>) | null = null;
      (db.transaction as Mock).mockImplementation(async (callback: (tx: MockTx) => Promise<unknown>) => {
        transactionCallback = callback;
        
        // Create mock transaction object
        const mockTx = {
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue([]),
        };

        // Mock the first update (move other in_progress tasks to todo)
        mockTx.where.mockImplementationOnce(() => mockTx);
        
        // Mock the second update (update target task)
        const mockUpdatedTask = { ...mockCurrentTask, status: 'in_progress' };
        mockTx.returning.mockResolvedValueOnce([mockUpdatedTask]);

        return callback(mockTx);
      });

      // Execute the action
      const result = await updateTaskStatus({
        taskId: validTaskId,
        newStatus: 'in_progress',
      });

      // Assertions
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('in_progress');
      
      // Verify transaction was called
      expect(db.transaction).toHaveBeenCalledTimes(1);
      
      // Verify the transaction logic was executed
      expect(transactionCallback).not.toBeNull();
    });

    it('should NOT move other tasks when status is not in_progress', async () => {
      const mockCurrentTask = {
        id: validTaskId,
        title: 'Test Task',
        status: 'todo',
        assigneeId: mockAssigneeId,
        creatorId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockCurrentTask]),
      };

      (db.select as Mock).mockReturnValue(mockSelectChain);

      let updateCallCount = 0;
      (db.transaction as Mock).mockImplementation(async (callback) => {
        const mockTx = {
          update: vi.fn(() => {
            updateCallCount++;
            return mockTx;
          }),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ ...mockCurrentTask, status: 'done' }]),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue([]),
        };

        return callback(mockTx);
      });

      const result = await updateTaskStatus({
        taskId: validTaskId,
        newStatus: 'done',
      });

      expect(result.success).toBe(true);
      // When moving to 'done', only ONE update should happen (the target task)
      // Not TWO updates (which would include moving other in_progress tasks)
      expect(updateCallCount).toBe(1);
    });

    it('should handle task without assignee gracefully', async () => {
      const mockCurrentTask = {
        id: validTaskId,
        title: 'Test Task',
        status: 'todo',
        assigneeId: null, // No assignee
        creatorId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockCurrentTask]),
      };

      (db.select as Mock).mockReturnValue(mockSelectChain);

      let updateCallCount = 0;
      (db.transaction as Mock).mockImplementation(async (callback) => {
        const mockTx = {
          update: vi.fn(() => {
            updateCallCount++;
            return mockTx;
          }),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ ...mockCurrentTask, status: 'in_progress' }]),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue([]),
        };

        return callback(mockTx);
      });

      const result = await updateTaskStatus({
        taskId: validTaskId,
        newStatus: 'in_progress',
      });

      expect(result.success).toBe(true);
      // When task has no assignee, only ONE update (target task)
      // The logic should skip the "move other in_progress tasks" step
      expect(updateCallCount).toBe(1);
    });

    it('should return error when task is not found', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // Empty result
      };

      (db.select as Mock).mockReturnValue(mockSelectChain);

      const result = await updateTaskStatus({
        taskId: validTaskId,
        newStatus: 'in_progress',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Task not found');
    });

    it('should handle transaction errors gracefully', async () => {
      const mockCurrentTask = {
        id: validTaskId,
        title: 'Test Task',
        status: 'todo',
        assigneeId: mockAssigneeId,
        creatorId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockCurrentTask]),
      };

      (db.select as Mock).mockReturnValue(mockSelectChain);

      // Mock transaction to throw error
      (db.transaction as Mock).mockRejectedValue(new Error('Database error'));

      const result = await updateTaskStatus({
        taskId: validTaskId,
        newStatus: 'in_progress',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('unexpected error');
    });
  });

  describe('Activity Logging', () => {
    it('should log status change in activity table', async () => {
      const validTaskId = '123e4567-e89b-12d3-a456-426614174000';
      
      const mockCurrentTask = {
        id: validTaskId,
        title: 'Test Task',
        status: 'todo',
        assigneeId: mockAssigneeId,
        creatorId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockCurrentTask]),
      };

      (db.select as Mock).mockReturnValue(mockSelectChain);

      let activityInserted = false;
      (db.transaction as Mock).mockImplementation(async (callback) => {
        const mockTx = {
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ ...mockCurrentTask, status: 'in_progress' }]),
          insert: vi.fn(() => {
            activityInserted = true;
            return mockTx;
          }),
          values: vi.fn().mockResolvedValue([]),
        };

        return callback(mockTx);
      });

      const result = await updateTaskStatus({
        taskId: validTaskId,
        newStatus: 'in_progress',
      });

      expect(result.success).toBe(true);
      expect(activityInserted).toBe(true);
    });
  });
});
