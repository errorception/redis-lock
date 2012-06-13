var should = require("should"),
	redisClient = require("redis").createClient(),
	lock = require("../index");

describe("redis-lock", function() {
	it("should aquire a lock and call the callback", function(done) {
		lock(redisClient, "testLock", function(completed) {
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
		lock(redisClient, "testLock", function(completed) {
			setTimeout(function() {
				savedValue = 1;
				taskCount++;
				completed();
				proceed();
			}, 500);	// Longer
		});

		lock(redisClient, "testLock", function(completed) {
			setTimeout(function() {
				savedValue = 2;
				taskCount++;
				completed();
				proceed();
			}, 200);	// Shorter
		});

		function proceed() {
			if(taskCount === 2) {
				savedValue.should.equal(2);
				done();
			}
		}
	});
});
