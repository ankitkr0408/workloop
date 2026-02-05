import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Organization from '../models/Organization';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/users
 * List all users in current organization
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        // Get organization to find ObjectId
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const users = await User.find({
            organizationId: organization._id,
            deletedAt: null
        }).select('-passwordHash'); // Don't return password hash

        const usersFormatted = users.map(user => ({
            id: user.uuid,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            emailVerified: user.emailVerified,
            onboardingCompleted: user.onboardingCompleted,
            integrations: user.integrations.map(i => ({
                provider: i.provider,
                isActive: i.isActive,
                connectedAt: i.connectedAt,
                lastSyncedAt: i.lastSyncedAt,
            })),
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
        }));

        res.json({ users: usersFormatted });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/users/:id
 * Get single user by ID
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const user = await User.findOne({
            uuid: id,
            organizationId: organization._id,
            deletedAt: null
        }).select('-passwordHash');

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            id: user.uuid,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            emailVerified: user.emailVerified,
            onboardingCompleted: user.onboardingCompleted,
            integrations: user.integrations,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

/**
 * POST /api/users/invite
 * Invite new user to organization (requires owner/admin)
 */
router.post('/invite', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    try {
        const { email, fullName, role } = req.body;

        if (!email || !fullName) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Validate role
        if (role && !['admin', 'member'].includes(role)) {
            res.status(400).json({ error: 'Invalid role. Must be admin or member' });
            return;
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email, deletedAt: null });
        if (existingUser) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        // Create user without password (will need to set it via email link)
        const user = await User.create({
            uuid: randomUUID(),
            organizationId: organization._id,
            email,
            fullName,
            role: role || 'member',
            emailVerified: false,
            onboardingCompleted: false,
            integrations: [],
        });

        // TODO: Send invitation email with password setup link

        res.status(201).json({
            id: user.uuid,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            message: 'Invitation sent (email not implemented yet)',
        });
    } catch (error) {
        console.error('Invite user error:', error);
        res.status(500).json({ error: 'Failed to invite user' });
    }
});

/**
 * PATCH /api/users/:id
 * Update user (requires owner/admin, or self for limited fields)
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { fullName, avatarUrl, role } = req.body;

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const user = await User.findOne({
            uuid: id,
            organizationId: organization._id,
            deletedAt: null
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Check permissions
        const isSelf = req.user!.userId === id;
        const isAdminOrOwner = ['owner', 'admin'].includes(req.user!.role);

        // Only admins/owners can change role
        if (role && !isAdminOrOwner) {
            res.status(403).json({ error: 'Only admins can change roles' });
            return;
        }

        // Users can update their own profile, admins can update anyone
        if (!isSelf && !isAdminOrOwner) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        // Update fields
        if (fullName) user.fullName = fullName;
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
        if (role && isAdminOrOwner) user.role = role;

        await user.save();

        res.json({
            id: user.uuid,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            role: user.role,
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * DELETE /api/users/:id
 * Soft delete user (requires owner/admin)
 */
router.delete('/:id', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (req.user!.userId === id) {
            res.status(400).json({ error: 'Cannot delete your own account' });
            return;
        }

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const user = await User.findOne({
            uuid: id,
            organizationId: organization._id,
            deletedAt: null
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Soft delete
        user.deletedAt = new Date();
        await user.save();

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
