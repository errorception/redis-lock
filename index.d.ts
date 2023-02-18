import { RedisClientType } from 'redis';

declare function redisLock(client: RedisClientType, retryDelay?: number): (lockName: string, timeout?: number) => Promise<string | undefined>;
export = redisLock;
