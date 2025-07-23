// import dotenv from 'dotenv';
// dotenv.config();

// import IORedis from 'ioredis';

// async function clearRedisDirectly() {
//   const redisConnection = new IORedis({
//     host: process.env.REDIS_HOST || 'localhost',
//     port: parseInt(process.env.REDIS_PORT || '6379'),
//     password: process.env.REDIS_PASSWORD || undefined,
//   });

//   try {
//     console.log('Clearing Redis data directly...');
    
//     // Get all BullMQ keys
//     const keys = await redisConnection.keys('bull:job-import:*');
//     console.log(`Found ${keys.length} queue-related keys`);
    
//     if (keys.length > 0) {
//       // Delete all BullMQ keys
//       await redisConnection.del(...keys);
//       console.log(`Deleted ${keys.length} keys`);
//     }
    
//     // Optional: Clear everything (nuclear option)
//     // await redisConnection.flushall();
    
//     console.log('✅ Redis cleared successfully!');
    
//   } catch (error) {
//     console.error('❌ Error clearing Redis:', error);
//   } finally {
//     await redisConnection.quit();
//     process.exit(0);
//   }
// }

// clearRedisDirectly();
