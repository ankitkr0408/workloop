import express from 'express';
import passport from 'passport';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Helper to encrypt/encode state
// For MVP we just use base64 of uuid, in prod use signed JWT/encryption
const encodeState = (uuid: string) => uuid;

/**
 * GET /api/integrations/github/auth
 * Start GitHub OAuth flow
 */
router.get('/github/auth', requireAuth, (req: any, res, next) => {
    const state = encodeState(req.user.uuid);
    passport.authenticate('github', {
        scope: ['user:email', 'repo'],
        state: state
    })(req, res, next);
});

/**
 * GET /api/integrations/github/callback
 * GitHub redirect back
 */
router.get('/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: '/login?error=github_auth_failed' }),
    (req, res) => {
        // Successful authentication
        // Redirect to frontend settings page with success message
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/settings?integration=github&status=success`);
    }
);

/**
 * GET /api/integrations/google/auth
 * Start Google OAuth flow
 */
router.get('/google/auth', requireAuth, (req: any, res, next) => {
    const state = encodeState(req.user.uuid);
    passport.authenticate('google', {
        scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],
        state: state,
        accessType: 'offline', // Request refresh token
        prompt: 'consent' // Force consent to get refresh token
    })(req, res, next);
});

/**
 * GET /api/integrations/google/callback
 * Google redirect back
 */
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_auth_failed' }),
    (req, res) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/settings?integration=google&status=success`);
    }
);

import { handleGithubWebhook, handleGoogleWebhook } from '../controllers/webhookController';

// Webhooks (public endpoints, but usually secured with secrets)
// verifyGithubSignature middleware would be added here in prod
router.post('/webhook/github', handleGithubWebhook);
router.post('/webhook/google', handleGoogleWebhook);

export default router;
