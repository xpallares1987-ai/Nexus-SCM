import jwt from "jsonwebtoken";
import { db } from "../db/index.ts";
import { users, rolePermissions } from "../db/schema.ts";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-do-not-use-in-prod';

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as any;
};

export const getUserWithPermissions = async (uid: string) => {
  const userRecord = await db.select().from(users).where(eq(users.id, uid));
  if (userRecord.length === 0) {
    return null;
  }
  const uRec = userRecord[0];
  
  let permissions: string[] = [];
  if (uRec.role === 'Admin') {
    permissions = ['read:shipments', 'write:shipments', 'read:inventory', 'write:inventory', 'manage:users', 'view:finance'];
  } else {
    try {
      const dbPerm = await db.select().from(rolePermissions).where(eq(rolePermissions.role, uRec.role));
      if (dbPerm.length > 0) {
        permissions = JSON.parse(dbPerm[0].permissions);
      } else {
        if (uRec.role === 'Operator') {
          permissions = ['read:shipments', 'write:shipments', 'read:inventory', 'write:inventory'];
        } else if (uRec.role === 'Viewer') {
          permissions = ['read:shipments', 'read:inventory'];
        }
      }
    } catch (e) {
      console.error("Error reading permissions:", e);
    }
  }

  return {
    uid: uRec.id,
    email: uRec.email,
    role: uRec.role,
    permissions
  };
};

export const checkPermission = (user: { role: string, permissions: string[] }, requiredPermission: string) => {
  return user.role === 'Admin' || user.permissions.includes(requiredPermission);
};
