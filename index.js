"use strict";

const util = require('util');
const defaultTimeout = 5000;
const promisify = util.promisify || function(x) { return x; };

function acquireLock(client, lockName, timeout, retryDelay, onLockAcquired) {
	function retry() {
		/* this is where we recursively re-call ourself */
		setTimeout(() => {
			acquireLock(client, lockName, timeout, retryDelay, onLockAcquired);
		}, retryDelay);
	}

	/* `lockTimeoutValue` is the value after which the lock is automatically released. wathever the use? */
	const lockTimeoutValue = (Date.now() + timeout + /* just in case is 0  we add 1 ms */ 1);
	client.set(lockName, lockTimeoutValue, 'PX', timeout, 'NX', (err, result) => {
		if(err || result === null) return retry();
		onLockAcquired(lockTimeoutValue);
	});
}

module.exports = (client, retryDelay) => {
	if(!(client && client.setnx)) {
		throw new Error("You must specify a client instance of http://github.com/mranney/node_redis");
	}

	retryDelay = retryDelay || 50;

	function lock(lockName, timeout, taskToPerform) {
		if(!lockName) {
			throw new Error("You must specify a lock string. It is on the redis key `lock.[string]` that the lock is acquired.");
		}

		if(!taskToPerform) {
			taskToPerform = timeout;
			timeout = defaultTimeout;
		}

		lockName = "lock." + lockName;

		acquireLock(client, lockName, timeout, retryDelay, function(lockTimeoutValue) {
			taskToPerform(promisify(function(done) {
				done = done || function() {};

				if(lockTimeoutValue > Date.now()) {
					client.del(lockName, done);
				} else {
					done();
				}
			}));
		});
	}

	if(util.promisify) {
		lock[util.promisify.custom] = function(lockName, timeout) {
			return new Promise(function(resolve) {
				lock(lockName, timeout || defaultTimeout, resolve);
			});
		}
	}

	return lock;
};
