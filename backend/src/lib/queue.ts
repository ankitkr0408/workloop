import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

// Mock Queue for local dev without Redis
class MockQueue {
    private name: string;

    constructor(name: string) {
        this.name = name;
        console.log(`⚠️  [MockQueue] Initialized '${name}' (Running in-memory)`);
    }

    async add(jobName: string, data: any, opts?: any) {
        console.log(`📥 [MockQueue] Adding job '${jobName}' to '${this.name}'`, data);

        // Simulate async processing immediately
        // In a real app we'd need a worker registry, but for MVP we might just execute the logic directly
        // checking if we can find a worker handler

        // For now, we just log it. The actual processing logic needs to be triggered manually 
        // or we implement a simple event loop. 
        // To keep it simple: We return a fake job object.
        return { id: `mock-${Date.now()}`, name: jobName, data };
    }
}

// Queue Factory
export const createQueue = (name: string) => {
    if (REDIS_URL) {
        const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
        return new Queue(name, { connection });
    } else {
        return new MockQueue(name);
    }
};

// Worker Factory (Facade)
// We need to store handlers for the MockQueue to actually execute them
const mockHandlers: Record<string, Function> = {};

export const createWorker = (name: string, handler: (job: any) => Promise<any>) => {
    if (REDIS_URL) {
        const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
        return new Worker(name, handler, { connection });
    } else {
        // Register handler for Mock execution
        mockHandlers[name] = handler;
        console.log(`👷 [MockWorker] Registered handler for '${name}'`);

        // Return a fake worker object
        return {
            on: (event: string, cb: Function) => { },
            close: async () => { }
        };
    }
};

// Helper to immediately execute a job in Mock mode (for testing)
export const executeMockJob = async (queueName: string, data: any) => {
    if (!REDIS_URL) {
        const handler = mockHandlers[queueName];
        if (handler) {
            console.log(`🚀 [MockExec] Executing job for '${queueName}'`);
            try {
                await handler({ data }); // Mock job object
                console.log(`✅ [MockExec] Job completed`);
            } catch (err) {
                console.error(`❌ [MockExec] Job failed`, err);
            }
        } else {
            console.warn(`⚠️  [MockExec] No handler found for '${queueName}'`);
        }
    }
};
