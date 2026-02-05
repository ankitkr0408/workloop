import mongoose, { Schema, Document } from 'mongoose';

export interface ICheckIn extends Document {
    uuid: string;
    organizationId: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;

    // Denormalized user data
    userName: string;
    userAvatar?: string;

    // Check-in questions (60-second standup)
    workedOn: string;          // What did you work on today?
    planningToDo: string;      // What are you planning tomorrow?
    blockers?: string;         // Any blockers?

    hoursWorked?: number;      // Optional: self-reported hours

    submittedAt: Date;
    checkInDate: Date;         // Date this check-in is for (YYYY-MM-DD)
    createdAt: Date;
    updatedAt: Date;
}

const CheckInSchema = new Schema<ICheckIn>(
    {
        uuid: { type: String, required: true, unique: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

        // Denormalized user data
        userName: { type: String, required: true },
        userAvatar: String,

        workedOn: { type: String, required: true },
        planningToDo: { type: String, required: true },
        blockers: String,

        hoursWorked: Number,

        submittedAt: { type: Date, default: Date.now },
        checkInDate: { type: Date, required: true },
    },
    { timestamps: true }
);

// Indexes
CheckInSchema.index({ uuid: 1 }, { unique: true });
CheckInSchema.index({ projectId: 1, checkInDate: -1 });
CheckInSchema.index({ userId: 1, checkInDate: -1 });
CheckInSchema.index({ organizationId: 1, checkInDate: -1 });

// Prevent duplicate check-ins per user per day per project
CheckInSchema.index({ userId: 1, projectId: 1, checkInDate: 1 }, { unique: true });

export default mongoose.model<ICheckIn>('CheckIn', CheckInSchema);
