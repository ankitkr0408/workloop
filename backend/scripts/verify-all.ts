export { };
const API_URL = 'http://localhost:5000/api';

async function verifyAll() {
    console.log('🚀 Starting System Verification...\n');

    try {
        // 1. Health Check
        console.log('1️⃣  Checking System Health...');
        const health = await fetch(`${API_URL}/../health`); // health is at /health, not /api/health
        console.log(`   Status: ${health.status}`);

        // 2. Rate Limiting Check
        console.log('\n2️⃣  Checking Rate Limiters...');
        const registerRes = await fetch(`${API_URL}/auth/register`);
        // Should be 404 (GET not POST) or 429 if spammed, but headers should exist
        console.log(`   Headers present: ${registerRes.headers.has('x-ratelimit-limit') ? '✅ Yes' : '❌ No'}`);

        // 3. Integration Routes Check
        console.log('\n3️⃣  Checking Integration Routes...');
        const githubRes = await fetch(`${API_URL}/integrations/github/auth`);
        // Expecting 401 (Unauthorized) because we didn't send a token
        // If 404, routes aren't mounted
        if (githubRes.status === 401) {
            console.log('   ✅ GitHub Auth Route: Found & Protected (401)');
        } else if (githubRes.status === 404) {
            console.error('   ❌ GitHub Auth Route: NOT FOUND');
        } else {
            console.log(`   ℹ️ GitHub Auth Route: ${githubRes.status}`);
        }

        const webhookRes = await fetch(`${API_URL}/integrations/webhook/github`, { method: 'POST' });
        // Expecting 200 (OK) but probably "OK" text since we didn't send valid payload
        // Our handler checks payload, but default might be 200
        if (webhookRes.status === 200) {
            console.log('   ✅ GitHub Webhook Route: Active (200)');
        } else {
            console.log(`   ℹ️ GitHub Webhook Route: ${webhookRes.status}`);
        }

    } catch (err) {
        console.error('❌ Verification failed:', err);
    }
}

verifyAll();
