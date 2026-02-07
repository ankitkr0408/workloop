
import { reportQueue } from '../src/jobs/reportJob';
import { executeMockJob } from '../src/lib/queue';

async function testQueue() {
    console.log('🚀 Starting Queue System Test...');

    try {
        // 1. Add Job to Queue
        console.log('📥 Adding job to queue...');
        const job = await reportQueue.add('test-report', {
            projectId: '507f1f77bcf86cd799439011', // Dummy ObjectID
            email: 'test@example.com'
        });
        console.log(`✅ Job added with ID: ${job.id}`);

        // 2. Trigger Mock Execution (since we don't have Redis)
        if (!process.env.REDIS_URL) {
            console.log('\n⚙️  Triggering Mock Execution...');
            // This will fail because it tries to find a Project in DB that doesn't exist
            // But we just want to see it catch the error or try to run
            await executeMockJob('reports', {
                projectId: '507f1f77bcf86cd799439011',
                email: 'test@example.com'
            });
        }

    } catch (error) {
        console.log('ℹ️  Job execution threw error (Expected, as DB is empty/mock ID):');
        console.log(error);
    }
}

testQueue();
