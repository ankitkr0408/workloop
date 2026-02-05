import mongoose, { Schema, Document } from 'mongoose';

interface IIntegration {
    provider: 'github' | 'google_calendar' | 'slack';
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    providerUserId: string;
    providerUsername?: string;
    metadata?: Record<string, any>;
    isActive: boolean;
    lastSyncedAt?: Date;
    connectedAt: Date;
}

export interface IUser extends Document {
    uuid: string;
    organizationId: mongoose.Types.ObjectId;
    email: string;
    passwordHash?: string;
    emailVerified: boolean;
    fullName: string;
    avatarUrl?: string;
    role: 'owner' | 'admin' | 'member';
    onboardingCompleted: boolean;
    integrations: IIntegration[];
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}

const UserSchema = new Schema<IUser>(
    {
        uuid: { type: String, required: true, unique: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        email: { type: String, required: true },
        passwordHash: String,
        emailVerified: { type: Boolean, default: false },
        fullName: { type: String, required: true },
        avatarUrl: String,
        role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
        onboardingCompleted: { type: Boolean, default: false },
        integrations: [
            {
                provider: { type: String, enum: ['github', 'google_calendar', 'slack'] },
                accessToken: String,
                refreshToken: String,
                tokenExpiresAt: Date,
                providerUserId: String,
                providerUsername: String,
                metadata: Schema.Types.Mixed,
                isActive: { type: Boolean, default: true },
                lastSyncedAt: Date,
                connectedAt: { type: Date, default: Date.now },
            },
        ],
        lastLoginAt: Date,
        deletedAt: Date,
    },
    { timestamps: true }
);

// Indexes
UserSchema.index({ uuid: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } });
UserSchema.index({ organizationId: 1 });
UserSchema.index({ 'integrations.provider': 1 });

export default mongoose.model<IUser>('User', UserSchema);
