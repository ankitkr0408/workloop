import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

/**
 * Middleware: Require authentication (JWT)
 * Extracts token from Authorization header and verifies it
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const payload = verifyToken(token);

        // Attach user to request
        req.user = payload;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Middleware: Require specific role (RBAC)
 * Must be used AFTER requireAuth
 */
export const requireRole = (...allowedRoles: Array<'owner' | 'admin' | 'member'>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: req.user.role,
            });
            return;
        }

        next();
    };
};

/**
 * Middleware: Require organization ownership (multi-tenancy)
 * Ensures user can only access their organization's data
 */
export const requireOrganization = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    // organizationId will be used in database queries to filter data
    // This is enforced in every query that touches organization data
    next();
};

/**
 * Optional auth middleware (doesn't fail if no token)
 * Useful for public routes that may benefit from auth context
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = verifyToken(token);
            req.user = payload;
        }
    } catch (error) {
        // Silent fail - continue without auth
    }

    next();
};
