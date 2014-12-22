'use strict';

function acquireLock(client, lockName, timeout, retryDelay, onLockAquired) {
	function retry() {
		setTimeout(function retryTimeoutCallback() {
			acquireLock(client, lockName, timeout, retryDelay, onLockAquired);
		}, retryDelay);
	}

	var lockTimeoutValue = (Date.now() + timeout + 1);

	client.setnx(lockName, lockTimeoutValue, function trySetLockCallback(err, result) {
		if (err) {
			return retry();
		}

		if (result === 0) {
			// Lock couldn't be acquired. Check if the existing lock has timed out.
			client.get(lockName, function getLockCallback(err, existingLockTimestamp) {
				if (err) {
					return retry();
				}

				if (!existingLockTimestamp) {
					// Wait, the lock doesn't exist!
					// Someone must have called .del after we called .setnx but before .get.
					// https://github.com/errorception/redis-lock/pull/4
					return retry();
				}

				existingLockTimestamp = parseFloat(existingLockTimestamp);

				if (existingLockTimestamp > Date.now()) {
					// Lock looks valid so far. Wait some more time.
					return retry();
				}

				lockTimeoutValue = (Date.now() + timeout + 1);

				client.getset(lockName, lockTimeoutValue, function (err, result) {
					if (err) {
						return retry();
					}

					// Todo: Figure out why tests break when this is set to triple equals.
					if (result == existingLockTimestamp) {
						return onLockAquired(lockTimeoutValue);
					}

					retry();
				});
			});
			return;
		}

		// Lock was set successfully.
		onLockAquired(lockTimeoutValue);
	});
}

module.exports = function redisLockSetupFn(client, retryDelay) {
	if (!(client && client.setnx)) {
		throw new Error('You must specify a client instance of http://github.com/mranney/node_redis');
	}

	retryDelay = retryDelay || 50;

	return function redisLockFn(lockName, timeout, taskToPerform) {
		if (!lockName) {
			throw new Error('You must specify a lock string. It is on the basis on this the lock is acquired.');
		}

		if (!taskToPerform) {
			taskToPerform = timeout;
			timeout = 5000;
		}

		lockName = 'lock.' + lockName;

		acquireLock(client, lockName, timeout, retryDelay, function (lockTimeoutValue) {
			taskToPerform(function (done) {
				done = done || function noop() {};
				
				if (lockTimeoutValue > Date.now()) {
					return client.del(lockName, done);
				}

				done();
			});
		});
	};
};
