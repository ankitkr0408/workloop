import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import Project from '../models/Project';
import User from '../models/User';
import Organization from '../models/Organization';
import Activity from '../models/Activity';
import CheckIn from '../models/CheckIn';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/projects
 * Create new project (auto-generates client link)
 */
router.post('/', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    try {
        const { name, description, clientName, clientEmail } = req.body;

        if (!name || !clientName) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        // Auto-generate first client link
        const clientLink = {
            uuid: randomUUID(),
            label: 'Client Dashboard',
            isActive: true,
            accessCount: 0,
            createdAt: new Date(),
        };

        const project = await Project.create({
            uuid: randomUUID(),
            organizationId: organization._id,
            name,
            description,
            clientName,
            clientEmail,
            status: 'active',
            members: [],
            clientLinks: [clientLink],
        });

        res.status(201).json({
            id: project.uuid,
            name: project.name,
            description: project.description,
            clientName: project.clientName,
            clientEmail: project.clientEmail,
            status: project.status,
            clientLink: {
                uuid: clientLink.uuid,
                url: `${process.env.FRONTEND_URL}/c/${clientLink.uuid}`,
                label: clientLink.label,
            },
            members: [],
            createdAt: project.createdAt,
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

/**
 * GET /api/projects
 * List all projects in organization
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const { status } = req.query;

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const filter: any = {
            organizationId: organization._id,
            deletedAt: null
        };

        if (status) {
            filter.status = status;
        }

        const projects = await Project.find(filter).sort({ createdAt: -1 });

        // TODO: Aggregate stats (total hours, commits, etc.) from activities
        const projectsFormatted = projects.map(project => ({
            id: project.uuid,
            name: project.name,
            description: project.description,
            clientName: project.clientName,
            status: project.status,
            memberCount: project.members.length,
            activeClientLink: project.clientLinks.find(l => l.isActive),
            createdAt: project.createdAt,
        }));

        res.json({ projects: projectsFormatted });
    } catch (error) {
        console.error('List projects error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

/**
 * GET /api/projects/:id
 * Get single project with members and client links
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

        const project = await Project.findOne({
            uuid: id,
            organizationId: organization._id,
            deletedAt: null
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        res.json({
            id: project.uuid,
            name: project.name,
            description: project.description,
            clientName: project.clientName,
            clientEmail: project.clientEmail,
            status: project.status,
            members: project.members,
            clientLinks: project.clientLinks.map(link => ({
                uuid: link.uuid,
                label: link.label,
                url: `${process.env.FRONTEND_URL}/c/${link.uuid}`,
                isActive: link.isActive,
                accessCount: link.accessCount,
                expiresAt: link.expiresAt,
                createdAt: link.createdAt,
            })),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

/**
 * POST /api/projects/:id/members
 * Add member to project
 */
router.post('/:id/members', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId, role } = req.body;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const project = await Project.findOne({
            uuid: id,
            organizationId: organization._id,
            deletedAt: null
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Get user
        const user = await User.findOne({
            uuid: userId,
            organizationId: organization._id,
            deletedAt: null
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Check if already a member
        const existingMember = project.members.find(m => m.userId.toString() === user._id.toString());
        if (existingMember) {
            res.status(409).json({ error: 'User already a member of this project' });
            return;
        }

        // Add member (denormalized data for performance)
        project.members.push({
            userId: user._id,
            userName: user.fullName,
            userAvatar: user.avatarUrl,
            role: role || 'member',
            addedAt: new Date(),
        });

        await project.save();

        res.status(201).json({
            message: 'Member added successfully',
            member: {
                userId: user.uuid,
                userName: user.fullName,
                userAvatar: user.avatarUrl,
                role: role || 'member',
            },
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

/**
 * DELETE /api/projects/:id/members/:userId
 * Remove member from project
 */
router.delete('/:id/members/:userId', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    try {
        const { id, userId } = req.params;

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const project = await Project.findOne({
            uuid: id,
            organizationId: organization._id,
            deletedAt: null
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Get user to find ObjectId
        const user = await User.findOne({ uuid: userId });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Remove member
        project.members = project.members.filter(m => m.userId.toString() !== user._id.toString());
        await project.save();

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

/**
 * POST /api/projects/:id/client-links
 * Generate new client link
 */
router.post('/:id/client-links', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { label, expiresAt } = req.body;

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const project = await Project.findOne({
            uuid: id,
            organizationId: organization._id,
            deletedAt: null
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const newLink = {
            uuid: randomUUID(),
            label: label || 'Client Dashboard',
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            isActive: true,
            accessCount: 0,
            createdAt: new Date(),
        };

        project.clientLinks.push(newLink);
        await project.save();

        res.status(201).json({
            uuid: newLink.uuid,
            label: newLink.label,
            url: `${process.env.FRONTEND_URL}/c/${newLink.uuid}`,
            isActive: newLink.isActive,
            expiresAt: newLink.expiresAt,
            createdAt: newLink.createdAt,
        });
    } catch (error) {
        console.error('Create client link error:', error);
        res.status(500).json({ error: 'Failed to create client link' });
    }
});

/**
 * DELETE /api/projects/:id/client-links/:linkUuid
 * Revoke client link
 */
router.delete('/:id/client-links/:linkUuid', requireAuth, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    try {
        const { id, linkUuid } = req.params;

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const project = await Project.findOne({
            uuid: id,
            organizationId: organization._id,
            deletedAt: null
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const link = project.clientLinks.find(l => l.uuid === linkUuid);
        if (!link) {
            res.status(404).json({ error: 'Client link not found' });
            return;
        }

        link.isActive = false;
        await project.save();

        res.json({ message: 'Client link revoked successfully' });
    } catch (error) {
        console.error('Revoke client link error:', error);
        res.status(500).json({ error: 'Failed to revoke client link' });
    }
});

export default router;
