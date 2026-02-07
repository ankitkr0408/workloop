import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';

// Serialize user for the session (required by passport, though we use JWTs)
// We might not use session middleware, but passport strategies often expect this setup
passport.serializeUser((user: any, done) => {
    done(null, user.uuid);
});

passport.deserializeUser(async (uuid: string, done) => {
    try {
        const user = await User.findOne({ uuid });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// GitHub Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL || 'http://localhost:5000'}/api/integrations/github/callback`,
        passReqToCallback: true
    }, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
            // We expect the user to be logged in (JWT) before connecting an integration
            // But passport runs before our JWT middleware in the route chain usually
            // Alternatively, we pass the JWT in the query param 'state' or 'token'

            // For this implementation, we will assume we get the userId from the 'state' parameter 
            // capable of persisting through the OAuth flow

            const state = req.query.state as string;
            if (!state) {
                return done(new Error('No state provided (userId expected)'));
            }

            // In a real app, 'state' should be an encrypted token or session ID
            // For MVP, we assume it's the User UUID
            const user = await User.findOne({ uuid: state });

            if (!user) {
                return done(new Error('User not found'));
            }

            // Update user with GitHub credentials
            // Note: In a real app, encrypt these tokens!
            // We use 'any' cast because we haven't strictly typed the integrations array in the mongoose model file yet for this specific structure
            // effectively enforcing the structure at runtime

            const githubIntegration = {
                provider: 'github',
                accessToken,
                refreshToken, // GitHub might not provide refresh tokens depending on app settings
                providerUserId: profile.id,
                providerUsername: profile.username,
                connectedAt: new Date(),
                isActive: true
            };

            // Remove existing github integration if any
            user.integrations = user.integrations.filter((i: any) => i.provider !== 'github');
            user.integrations.push(githubIntegration as any);

            await user.save();

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));
}

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL || 'http://localhost:5000'}/api/integrations/google/callback`,
        passReqToCallback: true,
        scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
    }, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
            const state = req.query.state as string;
            if (!state) {
                return done(new Error('No state provided (userId expected)'));
            }

            const user = await User.findOne({ uuid: state });
            if (!user) {
                return done(new Error('User not found'));
            }

            const googleIntegration = {
                provider: 'google_calendar',
                accessToken,
                refreshToken,
                providerUserId: profile.id,
                providerUsername: profile.emails?.[0]?.value,
                connectedAt: new Date(),
                isActive: true
            };

            user.integrations = user.integrations.filter((i: any) => i.provider !== 'google_calendar');
            user.integrations.push(googleIntegration as any);

            await user.save();
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));
}

export default passport;
