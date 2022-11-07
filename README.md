redis-lock
==========

[![Build Status](https://travis-ci.org/errorception/redis-lock.svg)](https://travis-ci.org/errorception/redis-lock)

Implements a locking primitive using redis in node.js.

Fully non-blocking and asynchronous, and uses the algorithm described in the [redis docs](https://redis.io/commands/setnx).

Useful for concurrency control. For example, when updating a database record you might want to ensure that no other part of your code is updating the same record at that time.

Used heavily at [errorception](http://errorception.com/).

Requires v4 of [node-redis](https://github.com/redis/node-redis)
For previous versions use [v0.1.4](https://www.npmjs.com/package/redis-lock/v/0.1.4)

## Example

```javascript
const client = require("redis").createClient(),
	lock = require("redis-lock")(client);

await client.connect(); // node-redis v4 needs to connect before sending commands

const done = await lock("myLock")
// No one else will be able to get a lock on 'myLock' until you call done()
await done();

```

Slightly more descriptive example:
```javascript
const client = require("redis").createClient(),
	lock = require("redis-lock")(client);

await client.connect();

const done1 = await lock("myLock")
// Simulate a 1 second long operation
setTimeout(done1, 1000);

const done2 = await lock("myLock")
// Even though this function has been scheduled at the same time
// as the function above, this callback will not be executed till
// the function above has called done(). Hence, this will have to
// wait for at least 1 second.
await done2();
```

## Installation

	$ npm install redis-lock


## Usage

``redis-lock`` is really simple to use - It's just a function!

### Initialization

To initialize redis-lock, simply call it by passing in a redis client instance, created by calling ``.createClient()`` on the excellent [node-redis](https://github.com/redis/node_redis). This is taken in as a parameter because you might want to configure the client to suit your environment (host, port, etc.), and to enable you to reuse the client from your app if you want to.

You can also provide a second (optional) parameter: `retryDelay`. If due to any reason a lock couldn't be acquired, lock acquisition is retried after waiting for a little bit of time. `retryDelay` lets you control this delay time. Default: 50ms.

```javascript
const lock = require("redis-lock")(require("redis").createClient(), 10);
```

This will return a function called (say) ``lock``, described below:

### lock(lockName, [timeout = 5000]): done

* ``lockName``: Any name for a lock. Must follow redis's key naming rules. Make this as granular as you can. For example, to get a lock when editing record 1 in the database, call the lock ``record1`` rather than ``database``, so that other records in the database can be modified even as you are holding this lock.
* ``timeout``: (Optional) The maximum time (in ms) to hold the lock for. If this time is exceeded, the lock is automatically released to prevent deadlocks. Default: 5000 ms (5 seconds).

Returns a ``done`` async function which releases the lock (or do nothing if timeout has already released it)

Full example, with ``console.log`` calls to illustrate the flow:
```javascript
const client = require("redis").createClient(),
	lock = require("redis-lock")(client);

await client.connect();

console.log("Asking for lock");
const done = await lock("myLock")
console.log("Lock acquired");
await someTask() // Some async task
console.log("Releasing lock now");
await done()
console.log("Lock has been released, and is available for others to use");
```

## Details

* It's guaranteed that only one function will be called at a time for the same lock.
* This module doesn't block the event loop. All operations are completely asynchronous and non-blocking.
* If two functions happen to ask for a lock simultaneously, the execution of the second function is deferred until the first function has released its lock or has timed out.
* It's not possible for two functions to acquire the same lock at any point in time, except if the timeout is breached.
* If the timeout is breached, the lock is released, and the next function coming along and asking for a lock acquires the lock.
* Since it's asynchronous, different functions could be holding different locks simultaneously. This is awesome!
* If redis is down for any reason, none of the functions are given locks, and none of the locks are released. The code will keep polling to check if redis is available again to acquire the lock.

## License

(The MIT License)

Copyright (c) 2012 Rakesh Pai <rakeshpai@errorception.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
