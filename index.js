"use strict";

var util = require('util');
var defaultTimeout = 5000;
var defaultRetryTimeout = 0;
var promisify = util.promisify || function(x) { return x; };
var noop = (function() {});

function acquireLock(client, lockName, timeout, retryDelay, retryTimeout, onRetryTimeout, onLockAcquired, context) {
	function retry(context) {
		setTimeout(function() {
			if(!context.didNotify) {
				acquireLock(client, lockName, timeout, retryDelay, retryTimeout, onRetryTimeout, onLockAcquired, context);
			}
		}, retryDelay);
	}

	if(!context) {
		context = {};
		if(retryTimeout > 0) {
			context.retryTimeoutId = setTimeout(function () {
				context.didNotify = true;
				onRetryTimeout();
			}, retryTimeout);
		}
	}

	var lockTimeoutValue = (Date.now() + timeout + 1);
	client.set(lockName, lockTimeoutValue, 'PX', timeout, 'NX', function(err, result) {
		if(context.didNotify) {
			return;
		}
		if(err || result === null) {
			return retry(context);
		}
		if(context.retryTimeoutId) {
			clearTimeout(context.retryTimeoutId);
		}
		onLockAcquired(lockTimeoutValue);
	});
}

module.exports = function(client, retryDelay) {
	if(!(client && client.setnx)) {
		throw new Error("You must specify a client instance of http://github.com/mranney/node_redis");
	}

	retryDelay = retryDelay || 50;

	function lock(lockName, timeout, taskToPerform, options) {
		if(!lockName) {
			throw new Error("You must specify a lock string. It is on the redis key `lock.[string]` that the lock is acquired.");
		}

		if(!taskToPerform) {
			taskToPerform = timeout;
			timeout = defaultTimeout;
		}
		if(!options) {
			options = {};
		}
		var retryTimeout = options.retryTimeout || defaultRetryTimeout;
		var onRetryTimeout = options.onRetryTimeout || noop;

		lockName = "lock." + lockName;

		acquireLock(client, lockName, timeout, retryDelay, retryTimeout, onRetryTimeout, function(lockTimeoutValue) {
			taskToPerform(promisify(function(done) {
				done = done || noop;

				if(lockTimeoutValue > Date.now()) {
					client.del(lockName, done);
				} else {
					done();
				}
			}));
		});
	}

	if(util.promisify) {
		lock[util.promisify.custom] = function(lockName, timeout, options) {
			options = options || {};
			return new Promise(function(resolve, reject) {
				if(!options.onRetryTimeout) {
					options.onRetryTimeout = reject;
				}
				lock(lockName, timeout || defaultTimeout, resolve, options);
			});
		}
	}

	return lock;
};
