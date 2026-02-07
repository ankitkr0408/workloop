import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { reportQueue } from '../jobs/reportJob';
import WeeklyReport from '../models/WeeklyReport';
import Project from '../models/Project';
import { executeMockJob } from '../lib/queue';
import { EmailService } from '../services/emailService';

const router = express.Router();

// Generate Report (Manually trigger job)
router.post('/generate', requireAuth, async (req: Request, res: Response) => {
    try {
        const { projectId, email } = req.body;

        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // Verify project ownership (basic check)
        const project = await Project.findOne({
            uuid: projectId,
            organizationId: req.user!.organizationId
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Add to queue
        const job = await reportQueue.add('generate-weekly-report', {
            projectId: project._id, // Use _id for internal relations, or handle conversion in job
            email
        });

        // Trigger execution if in Mock Mode (for dev)
        // In real BullMQ, this happens automatically by the worker
        if (!process.env.REDIS_URL) {
            // We fire and forget the mock execution so the API returns quickly
            executeMockJob('reports', { projectId: project._id, email });
        }

        res.status(202).json({
            message: 'Report generation started',
            jobId: job.id
        });

    } catch (error) {
        console.error('Generate Report Error:', error);
        res.status(500).json({ error: 'Failed to start report generation' });
    }
});

// List Reports
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;
        const query: any = { organizationId: req.user!.organizationId };

        if (projectId) {
            // Need to resolve UUID to ObjectId first if passing UUID
            const project = await Project.findOne({ uuid: projectId });
            if (project) {
                query.projectId = project._id;
            }
        }

        const reports = await WeeklyReport.find(query)
            .sort({ weekStartDate: -1 })
            .limit(20);

        res.json(reports);
    } catch (error) {
        console.error('List Reports Error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

export default router;
