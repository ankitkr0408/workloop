import mongoose, { Schema, Document } from 'mongoose';

interface IClientLink {
    uuid: string;
    label: string;
    expiresAt?: Date;
    isActive: boolean;
    accessCount: number;
    createdAt: Date;
}

interface IProjectMember {
    userId: mongoose.Types.ObjectId;
    userName: string;
    userAvatar?: string;
    role: 'lead' | 'member';
    addedAt: Date;
}

export interface IProject extends Document {
    uuid: string;
    organizationId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    clientName: string;
    clientEmail?: string;
    status: 'active' | 'on_hold' | 'completed' | 'archived';
    members: IProjectMember[];
    clientLinks: IClientLink[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}

const ProjectSchema = new Schema<IProject>(
    {
        uuid: { type: String, required: true, unique: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        name: { type: String, required: true },
        description: String,
        clientName: { type: String, required: true },
        clientEmail: String,
        status: { type: String, enum: ['active', 'on_hold', 'completed', 'archived'], default: 'active' },

        // Embedded members (denormalized user data for quick access)
        members: [
            {
                userId: { type: Schema.Types.ObjectId, ref: 'User' },
                userName: String,
                userAvatar: String,
                role: { type: String, enum: ['lead', 'member'], default: 'member' },
                addedAt: { type: Date, default: Date.now },
            },
        ],

        // Embedded client links (1:few relationship)
        clientLinks: [
            {
                uuid: { type: String, required: true },
                label: { type: String, default: 'Client Dashboard' },
                expiresAt: Date,
                isActive: { type: Boolean, default: true },
                accessCount: { type: Number, default: 0 },
                createdAt: { type: Date, default: Date.now },
            },
        ],

        deletedAt: Date,
    },
    { timestamps: true }
);

// Indexes
ProjectSchema.index({ uuid: 1 }, { unique: true });
ProjectSchema.index({ organizationId: 1, status: 1 });
ProjectSchema.index({ 'clientLinks.uuid': 1 });
ProjectSchema.index({ 'members.userId': 1 });

export default mongoose.model<IProject>('Project', ProjectSchema);
