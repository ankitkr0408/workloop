import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
    uuid: string;
    name: string;
    slug: string;
    teamSize: string;
    plan: 'free' | 'starter' | 'pro';
    billingEmail?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
    {
        uuid: { type: String, required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true },
        teamSize: { type: String, required: true },
        plan: { type: String, enum: ['free', 'starter', 'pro'], default: 'free' },
        billingEmail: String,
        deletedAt: Date,
    },
    { timestamps: true }
);

// Indexes
OrganizationSchema.index({ uuid: 1 }, { unique: true });
OrganizationSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } });

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
