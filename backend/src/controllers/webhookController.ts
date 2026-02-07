
import { Request, Response } from 'express';
import Activity from '../models/Activity';
import Project from '../models/Project';
import User from '../models/User';
import { randomUUID } from 'crypto';

// GitHub Webhook Handler
export const handleGithubWebhook = async (req: Request, res: Response) => {
    try {
        const event = req.headers['x-github-event'];

        if (event === 'push') {
            const { repository, pusher, commits, ref } = req.body as any;

            // Find project linked to this repo
            // In a real app, we'd have a specific webhook secret per project or org
            // For MVP, we search projects that have this repo listed
            const repoFullName = repository.full_name; // "owner/repo"

            const project = await Project.findOne({
                githubRepos: repoFullName,
                deletedAt: null
            });

            if (project) {
                // Determine user
                // We try to find a user with this GitHub username connected
                const user = await User.findOne({
                    'integrations.provider': 'github',
                    'integrations.providerUsername': pusher.name
                });

                // If no user found, we might skip or record as "Unknown"
                // For MVP, if we found a user, we log the activity

                if (user) {
                    // Create activity for each commit
                    const activityPromises = commits.map((commit: any) => {
                        return Activity.create({
                            uuid: randomUUID(),
                            organizationId: project.organizationId,
                            projectId: project._id,
                            userId: user._id,
                            type: 'commit',
                            source: 'github',
                            title: `Pushed to ${repository.name}`,
                            description: commit.message,
                            metadata: {
                                commitHash: commit.id,
                                repositoryName: repository.full_name,
                                branchName: ref.replace('refs/heads/', ''),
                                url: commit.url
                            },
                            activityDate: new Date(commit.timestamp),
                            userName: user.fullName,
                            userAvatar: user.avatarUrl,
                        });
                    });

                    await Promise.all(activityPromises);
                    console.log(`✅ Synced ${commits.length} commits for ${repoFullName}`);
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('GitHub Webhook Error:', error);
        res.status(500).send('Error processing webhook');
    }
};

// Google Calendar Webhook Handler
export const handleGoogleWebhook = async (req: Request, res: Response) => {
    try {
        // Validation check (Google sends this on setup)
        if (req.headers['x-goog-resource-state'] === 'sync') {
            res.status(200).send('OK');
            return;
        }

        // Logic to fetch changes would go here
        // Google webhooks just say "something changed", we then need to query the API to see WHAT changed
        // This requires the stored refresh token to get a new access token

        // For MVP, we acknowledge receipt
        console.log('📅 Received Google Calendar notification');

        res.status(200).send('OK');
    } catch (error) {
        console.error('Google Webhook Error:', error);
        res.status(500).send('Error processing webhook');
    }
};
