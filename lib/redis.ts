import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    showFriendlyErrorStack: true
});

export default redis;
