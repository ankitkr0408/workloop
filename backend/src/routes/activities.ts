import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import Activity from '../models/Activity';
import Project from '../models/Project';
import User from '../models/User';
import Organization from '../models/Organization';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/activities
 * Get activity timeline (with filters)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const { projectId, userId, type, limit = '50', skip = '0' } = req.query;

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        const filter: any = {
            organizationId: organization._id,
        };

        // Apply filters
        if (projectId) {
            const project = await Project.findOne({ uuid: projectId as string });
            if (project) {
                filter.projectId = project._id;
            }
        }

        if (userId) {
            const user = await User.findOne({ uuid: userId as string });
            if (user) {
                filter.userId = user._id;
            }
        }

        if (type) {
            filter.type = type;
        }

        const activities = await Activity.find(filter)
            .sort({ activityDate: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(skip as string));

        const activitiesFormatted = activities.map(activity => ({
            id: activity.uuid,
            type: activity.type,
            source: activity.source,
            title: activity.title,
            description: activity.description,
            user: {
                name: activity.userName,
                avatar: activity.userAvatar,
            },
            metadata: activity.metadata,
            activityDate: activity.activityDate,
            createdAt: activity.createdAt,
        }));

        res.json({
            activities: activitiesFormatted,
            count: activities.length,
        });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

/**
 * POST /api/activities
 * Create manual activity (for users to log work)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const { projectId, title, description, activityDate } = req.body;

        if (!projectId || !title) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        // Get organization
        const organization = await Organization.findOne({ uuid: req.user!.organizationId });
        if (!organization) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        // Get project
        const project = await Project.findOne({
            uuid: projectId,
            organizationId: organization._id,
            deletedAt: null
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Get current user
        const user = await User.findOne({ uuid: req.user!.userId });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const activity = await Activity.create({
            uuid: randomUUID(),
            organizationId: organization._id,
            projectId: project._id,
            userId: user._id,
            userName: user.fullName,
            userAvatar: user.avatarUrl,
            type: 'manual',
            source: 'manual',
            title,
            description,
            metadata: {},
            activityDate: activityDate ? new Date(activityDate) : new Date(),
        });

        res.status(201).json({
            id: activity.uuid,
            type: activity.type,
            title: activity.title,
            description: activity.description,
            activityDate: activity.activityDate,
            createdAt: activity.createdAt,
        });
    } catch (error) {
        console.error('Create activity error:', error);
        res.status(500).json({ error: 'Failed to create activity' });
    }
});

export default router;
