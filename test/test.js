var should = require("should"),
	redisClient = require("redis").createClient(),
	lock = require("../index")(redisClient);

describe("redis-lock", function() {
	it("should aquire a lock and call the callback", function(done) {
		lock("testLock", function(completed) {
			redisClient.get("lock.testLock", function(err, timeStamp) {
				if(err) throw err;

				parseFloat(timeStamp).should.be.above(Date.now());

				completed(function() {
					redisClient.get("lock.testLock", function(err, lockValue) {
						should.not.exist(lockValue);
						done();
					});
				});
			});
		});
	});

	it("should defer second operation if first has lock", function(done) {
		var savedValue, taskCount = 0;
		lock("testLock", function(completed) {
			setTimeout(function() {
				savedValue = 1;
				taskCount++;
				completed();
				proceed();
			}, 500);	// Longer, started first
		});

		lock("testLock", function(completed) {
			setTimeout(function() {
				savedValue = 2;
				taskCount++;
				completed();
				proceed();
			}, 200);	// Shorter, started later
		});

		function proceed() {
			if(taskCount === 2) {
				savedValue.should.equal(2);
				done();
			}
		}
	});

	it("shouldn't create a deadlock if the first operation doesn't release the lock within <timeout>", function(done) {
		var start = new Date();
		lock("testLock", 300, function(completed) {
			// Not signalling completion
		});

		lock("testLock", function(completed) {
			// This should be called after 300 ms
			(new Date() - start).should.be.above(300);
			completed();
			done();
		});
	});
});
