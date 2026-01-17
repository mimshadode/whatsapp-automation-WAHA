import prisma from './lib/db';
import redis from './lib/redis';

async function main() {
  console.log('Testing Redis & DB stability...');

  try {
    console.log('1. Pinging Redis...');
    const redisStart = Date.now();
    await Promise.race([
        redis.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis Timeout')), 2000))
    ]);
    console.log(`✅ Redis OK (${Date.now() - redisStart}ms)`);
  } catch (e: any) {
    console.error('❌ Redis Failed:', e.message);
  }

  try {
    console.log('2. Querying DB...');
    const dbStart = Date.now();
    await Promise.race([
        prisma.whatsappSession.count(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 5000))
    ]);
    console.log(`✅ DB OK (${Date.now() - dbStart}ms)`);
  } catch (e: any) {
    console.error('❌ DB Failed:', e.message);
  }

  process.exit(0);
}

main();
