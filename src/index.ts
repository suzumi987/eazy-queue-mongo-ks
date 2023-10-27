import { EventEmitter } from 'events';
import mongoose, { Schema } from 'mongoose';

const qSchema = new Schema({
  queue_name: String,
  data: mongoose.SchemaTypes.Mixed,
  created: Date,
});

const qModel = mongoose.model('ezqueue', qSchema, 'ezqueue');

interface IQueue<T> {
  _id: mongoose.Types.ObjectId;
  queue_name: string;
  data: T;
  created: Date;
}

class EzqMongo<T> extends EventEmitter {
  private isProcess = false;
  private isQueue = false;
  private pause = false;
  private queue: IQueue<T>[];

  constructor(
    private queueName: string = 'ezq',
    private stackLimit: number = 1,
  ) {
    super();
    this.queue = [];
    this.ckQ();
  }

  private async ckQ() {
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

  public async checkQueue() {
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

    const { c, queue }: { c: { count: number }; queue: IQueue<T>[] } = agg;
    if (c.count && this.queue.length === 0) {
      this.queue = queue;
      const mapId = queue.map((f: IQueue<T>) => f._id);
      await qModel.deleteMany({ _id: { $in: mapId } });
    }
    return c.count;
  }

  public async add(data: T | T[]) {
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

  public async process(callback: (data: T | undefined) => Promise<void>) {
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

  public async clearQueue() {
    this.pause = true;
    this.queue = [];
    await qModel.deleteMany({ queue_name: this.queueName });
    this.isQueue = false; // Ensure isQueue is set to false when the queue is cleared
    this.isProcess = false;
    this.pause = false;
  }
}

export default EzqMongo;
