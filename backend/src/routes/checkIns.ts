import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import CheckIn from '../models/CheckIn';
import Project from '../models/Project';
import User from '../models/User';
import Organization from '../models/Organization';
import Activity from '../models/Activity'; // Sync check-ins to activity log
import { requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/check-ins
 * Submit daily check-in (60-second standup)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const { projectId, workedOn, planningToDo, blockers, hoursWorked } = req.body;

        if (!projectId || !workedOn || !planningToDo) {
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

        // Check if already submitted today (unique constraint will handle this, but provide better error)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingCheckIn = await CheckIn.findOne({
            userId: user._id,
            projectId: project._id,
            checkInDate: today,
        });

        if (existingCheckIn) {
            res.status(409).json({ error: 'Check-in already submitted for today' });
            return;
        }

        const checkIn = await CheckIn.create({
            uuid: randomUUID(),
            organizationId: organization._id,
            projectId: project._id,
            userId: user._id,
            userName: user.fullName,
            userAvatar: user.avatarUrl,
            workedOn,
            planningToDo,
            blockers,
            hoursWorked,
            submittedAt: new Date(),
            checkInDate: today,
        });

        // Sync to Activity Log
        // This ensures it shows up in timlines and PDF reports
        await Activity.create({
            uuid: randomUUID(),
            organizationId: organization._id,
            projectId: project._id,
            userId: user._id,
            userName: user.fullName,
            userAvatar: user.avatarUrl,
            type: 'check_in',
            source: 'manual',
            title: `Daily Check-in`,
            description: workedOn, // Use 'workedOn' as the primary description
            metadata: {
                checkInId: checkIn._id,
                hours: hoursWorked
            },
            activityDate: new Date()
        });

        // Update user stats (optional, but good for performance)
        // await Project.updateOne({ _id: project._id }, { $inc: { 'stats.totalHours': hoursWorked } });

        res.status(201).json({
            id: checkIn.uuid,
            workedOn: checkIn.workedOn,
            planningToDo: checkIn.planningToDo,
            blockers: checkIn.blockers,
            hoursWorked: checkIn.hoursWorked,
            submittedAt: checkIn.submittedAt,
            checkInDate: checkIn.checkInDate,
        });
    } catch (error: any) {
        // Handle unique constraint violation
        if (error.code === 11000) {
            res.status(409).json({ error: 'Check-in already submitted for today' });
            return;
        }

        console.error('Create check-in error:', error);
        res.status(500).json({ error: 'Failed to create check-in' });
    }
});

/**
 * GET /api/check-ins
 * Get check-ins (with filters)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const { projectId, userId, limit = '30', skip = '0' } = req.query;

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

        const checkIns = await CheckIn.find(filter)
            .sort({ checkInDate: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(skip as string));

        const checkInsFormatted = checkIns.map(checkIn => ({
            id: checkIn.uuid,
            user: {
                name: checkIn.userName,
                avatar: checkIn.userAvatar,
            },
            workedOn: checkIn.workedOn,
            planningToDo: checkIn.planningToDo,
            blockers: checkIn.blockers,
            hoursWorked: checkIn.hoursWorked,
            submittedAt: checkIn.submittedAt,
            checkInDate: checkIn.checkInDate,
        }));

        res.json({
            checkIns: checkInsFormatted,
            count: checkIns.length,
        });
    } catch (error) {
        console.error('Get check-ins error:', error);
        res.status(500).json({ error: 'Failed to fetch check-ins' });
    }
});

/**
 * GET /api/check-ins/today
 * Check if current user has submitted check-in today
 */
router.get('/today', requireAuth, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;

        if (!projectId) {
            res.status(400).json({ error: 'Missing projectId' });
            return;
        }

        // Get current user
        const user = await User.findOne({ uuid: req.user!.userId });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Get project
        const project = await Project.findOne({ uuid: projectId as string });
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkIn = await CheckIn.findOne({
            userId: user._id,
            projectId: project._id,
            checkInDate: today,
        });

        res.json({
            submitted: !!checkIn,
            checkIn: checkIn ? {
                id: checkIn.uuid,
                workedOn: checkIn.workedOn,
                planningToDo: checkIn.planningToDo,
                blockers: checkIn.blockers,
                hoursWorked: checkIn.hoursWorked,
                submittedAt: checkIn.submittedAt,
            } : null,
        });
    } catch (error) {
        console.error('Check today check-in error:', error);
        res.status(500).json({ error: 'Failed to check check-in status' });
    }
});

export default router;
