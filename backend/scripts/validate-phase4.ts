
export { };
const API_URL = 'http://localhost:5000/api';

async function checkHealth() {
    try {
        const res = await fetch(`${API_URL}/health`); // Correct endpoint from index.ts
        const data = await res.json();
        console.log('✅ Backend Health:', data);

        // Check if new routes are accessible (should be 403 Forbidden or 401 Unauthorized, not 404)
        const githubAuthRes = await fetch(`${API_URL}/integrations/github/auth`);
        // Rate limiter might trigger, or 401 because we need auth
        if (githubAuthRes.status === 401 || githubAuthRes.status === 403) {
            console.log('✅ Integration routes registered (401/403 Expected)');
        } else if (githubAuthRes.status === 404) {
            console.error('❌ Integration routes NOT found (404)');
        } else {
            console.log(`ℹ️ Integration route status: ${githubAuthRes.status}`);
        }

    } catch (err) {
        console.error('❌ Health check failed:', err);
    }
}

checkHealth();
