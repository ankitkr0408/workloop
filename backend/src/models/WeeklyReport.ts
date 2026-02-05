import mongoose, { Schema, Document } from 'mongoose';

interface IWeeklyStat {
    totalHours: number;
    totalCommits: number;
    totalCheckIns: number;
    activeMembers: number;
}

export interface IWeeklyReport extends Document {
    uuid: string;
    organizationId: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;

    weekStartDate: Date;       // Monday of the week
    weekEndDate: Date;         // Sunday of the week

    stats: IWeeklyStat;

    pdfUrl?: string;           // Cloudinary URL
    generatedAt?: Date;
    sentToClient: boolean;
    sentAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const WeeklyReportSchema = new Schema<IWeeklyReport>(
    {
        uuid: { type: String, required: true, unique: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

        weekStartDate: { type: Date, required: true },
        weekEndDate: { type: Date, required: true },

        stats: {
            totalHours: { type: Number, default: 0 },
            totalCommits: { type: Number, default: 0 },
            totalCheckIns: { type: Number, default: 0 },
            activeMembers: { type: Number, default: 0 },
        },

        pdfUrl: String,
        generatedAt: Date,
        sentToClient: { type: Boolean, default: false },
        sentAt: Date,
    },
    { timestamps: true }
);

// Indexes
WeeklyReportSchema.index({ uuid: 1 }, { unique: true });
WeeklyReportSchema.index({ projectId: 1, weekStartDate: -1 });
WeeklyReportSchema.index({ organizationId: 1, weekStartDate: -1 });

// Prevent duplicate reports for same week
WeeklyReportSchema.index({ projectId: 1, weekStartDate: 1 }, { unique: true });

export default mongoose.model<IWeeklyReport>('WeeklyReport', WeeklyReportSchema);
