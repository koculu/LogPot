/**
 * In‑process async job queue with configurable concurrency.
 * Jobs are enqueued and processed in parallel up to the given limit.
 *
 * @example
 * ```ts
 * // Create a queue that runs up to 2 jobs at a time
 * const queue = new AsyncJobQueue(2);
 *
 * // Enqueue multiple async tasks
 * for (let i = 1; i <= 5; i++) {
 *   queue.enqueue(async () => {
 *     console.log(`Job ${i} starting`);
 *     // simulate work
 *     await new Promise(res => setTimeout(res, 500));
 *     console.log(`Job ${i} done`);
 *   });
 * }
 *
 * // Wait for all jobs to finish
 * await queue.drain();
 * console.log('All jobs completed');
 * ```
 */
export class AsyncJobQueue {
  private queue: Array<() => Promise<void>> = []
  private running = 0
  private waiters: Array<() => void> = []

  /**
   * @param concurrency - Maximum number of jobs to run in parallel. Minimum 1.
   */
  constructor(private concurrency = 1) {
    this.concurrency = Math.max(1, concurrency)
  }

  /** Number of jobs still waiting in the queue. */
  get length() {
    return this.queue.length
  }

  /**
   * Add a new job to the queue and trigger processing.
   *
   * @param job - A function returning a Promise; its resolution signals job completion.
   */
  enqueue(job: () => Promise<void>): void {
    this.queue.push(job)
    this.schedule()
  }

  /**
   * Wait until all currently enqueued and in‑flight jobs have completed.
   */
  async drain(): Promise<void> {
    if (this.running === 0 && this.queue.length === 0) return
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve)
    })
  }

  /** Try to pull as many jobs off the queue as we can, up to `concurrency`. */
  private schedule() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!
      this.running++
      job()
        .catch(() => {
          /* swallow errors; callers are responsible for job error handling */
        })
        .finally(() => {
          this.running--
          // Schedule more in case there are still jobs queued
          this.schedule()
          // If nothing left anywhere, notify all drain() callers
          if (this.running === 0 && this.queue.length === 0) {
            this.waiters.forEach((f) => f())
            this.waiters = []
          }
        })
    }
  }
}
