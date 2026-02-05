import express, { Request, Response } from 'express';
import Organization from '../models/Organization';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/organizations/me
 * Get current user's organization
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
    try {
        const organization = await Organization.findOne({
            uuid: req.user!.organizationId,
            deletedAt: null
        });

        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        res.json({
            id: organization.uuid,
            name: organization.name,
            slug: organization.slug,
            teamSize: organization.teamSize,
            plan: organization.plan,
            billingEmail: organization.billingEmail,
            createdAt: organization.createdAt,
        });
    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

/**
 * PATCH /api/organizations/me
 * Update current user's organization (requires owner/admin)
 */
router.patch('/me', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    try {
        const { name, billingEmail, teamSize } = req.body;

        const organization = await Organization.findOne({
            uuid: req.user!.organizationId,
            deletedAt: null
        });

        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        // Update fields
        if (name) organization.name = name;
        if (billingEmail !== undefined) organization.billingEmail = billingEmail;
        if (teamSize) organization.teamSize = teamSize;

        await organization.save();

        res.json({
            id: organization.uuid,
            name: organization.name,
            slug: organization.slug,
            teamSize: organization.teamSize,
            plan: organization.plan,
            billingEmail: organization.billingEmail,
        });
    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({ error: 'Failed to update organization' });
    }
});

export default router;
