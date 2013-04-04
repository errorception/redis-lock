"use strict";

function acquireLock(client, lockName, timeout, onLockAquired) {
	function retry() {
		acquireLock(client, lockName, timeout, onLockAquired);
	}

	var lockTimeoutValue = (Date.now() + timeout + 1);

	client.setnx(lockName, lockTimeoutValue, function(err, result) {
		if(err) return process.nextTick(retry);

		if(result === 0) {
			client.get(lockName, function(err, timeStamp) {
				if(err || !timeStamp) return process.nextTick(retry);

				timeStamp = parseFloat(timeStamp);

				if(timeStamp > Date.now()) {
					setTimeout(retry, 50);
				} else {
					lockTimeoutValue = (Date.now() + timeout + 1)
					client.getset(lockName, lockTimeoutValue, function(err, result) {
						if(err) return process.nextTick(retry);

						if(result == timeStamp) {
							onLockAquired(lockTimeoutValue);
						} else {
							retry();
						}
					});
				}
			});
		} else {
			onLockAquired(lockTimeoutValue);
		}
	});
}

module.exports = function(client) {
	if(!(client && client.setnx)) {
		throw new Error("You must specify a client instance of http://github.com/mranney/node_redis");
	}

	return function(lockName, timeout, taskToPerform) {
		if(!lockName) {
			throw new Error("You must specify a lock string. It is on the basis on this the lock is acquired.");
		}

		if(!taskToPerform) {
			taskToPerform = timeout;
			timeout = 5000;
		}

		lockName = "lock." + lockName;

		acquireLock(client, lockName, timeout, function(lockTimeoutValue) {
			taskToPerform(function(done) {
				if(lockTimeoutValue > Date.now()) {
					client.del(lockName, done);
				} else {
					done();
				}
			});
		});
	}
};
