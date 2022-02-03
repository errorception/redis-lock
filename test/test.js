const should = require("should"),
	redisClient = require("redis").createClient(),
	lock = require("../index")(redisClient)

const delay = (fn, ms) => new Promise(
	res => setTimeout(async () => {
		const val = await fn();
		res(val);
	}, ms)
);
	
describe("redis-lock", function() {
	before(async () => {
		await redisClient.connect();
	})

	after(async () => {
		await redisClient.disconnect();
	});

	it("should aquire a lock and call the callback", async () => {
		const completed = await lock("testLock");
		const timeStamp = await redisClient.get("lock.testLock");
		parseFloat(timeStamp).should.be.above(Date.now());
		await completed();
		const lockValue = await redisClient.get("lock.testLock");
		should.not.exist(lockValue);
	});

	it("should defer second operation if first has lock", async () => {
		const completed1 = await lock("testLock")
		const p1 = delay(async () => {
			await completed1();
			return 1;
		}, 500);	// Longer, started first

		const completed2 = await lock("testLock")
		const p2 = delay(async () => {
			await completed2();
			return 2;
		}, 200);	// Shorter, started later

		const first = await Promise.race([p1, p2]);
		first.should.equal(1)
	});

	it("shouldn't create a deadlock if the first operation doesn't release the lock within <timeout>", async () => {
		var start = new Date();
		await lock("testLock", 300);
		// Not signalling completion

		const completed = await lock("testLock");
		// This should be called after 300 ms
		(new Date() - start).should.be.above(300);
		await completed();
	});
});
