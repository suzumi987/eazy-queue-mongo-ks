const { EventEmitter } = require('events');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const qSchema = new Schema({
  queue_name: String,
  data: mongoose.SchemaTypes.Mixed,
  created: Date,
});

const qModel = mongoose.model('ezqueue', qSchema, 'ezqueue');

class EzqMongo extends EventEmitter {
  constructor(queueName = 'ezq', stackLimit = 1) {
    super();
    this.queue = [];
    this.isProcess = false;
    this.isQueue = false;
    this.pause = false;
    this.queueName = queueName;
    this.stackLimit = stackLimit;
    this.ckQ();
  }

  async ckQ() {
    this.pause = true;
    const queueCount = await this.checkQueue();
    this.isQueue = queueCount > 0;

    if (this.isQueue) {
      this.isProcess = true;
      this.emit('job');
    }

    if (queueCount === 0) {
      this.isQueue = false;
    }

    this.pause = false;
  }

  async checkQueue() {
    const [agg] = await qModel.aggregate([
      {
        $match: {
          queue_name: this.queueName,
        },
      },
      {
        $sort: {
          created: 1,
        },
      },
      {
        $facet: {
          queue: [
            { $limit: this.stackLimit },
            {
              $project: {
                queue_name: 1,
                data: 1,
                created: 1,
              },
            },
          ],
          count: [{ $count: 'count' }],
        },
      },
      {
        $project: {
          queue: 1,
          c: {
            $ifNull: [{ $arrayElemAt: ['$count', 0] }, { count: 0 }],
          },
        },
      },
    ]);

    const { c, queue } = agg;
    if (c.count && this.queue.length === 0) {
      this.queue = queue;
      const mapId = queue.map((f) => f._id);
      await qModel.deleteMany({ _id: { $in: mapId } });
    }
    return c.count;
  }

  async add(data) {
    if (Array.isArray(data) && data.length > 100) {
      throw new Error('Data array cannot be more than 100');
    }
    const dataArray = Array.isArray(data) ? data : [data];
    const ins = dataArray.map((d) => ({
      queue_name: this.queueName,
      data: d,
      created: new Date(),
    }));
    await qModel.insertMany(ins);

    if (!this.isProcess && !this.pause) {
      await this.checkQueue();
      this.isQueue = true;
      this.emit('job');
    }
  }

  async process(callback) {
    this.isProcess = true;

    while (this.queue.length > 0) {
      const { data: job } = this.queue.shift() || { data: undefined };
      const result = await callback(job);
      this.emit('done', result, job);
    }
    const c = await this.checkQueue();
    if (c === 0) {
      this.isQueue = false;
      this.emit('complete');
      this.isProcess = false;
    } else {
      this.emit('job');
    }
  }

  async clearQueue() {
    this.pause = true;
    this.queue = [];
    await qModel.deleteMany({ queue_name: this.queueName });
    this.isQueue = false; // Ensure isQueue is set to false when the queue is cleared
    this.isProcess = false;
    this.pause = false;
  }
}

module.exports = EzqMongo;
