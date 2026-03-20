export type DrainableWorkTracker = {
  beginShutdown: () => void;
  isShuttingDown: () => boolean;
  track: <T>(promise: Promise<T>) => Promise<T>;
  drain: () => Promise<void>;
  resetForTests: () => void;
};

export function createDrainableWorkTracker(): DrainableWorkTracker {
  let shuttingDown = false;
  const pending = new Set<Promise<unknown>>();

  return {
    beginShutdown() {
      shuttingDown = true;
    },
    isShuttingDown() {
      return shuttingDown;
    },
    track<T>(promise: Promise<T>) {
      let tracked: Promise<T>;
      tracked = promise.finally(() => {
        pending.delete(tracked);
      });
      pending.add(tracked);
      return tracked;
    },
    async drain() {
      await Promise.allSettled([...pending]);
    },
    resetForTests() {
      shuttingDown = false;
      pending.clear();
    }
  };
}
