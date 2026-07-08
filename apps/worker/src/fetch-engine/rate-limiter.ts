export type SleepFn = (ms: number) => Promise<void>;

const defaultSleep: SleepFn = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class CompanyRateLimiter {
  private readonly lastFetchAt = new Map<string, number>();
  private readonly slotQueues = new Map<string, Promise<void>>();

  constructor(
    private readonly intervalMs: number,
    private readonly sleep: SleepFn = defaultSleep,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async waitForSlot(companyId: string): Promise<void> {
    const previous = this.slotQueues.get(companyId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.slotQueues.set(
      companyId,
      previous.then(() => current),
    );

    await previous;

    try {
      const currentTime = this.now();
      const lastFetch = this.lastFetchAt.get(companyId);

      if (lastFetch !== undefined) {
        const elapsed = currentTime - lastFetch;
        if (elapsed < this.intervalMs) {
          await this.sleep(this.intervalMs - elapsed);
        }
      }

      this.lastFetchAt.set(companyId, this.now());
    } finally {
      release();
    }
  }
}
