import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminTokenPayload {
  adminId: string;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminTokenPayload;
    }
  }
}

function getAdminSecret(): string {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret) {
    throw new Error('ADMIN_TOKEN_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Validates "AdminToken <jwt>" in the Authorization header.
 * Used for the internal admin dashboard routes only — separate from Supabase auth.
 */
export const adminTokenAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('AdminToken ')) {
    res.status(401).json({ error: 'Missing or invalid admin authorization header' });
    return;
  }

  const token = authHeader.substring('AdminToken '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'No admin token provided' });
    return;
  }

  try {
    const secret = getAdminSecret();
    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    req.adminUser = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired admin token' });
  }
};

/**
 * Issues a signed admin JWT. Called from POST /api/admin/login.
 */
export function signAdminToken(adminId: string, displayName: string): string {
  const secret = getAdminSecret();
  return jwt.sign({ adminId, displayName }, secret, { expiresIn: '8h' });
}
