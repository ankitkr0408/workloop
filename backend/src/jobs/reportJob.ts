
import { createQueue, createWorker } from '../lib/queue';
import { PdfService } from '../services/pdfService';
import { EmailService } from '../services/emailService';
import Project from '../models/Project';
import Activity from '../models/Activity';

// Define the Queue
export const reportQueue = createQueue('reports');

// Define the Worker Logic
const processReportJob = async (job: { data: { projectId: string, email: string } }) => {
    const { projectId, email } = job.data;
    console.log(`📄 Processing Report Job for Project: ${projectId}`);

    // 1. Fetch Project Data
    const project = await Project.findOne({ uuid: projectId }); // Assuming lookup by uuid or _id
    // Actually, let's assume projectId passed is the _id or we query effectively
    // The user might pass the UUID.

    // Let's refine lookup
    const projectDoc = await Project.findById(projectId) || await Project.findOne({ uuid: projectId });

    if (!projectDoc) {
        throw new Error(`Project not found: ${projectId}`);
    }

    // 2. Fetch Activities (Last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const activities = await Activity.find({
        projectId: projectDoc._id,
        activityDate: { $gte: startDate, $lte: endDate }
    });

    // 3. Format Data for PDF
    // We need to group activities by date
    // Helper to group:
    const groupedActivities: Record<string, any[]> = {};

    activities.forEach(act => {
        const dateStr = new Date(act.activityDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!groupedActivities[dateStr]) groupedActivities[dateStr] = [];

        groupedActivities[dateStr].push({
            type: act.type,
            title: act.title,
            description: act.description,
            user: act.userName || 'Unknown',
            time: new Date(act.activityDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        });
    });

    const pdfData = {
        projectName: projectDoc.name,
        clientName: projectDoc.clientName,
        startDate: startDate.toLocaleDateString(),
        endDate: endDate.toLocaleDateString(),
        totalHours: activities.reduce((acc, curr) => acc + (curr.metadata?.hours || 0), 0),
        activityCount: activities.length,
        activities: Object.keys(groupedActivities).map(date => ({
            date,
            items: groupedActivities[date]
        }))
    };

    // 4. Generate PDF
    const pdfBuffer = await PdfService.generateReport(pdfData);

    // 5. Upload to Cloudinary (if configured)
    let pdfUrl = '';
    try {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
            const { randomUUID } = require('crypto');
            const cloudinary = require('../config/cloudinary').default;

            await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'weekly-reports',
                        resource_type: 'raw',
                        public_id: `report-${projectDoc.slug}-${endDate.toISOString().split('T')[0]}-${randomUUID()}`,
                        format: 'pdf'
                    },
                    (error: any, result: any) => {
                        if (error) reject(error);
                        else {
                            pdfUrl = result.secure_url;
                            resolve(result);
                        }
                    }
                );
                uploadStream.end(pdfBuffer);
            });
            console.log(`☁️  Uploaded report to Cloudinary: ${pdfUrl}`);
        }
    } catch (err) {
        console.error('❌ Cloudinary Upload Failed:', err);
    }

    // 6. Save to Database
    const { randomUUID } = require('crypto');
    const WeeklyReport = require('../models/WeeklyReport').default;

    const report = await WeeklyReport.create({
        uuid: randomUUID(),
        organizationId: projectDoc.organizationId,
        projectId: projectDoc._id,
        weekStartDate: startDate,
        weekEndDate: endDate,
        stats: {
            totalHours: pdfData.totalHours,
            totalCommits: activities.filter(a => a.type === 'commit').length,
            totalCheckIns: activities.filter(a => a.type === 'check_in').length,
            activeMembers: new Set(activities.map(a => a.userId.toString())).size
        },
        pdfUrl: pdfUrl,
        generatedAt: new Date(),
        sentToClient: true,
        sentAt: new Date()
    });

    // 7. Send Email
    await EmailService.sendWeeklyReport(
        email || projectDoc.clientEmail || 'client@example.com',
        projectDoc.name,
        pdfBuffer,
        `${pdfData.startDate} - ${pdfData.endDate}`
    );

    console.log(`✅ [Job] Report sent & saved for ${projectDoc.name} (ID: ${report.uuid})`);
};

// Register the worker
createWorker('reports', processReportJob);

export { processReportJob }; 
