import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import User from '../models/User';
import Organization from '../models/Organization';
import { generateTokenPair, verifyToken } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register new organization (owner account)
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, fullName, organizationName, organizationSlug, teamSize } = req.body;

        // Validation
        if (!email || !password || !fullName || !organizationName || !organizationSlug) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email, deletedAt: null });
        if (existingUser) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        // Check if slug is taken
        const existingOrg = await Organization.findOne({ slug: organizationSlug, deletedAt: null });
        if (existingOrg) {
            res.status(409).json({
                error: 'Organization slug already taken',
                suggestion: `${organizationSlug}-${Math.floor(Math.random() * 1000)}`,
            });
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create organization
        const organization = await Organization.create({
            uuid: randomUUID(),
            name: organizationName,
            slug: organizationSlug,
            teamSize: teamSize || '1-5',
            plan: 'free',
        });

        // Create owner user
        const user = await User.create({
            uuid: randomUUID(),
            organizationId: organization._id,
            email,
            passwordHash,
            fullName,
            emailVerified: false,
            role: 'owner',
            onboardingCompleted: false,
            integrations: [],
        });

        // Generate tokens
        const tokens = generateTokenPair({
            userId: user.uuid,
            organizationId: organization.uuid,
            email: user.email,
            role: user.role,
        });

        res.status(201).json({
            user: {
                id: user.uuid,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
            },
            organization: {
                id: organization.uuid,
                name: organization.name,
                slug: organization.slug,
            },
            ...tokens,
        });
    } catch (error: any) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Missing email or password' });
            return;
        }

        // Find user
        const user = await User.findOne({ email, deletedAt: null });
        if (!user || !user.passwordHash) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Get organization
        const organization = await Organization.findById(user.organizationId);
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        // Generate tokens
        const tokens = generateTokenPair({
            userId: user.uuid,
            organizationId: organization.uuid,
            email: user.email,
            role: user.role,
        });

        res.json({
            user: {
                id: user.uuid,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                avatarUrl: user.avatarUrl,
                onboardingCompleted: user.onboardingCompleted,
            },
            organization: {
                id: organization.uuid,
                name: organization.name,
                slug: organization.slug,
                plan: organization.plan,
            },
            ...tokens,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({ error: 'Refresh token required' });
            return;
        }

        // Verify refresh token
        const payload = verifyToken(refreshToken);

        // Generate new access token (refresh token stays the same)
        const tokens = generateTokenPair({
            userId: payload.userId,
            organizationId: payload.organizationId,
            email: payload.email,
            role: payload.role,
        });

        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken, // Optionally rotate refresh token
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

/**
 * POST /api/auth/logout
 * Logout (client should delete tokens)
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
    // In a production app, you'd blacklist the token here
    // For now, client-side deletion is sufficient
    res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = await User.findOne({ uuid: req.user!.userId, deletedAt: null });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const organization = await Organization.findById(user.organizationId);

        res.json({
            user: {
                id: user.uuid,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                onboardingCompleted: user.onboardingCompleted,
                emailVerified: user.emailVerified,
            },
            organization: organization ? {
                id: organization.uuid,
                name: organization.name,
                slug: organization.slug,
                plan: organization.plan,
            } : null,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

export default router;
