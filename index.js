"use strict";

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_RETRY_DELAY = 50;

async function acquireLock (client, lockName, timeout, retryDelay, onLockAcquired) {
    function retry () {
        setTimeout(() => {
            acquireLock(client, lockName, timeout, retryDelay, onLockAcquired);
        }, retryDelay);
    }

    const lockTimeoutValue = Date.now() + timeout + 1;
    try {
        const result = await client.set(lockName, lockTimeoutValue, "NX")
        if (result === null) {
            throw new Error("Lock failed");
        }
        await client.set(lockName, lockTimeoutValue, "PX", timeout)
        if (result === null) {
            throw new Error("Lock failed");
        }
        onLockAcquired(lockTimeoutValue);
    } catch (err) {
        retry();
    }
}

function redisLock (client, retryDelay = DEFAULT_RETRY_DELAY) {
    async function lock (lockName, timeout = DEFAULT_TIMEOUT) {
        return new Promise(resolve => {
            if (!lockName) {
                throw new Error("You must specify a lock string. It is on the redis key `lock.[string]` that the lock is acquired.");
            }

            lockName = `lock.${ lockName}`;

            acquireLock(client, lockName, timeout, retryDelay, lockTimeoutValue => {
                resolve(async () => {
                    if (lockTimeoutValue > Date.now()) {
                        return client.del(lockName);
                    }
                });
            });
        });
    }
    return lock;
}

module.exports = redisLock;
