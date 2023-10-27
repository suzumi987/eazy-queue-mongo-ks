# EzqMongo

EzqMongo is a simple event-driven queue processing library for Node.js that is built on top of Mongoose and EventEmitter. It provides a way to manage and process queues in a MongoDB database with ease. This README provides an overview of the library and how to use it in your Node.js applications.

## Installation

```bash
npm install eazy-queue-mongo-ks
```

### Import

commonJS:

```javascript
const EzqMongo = require('eazy-queue-mongo-ks');
```

es2015:

```javascript
import EzqMongo from 'eazy-queue-mongo-ks';
```

## API

### `new EzqMongo(queueName?: string, stackLimit?: number)`

- `queueName` (optional): The name of the queue. Default is 'ezq'.
- `stackLimit` (optional): The maximum number of items to process at once. Default is 1.

### `add(data: T | T[])`

Add data to the queue. You can pass a single item or an array of items. in array is limit 100

### `process(callback: (data: T | undefined) => Promise<void>)`

The `process` method is used to process items in the queue by invoking the provided callback function. It processes items one by one until the queue is empty or until an error occurs.

### `checkQueue()`

The `checkQueue` method is used to check the number of items in the queue. It returns a promise that resolves to the count of items in the queue.

### `clearQueue()`

Clear the entire queue. Use this with caution, as it removes all data in the queue.

### Events

EzqMongo emits the following events that you can listen for:

- `job`: Triggered when a job is available for processing.
- `done`: Triggered after processing a job. Provides the processing result and the processed data.
- `complete`: Triggered when the entire queue processing is complete.

## Usage

Here's a basic example of how to use EzqMongo in your Node.js application:

```javascript
import EzqMongo from 'eazy-queue-mongo-ks';
import mongoose from 'mongoose';

mongoose.connect('your-mongodb/your-db');

// Create an instance of EzqMongo with a custom queue name and an optional stack limit
const ezqMongo = new EzqMongo('myQueue', 10);

// Listen for events
ezqMongo.on('job', () => {
  // Process the queue with the defined callback
  ezqMongo.process(async (job) => {
    await somethingAsync(job);
    // ...TODO
    return `ok ${job}`; // Not require return
  });
});

// Add data to the queue
ezqMongo.add({ name: 'foo' });
// Or
ezqMongo.add([{ name: 'foo' }, { name: 'bar' }]);

ezqMongo.on('done', (result, data) => {
  // If ezq.process is return ezqMongo.process. example return `ok {name: 'foo'}`
  // Job is data of process. example {name: 'foo'}
  console.log('Done :', result, data);
});

ezqMongo.on('complete', () => {
  // All job is done
  console.log('Queue processing complete');
});

// Clear the queue (use with caution, as it removes all data in the queue) Mongo deleteMany with queueName
ezqMongo.clearQueue();
```

## Issues and Contributions

If you encounter any issues or have suggestions for improvements, please open an issue on the [GitHub repository](https://github.com/suzumi987/eazy-queue-mongo-ks.git).
