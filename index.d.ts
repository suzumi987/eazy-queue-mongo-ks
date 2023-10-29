/// <reference types="node" />
import { EventEmitter } from 'events';
declare class EzqMongo<T> extends EventEmitter {
    private queueName;
    private stackLimit;
    private isProcess;
    private isQueue;
    private pause;
    private queue;
    constructor(queueName?: string, stackLimit?: number);
    private ckQ;
    checkQueue(): Promise<number>;
    add(data: T | T[]): Promise<void>;
    process(callback: (data: T | undefined) => Promise<void>): Promise<void>;
    clearQueue(): Promise<void>;
}
export default EzqMongo;