import Redis from 'ioredis';

let redis: Redis | any;

if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        showFriendlyErrorStack: true
    });
} else {
    // Mock Redis for environments without REDIS_URL (e.g. Vercel free tier)
    // This forces the app to rely solely on the Database (Postgres)
    console.warn('[Redis] REDIS_URL not found. Caching disabled (falling back to DB).');
    redis = {
        get: async () => null,
        setex: async () => 'OK',
        del: async () => 0,
        quit: async () => 'OK'
    };
}

export default redis;
