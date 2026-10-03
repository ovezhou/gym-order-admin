const listeners = new Set();

export function subscribeHttpEvents(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitHttpEvent(event) {
  for (const listener of listeners) listener(event);
}
