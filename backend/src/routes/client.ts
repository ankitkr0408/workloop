import express, { Request, Response } from 'express';
import Project from '../models/Project';
import Activity from '../models/Activity';
import CheckIn from '../models/CheckIn';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/client/:uuid
 * Public client dashboard (no auth required!)
 */
router.get('/:uuid', optionalAuth, async (req: Request, res: Response) => {
    try {
        const { uuid } = req.params;
        const { limit = '50' } = req.query;

        // Find project by client link UUID
        const project = await Project.findOne({
            'clientLinks.uuid': uuid,
            deletedAt: null
        });

        if (!project) {
            res.status(404).json({ error: 'Client dashboard not found' });
            return;
        }

        // Find the specific client link
        const clientLink = project.clientLinks.find(l => l.uuid === uuid);

        if (!clientLink) {
            res.status(404).json({ error: 'Client link not found' });
            return;
        }

        // Check if link is active
        if (!clientLink.isActive) {
            res.status(403).json({ error: 'This client link has been revoked' });
            return;
        }

        // Check if link is expired
        if (clientLink.expiresAt && clientLink.expiresAt < new Date()) {
            res.status(403).json({ error: 'This client link has expired' });
            return;
        }

        // Increment access count (fire and forget)
        clientLink.accessCount += 1;
        project.save().catch(err => console.error('Failed to update access count:', err));

        // Fetch activities
        const activities = await Activity.find({ projectId: project._id })
            .sort({ activityDate: -1 })
            .limit(parseInt(limit as string));

        // Fetch recent check-ins
        const checkIns = await CheckIn.find({ projectId: project._id })
            .sort({ checkInDate: -1 })
            .limit(10);

        // Calculate stats
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentActivities = await Activity.find({
            projectId: project._id,
            activityDate: { $gte: sevenDaysAgo },
        });

        const recentCheckIns = await CheckIn.find({
            projectId: project._id,
            checkInDate: { $gte: sevenDaysAgo },
        });

        const totalCommits = recentActivities.filter(a => a.type === 'commit').length;
        const totalHours = recentCheckIns.reduce((sum, c) => sum + (c.hoursWorked || 0), 0);
        const activeMembers = new Set(recentActivities.map(a => a.userId.toString())).size;

        // Transform activities to plain English
        const activitiesFormatted = activities.map(activity => {
            let title = activity.title;

            // Transform GitHub commit messages to plain English
            if (activity.type === 'commit' && activity.metadata.repositoryName) {
                title = `Pushed code to ${activity.metadata.repositoryName}`;
                if (activity.metadata.branchName) {
                    title += ` (${activity.metadata.branchName} branch)`;
                }
            }

            return {
                id: activity.uuid,
                type: activity.type,
                title,
                description: activity.description,
                user: {
                    name: activity.userName,
                    avatar: activity.userAvatar,
                },
                timestamp: activity.activityDate,
            };
        });

        const checkInsFormatted = checkIns.map(checkIn => ({
            id: checkIn.uuid,
            user: {
                name: checkIn.userName,
                avatar: checkIn.userAvatar,
            },
            workedOn: checkIn.workedOn,
            planningToDo: checkIn.planningToDo,
            hoursWorked: checkIn.hoursWorked,
            date: checkIn.checkInDate,
        }));

        res.json({
            project: {
                name: project.name,
                description: project.description,
                clientName: project.clientName,
            },
            stats: {
                totalCommits,
                totalHours,
                totalCheckIns: recentCheckIns.length,
                activeMembers,
                period: '7 days',
            },
            activities: activitiesFormatted,
            checkIns: checkInsFormatted,
            accessedAt: new Date(),
        });
    } catch (error) {
        console.error('Client dashboard error:', error);
        res.status(500).json({ error: 'Failed to load client dashboard' });
    }
});

export default router;
