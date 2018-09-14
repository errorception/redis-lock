var should = require("should"),
	redisClient = require("redis").createClient(),
	lock = require("../index")(redisClient),
	lockWithoutDelay = require("../index")(redisClient, 0),
	util = require("util");

const delay = ms => new Promise(res => setTimeout(res, ms));
	
describe("redis-lock", function() {
	after(process.exit);

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


	it("should throw error in second operation if delay is zero and first has lock", function(done) {
		var errored = 0, success = 0;
		lockWithoutDelay("testLock", function(err, completed) {
			setTimeout(function() {
				if(!err){
					success++;
					completed();
					proceed();
				}
			}, 500);	// Longer, started first
		});

		lockWithoutDelay("testLock", function(err, completed) {
			if(err && err.code == "ALREADY_LOCKED"){
				errored++
			}
			proceed();
		});

		function proceed() {
			if(errored === 1 && success == 1) {
				errored.should.equal(1);
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

	it("should work fine with promises", function(done) {
		var promisedLock = util.promisify(lock);
		var startTime = Date.now();

		promisedLock('testLock').then(function(unlock) {
			return delay(100).then(unlock);
		});

		promisedLock('testLock').then(function(unlock) {
			(Date.now() - startTime).should.be.above(100);
			return delay(100).then(() => {
				unlock().then(() => done());
			});
		});
	});

	it("should work fine with async/await", async function() {
		var asyncLock = util.promisify(lock);
		var startTime = Date.now();

		await Promise.all([
			(async () => {
				var unlock = await asyncLock("testLock");
				await delay(100);
				await unlock();
			})(),
			(async () => {
				var unlock = await asyncLock("testLock");
				await delay(100);
				await unlock();
			})()
		]);

		(Date.now() - startTime).should.be.above(200);
	});
});
