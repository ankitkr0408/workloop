export { };
const API_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('🔒 Starting Security & Functionality Tests...\n');

    try {
        // 1. Multi-Tenancy Test
        console.log('🧪 Test 1: Multi-Tenancy Isolation');

        // Register Org 1
        const org1Data = {
            email: `test1_${Date.now()}@example.com`,
            password: 'Password123!',
            fullName: 'User One',
            organizationName: 'Org One',
            organizationSlug: `org1-${Date.now()}`,
            teamSize: '1-5'
        };

        console.log('   Creating Org 1...');
        const res1 = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(org1Data)
        });

        if (!res1.ok) throw new Error(`Failed to register Org 1: ${res1.statusText}`);
        const data1 = await res1.json();
        const token1 = data1.accessToken;
        console.log('   ✅ Org 1 created');

        // Register Org 2
        const org2Data = {
            email: `test2_${Date.now()}@example.com`,
            password: 'Password123!',
            fullName: 'User Two',
            organizationName: 'Org Two',
            organizationSlug: `org2-${Date.now()}`,
            teamSize: '1-5'
        };

        console.log('   Creating Org 2...');
        const res2 = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(org2Data)
        });

        if (!res2.ok) throw new Error(`Failed to register Org 2: ${res2.statusText}`);
        const data2 = await res2.json();
        const token2 = data2.accessToken;
        console.log('   ✅ Org 2 created');

        // Create Project in Org 2
        console.log('   Creating Project in Org 2...');
        const projectRes = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token2}`
            },
            body: JSON.stringify({
                name: 'Secret Project',
                clientName: 'Secret Client',
                description: 'For eyes of Org 2 only'
            })
        });

        if (!projectRes.ok) throw new Error('Failed to create project in Org 2');
        console.log('   ✅ Project created in Org 2');

        // Org 1 tries to access Org 2's projects
        console.log('   User 1 attempting to access projects...');
        const accessRes = await fetch(`${API_URL}/projects`, {
            headers: { 'Authorization': `Bearer ${token1}` }
        });
        const accessData = await accessRes.json();

        if (accessData.projects && accessData.projects.length === 0) {
            console.log('   ✅ PASSED: User 1 sees 0 projects (Correct Isolation)');
        } else {
            console.error('   ❌ FAILED: User 1 can see projects!', accessData);
        }

        // 2. Rate Limiting Test
        console.log('\n🧪 Test 2: Login Rate Limiting');
        console.log('   Attempting 6 logins effectively immediately...');

        for (let i = 1; i <= 6; i++) {
            const loginRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: org1Data.email,
                    password: 'WrongPassword123'
                })
            });

            if (i <= 5) {
                // We expect 401 for wrong password, but NOT 429
                if (loginRes.status === 401) {
                    console.log(`   Attempt ${i}: 401 - Invalid credentials (Expected)`);
                } else if (loginRes.status === 429) {
                    console.error(`   ❌ Attempt ${i}: Prematurely Rate Limited!`);
                } else {
                    console.log(`   Attempt ${i}: Status ${loginRes.status}`);
                }
            } else {
                // 6th attempt should be rate limited
                if (loginRes.status === 429) {
                    console.log('   ✅ PASSED: Attempt 6 blocked by Rate Limiter (429 Too Many Requests)');
                } else {
                    console.error(`   ❌ FAILED: Attempt 6 was NOT blocked. Status: ${loginRes.status}`);
                }
            }
        }

    } catch (err) {
        console.error('\n❌ Error running tests:', err);
    }
}

runTests();
