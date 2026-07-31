import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyToken, checkPermission, getUserWithPermissions } from '../lib/auth.ts';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
    sign: vi.fn(),
  }
}));

// Mock DB queries for getUserWithPermissions
vi.mock('../db/index.ts', () => {
  return {
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn()
    }
  };
});

import { db } from '../db/index.ts';
import { users, rolePermissions } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

describe('Auth Module', () => {
  const mockJwtVerify = jwt.verify as unknown as ReturnType<typeof vi.fn>;
  const mockDbWhere = (db as any).where as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should verify token correctly and return decoded payload', () => {
      const mockPayload = { uid: 'user-123' };
      mockJwtVerify.mockReturnValueOnce(mockPayload);
      
      const result = verifyToken('valid-token');
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(result).toEqual(mockPayload);
    });

    it('should throw an error if token is invalid', () => {
      mockJwtVerify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('getUserWithPermissions', () => {
    it('should return null if user not found', async () => {
      mockDbWhere.mockResolvedValueOnce([]); // No user found
      const user = await getUserWithPermissions('unknown-uid');
      expect(user).toBeNull();
    });

    it('should return Admin user with all default admin permissions', async () => {
      mockDbWhere.mockResolvedValueOnce([
        { id: 'admin-1', email: 'admin@test.com', role: 'Admin' }
      ]);
      
      const user = await getUserWithPermissions('admin-1');
      expect(user).toEqual({
        uid: 'admin-1',
        email: 'admin@test.com',
        role: 'Admin',
        permissions: ['read:shipments', 'write:shipments', 'read:inventory', 'write:inventory', 'manage:users', 'view:finance']
      });
    });

    it('should return Operator user with fallback operator permissions if not in DB', async () => {
      // First call: users query
      mockDbWhere.mockResolvedValueOnce([
        { id: 'op-1', email: 'operator@test.com', role: 'Operator' }
      ]);
      // Second call: rolePermissions query -> not found
      mockDbWhere.mockResolvedValueOnce([]);

      const user = await getUserWithPermissions('op-1');
      expect(user).toEqual({
        uid: 'op-1',
        email: 'operator@test.com',
        role: 'Operator',
        permissions: ['read:shipments', 'write:shipments', 'read:inventory', 'write:inventory']
      });
    });

    it('should return Viewer user with fallback viewer permissions if not in DB', async () => {
      // First call: users query
      mockDbWhere.mockResolvedValueOnce([
        { id: 'viewer-1', email: 'viewer@test.com', role: 'Viewer' }
      ]);
      // Second call: rolePermissions query -> not found
      mockDbWhere.mockResolvedValueOnce([]);

      const user = await getUserWithPermissions('viewer-1');
      expect(user).toEqual({
        uid: 'viewer-1',
        email: 'viewer@test.com',
        role: 'Viewer',
        permissions: ['read:shipments', 'read:inventory']
      });
    });

    it('should return custom permissions if role is in rolePermissions table', async () => {
      mockDbWhere.mockResolvedValueOnce([
        { id: 'custom-1', email: 'custom@test.com', role: 'CustomRole' }
      ]);
      mockDbWhere.mockResolvedValueOnce([
        { role: 'CustomRole', permissions: JSON.stringify(['read:custom']) }
      ]);

      const user = await getUserWithPermissions('custom-1');
      expect(user).toEqual({
        uid: 'custom-1',
        email: 'custom@test.com',
        role: 'CustomRole',
        permissions: ['read:custom']
      });
    });
  });

  describe('checkPermission', () => {
    it('should always return true for Admin', () => {
      const user = { role: 'Admin', permissions: [] };
      expect(checkPermission(user, 'read:shipments')).toBe(true);
      expect(checkPermission(user, 'some:unseen:perm')).toBe(true);
    });

    it('should return true if user has specific permission', () => {
      const user = { role: 'Operator', permissions: ['write:shipments'] };
      expect(checkPermission(user, 'write:shipments')).toBe(true);
    });

    it('should return false if user lacks specific permission', () => {
      const user = { role: 'Viewer', permissions: ['read:shipments'] };
      expect(checkPermission(user, 'write:shipments')).toBe(false);
    });
  });
});
