"use strict";

function acquireLock(client, lockName, timeout, retryDelay, onLockAquired) {
	function retry() {
		setTimeout(function() {
			acquireLock(client, lockName, timeout, retryDelay, onLockAquired);
		}, retryDelay);
	}

	var lockTimeoutValue = (Date.now() + timeout + 1);
	client.set(lockName, lockTimeoutValue, 'PX', timeout, 'NX', function(err, result) {
		if(err || result === null) return retry();
		onLockAquired(lockTimeoutValue);
	});
}

module.exports = function(client, retryDelay) {
	if(!(client && client.setnx)) {
		throw new Error("You must specify a client instance of http://github.com/mranney/node_redis");
	}

	retryDelay = retryDelay || 50;

	return function(lockName, timeout, taskToPerform) {
		if(!lockName) {
			throw new Error("You must specify a lock string. It is on the redis key `lock.[string]` that the lock is acquired.");
		}

		if(!taskToPerform) {
			taskToPerform = timeout;
			timeout = 5000;
		}

		lockName = "lock." + lockName;

		acquireLock(client, lockName, timeout, retryDelay, function(lockTimeoutValue) {
			taskToPerform(function(done) {
				done = done || function() {};

				if(lockTimeoutValue > Date.now()) {
					client.del(lockName, done);
				} else {
					done();
				}
			});
		});
	}
};
