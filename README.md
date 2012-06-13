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

	var client = require("redis").createClient(),
		lock = require("redis-lock");

	lock(client, "myLock", function(done) {
		// No one else will be able to get a lock on 'myLock' until you call done()
		done();
	});

Slightly more useful example:

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

## Installation

	$ npm install redis-lock


## Usage

``redis-lock`` 