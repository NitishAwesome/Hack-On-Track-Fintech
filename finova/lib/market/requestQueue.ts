/** Bounded FIFO for public history requests. An abandoned queued request never runs. */
export function createRequestQueue(limit = 4) {
  let active = 0;
  const waiting: Array<() => void> = [];
  const drain = () => {
    while (active < limit && waiting.length) waiting.shift()!();
  };
  return function run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
      const abort = () => {
        const index = waiting.indexOf(start);
        if (index >= 0) waiting.splice(index, 1);
        reject(new DOMException('History request cancelled', 'AbortError'));
      };
      const start = () => {
        signal?.removeEventListener('abort', abort);
        if (signal?.aborted) { abort(); return; }
        active++;
        Promise.resolve().then(task).then(resolve, reject).finally(() => {
          active--;
          drain();
        });
      };
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      waiting.push(start);
      drain();
    });
  };
}
