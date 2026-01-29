import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const db = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function clearCorruptedSession(phoneNumber: string) {
    console.log(`🧹 Clearing corrupted session for: ${phoneNumber}`);
    
    try {
        // 1. Clear Redis
        const cacheKey = `session:${phoneNumber}`;
        await redis.del(cacheKey);
        console.log(`✅ Cleared Redis key: ${cacheKey}`);

        // 2. Clear Database
        const updated = await db.whatsappSession.update({
            where: { phoneNumber },
            data: { sessionState: {} }
        });
        console.log(`✅ Reset DB session state for: ${phoneNumber}`);
        console.log('Final State Size:', JSON.stringify(updated.sessionState).length);

    } catch (error: any) {
        console.error('❌ Error clearing session:', error.message);
    } finally {
        await db.$disconnect();
        await redis.quit();
    }
}

// Targeting the specific corrupted user from logs
const TARGET_USER = '6282134832132@s.whatsapp.net';
// Also try without suffix just in case
const TARGET_USER_PLAIN = '6282134832132';

async function run() {
    await clearCorruptedSession(TARGET_USER);
    await clearCorruptedSession(TARGET_USER_PLAIN);
    console.log('✨ Cleanup complete.');
    process.exit(0);
}

run();
