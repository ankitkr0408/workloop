import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
    uuid: string;
    organizationId: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;

    // Denormalized user data (avoid joins on timeline queries)
    userName: string;
    userAvatar?: string;

    type: 'commit' | 'calendar' | 'check_in' | 'manual';
    source: 'github' | 'google_calendar' | 'manual';

    title: string;
    description?: string;

    // Source-specific metadata
    metadata: {
        // GitHub
        commitHash?: string;
        repositoryName?: string;
        branchName?: string;
        filesChanged?: number;

        // Google Calendar
        eventId?: string;
        eventDuration?: number;

        // Check-in
        checkInId?: mongoose.Types.ObjectId;
    };

    activityDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
    {
        uuid: { type: String, required: true, unique: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

        // Denormalized user data
        userName: { type: String, required: true },
        userAvatar: String,

        type: { type: String, enum: ['commit', 'calendar', 'check_in', 'manual'], required: true },
        source: { type: String, enum: ['github', 'google_calendar', 'manual'], required: true },

        title: { type: String, required: true },
        description: String,

        metadata: {
            commitHash: String,
            repositoryName: String,
            branchName: String,
            filesChanged: Number,
            eventId: String,
            eventDuration: Number,
            checkInId: Schema.Types.ObjectId,
        },

        activityDate: { type: Date, required: true },
    },
    { timestamps: true }
);

// Compound indexes for common queries
ActivitySchema.index({ projectId: 1, activityDate: -1 }); // Timeline
ActivitySchema.index({ organizationId: 1, activityDate: -1 }); // Org timeline
ActivitySchema.index({ userId: 1, activityDate: -1 }); // User timeline
ActivitySchema.index({ uuid: 1 }, { unique: true });

// Avoid duplicate GitHub commits
ActivitySchema.index({ 'metadata.commitHash': 1, userId: 1 }, {
    unique: true,
    partialFilterExpression: { 'metadata.commitHash': { $exists: true } }
});

export default mongoose.model<IActivity>('Activity', ActivitySchema);
