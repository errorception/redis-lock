redis-lock
==========

Implements a locking primitive using redis in node.js.

Fully non-blocking and asynchronous, and uses the robust algorithm as described at http://redis.io/commands/setnx

Useful for concurrency control. For example, when updating a database you might want to ensure that no other part of your code is updating the same entry at the same time.

## Example

```javascript
var client = require("redis").createClient(),
	lock = require("redis-lock");

lock(client, "myLock", function(done) {
	// No one else will be able to get a lock on 'myLock' until you call done()
	done();
});
```

Slightly more useful example:
```javascript
var client = require("redis").createClient(),
	lock = require("redis-lock");

lock(client, "myLock", function(done) {
	// Simulate a 1 second long operation
	setTimeout(done, 1000);
});

lock(client, "myLock", function(done) {
	// Even though this has been called at the same time as the
	// function above, it will not be executed till the function
	// above has called done(). This will have to wait for
	// at least 1 second.
	done();
});
```

## Installation

	$ npm install redis-lock


## Usage

``redis-lock`` is just one function. That's all!

### lock(client, lockName, [timeout = 5000], cb)

* ``client``: An instance of ``.createClient()`` from the excellent [node-redis](https://github.com/mranney/node_redis)
* ``lockName``: Any name for a lock. Must follow redis's key naming rules. Make this as granular as you can. For example, to get a lock when editing record 1 in the database, call the lock ``record1`` rather than ``database``, so that other records in the database can be modified even as you are holding this lock.
* ``timeout``: (Optional) The maximum amount of time (in ms) to hold the lock for. If this time is exceeded, the lock is automatically released to prevent deadlocks. Default: 5000 ms (5 seconds).
* ``cb``: The function to call when the lock has been aquired. This function gets one parameter called ``done`` which should be executed to release the lock.

The ``done`` function can also be passed another function, in case you want to be notified of when the lock has been really released.

## Details

* It's guranteed that only one function will be called at a time for the same lock.
* This module doesn't block the event loop. All operations are completely asynchronous and non-blocking.
* If two functions happen to ask for a lock simultaneously, the execution of the second function is deferred until the first function has released it's lock or has timed out.
* It's not possible for two functions to aquire the same lock at any point in time, except if the timeout is breached.
* If the timeout is breached, the lock is released, and the next function comming along and asking for a lock aquires the lock.
* Since it's asynchronous, multiple functions could be holding different locks simultaneously. This is awesome!
* If redis is down for any reason, none of the functions are given locks, and none of the locks are released. The code will keep polling to check if redis is available again to aquire the lock.

## License

(The MIT License)

Copyright (c) 2012 Rakesh Pai <rakeshpai@errorception.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.