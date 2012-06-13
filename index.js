"use strict";

function aquireLock(client, lockString, lockTimeout, lockAcquired) {
	function retry() {
		aquireLock(client, lockString, lockTimeout, lockAcquired);
	}

	var lockTimeoutValue = (Date.now() + lockTimeout + 1);

	client.setnx(lockString, lockTimeoutValue, function(err, result) {
		if(err) return process.nextTick(retry);
		if(result === 0) {
			client.get(lockString, function(err, timeStamp) {
				if(err) return process.nextTick(retry);

				timeStamp = parseFloat(timeStamp);

				if(timeStamp > Date.now()) {
					setTimeout(retry, 50);
				} else {
					lockTimeoutValue = (Date.now() + lockTimeout + 1)
					client.getset(lockString, lockTimeoutValue, function(err, result) {
						if(err) return process.nextTick(retry);

						if(parseFloat(result) === timeStamp) {
							lockAcquired(lockTimeoutValue);
						} else {
							retry();
						}
					});
				}
			});
		} else {
			lockAcquired(lockTimeoutValue);
		}
	});
}

module.exports = function(client, lockString, lockTimeout, lockedOperations) {
	if(!client) {
		throw new Error("You must specify a client instance of http://github.com/mranney/node_redis");
	}

	if(!lockString) {
		throw new Error("You must specify a lock string. It is on the basis on this the lock is aquired.");
	}

	if(!lockedOperations) {
		lockedOperations = lockTimeout;
		lockTimeout = 5000;
	}

	lockString = "lock." + lockString;

	aquireLock(client, lockString, lockTimeout, function(lockTimeoutValue) {
		lockedOperations(function(allDone) {
			if(lockTimeoutValue > Date.now()) client.del(lockString, allDone);
		});
	});
};
