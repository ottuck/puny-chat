import { useSyncExternalStore } from 'react';

import { signInAsGuest } from './actions';

// Starting, before there is an account (docs/PROJECT.md, 게스트 우선). What someone fills in on the
// way, a friend's code (optional) and then a name, is kept only here, in memory: someone who has
// not picked a name is not using the service yet, so nothing touches Firebase or the server.
// Done with the name, one step makes the guest; the route guards (_layout.tsx) then save the name
// and use the code. Going back on the way is just going back.
type Start = { code: string | null; name: string | null };

let start: Start = { code: null, name: null };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function get() {
  return start;
}

function set(next: Start) {
  start = next;
  listeners.forEach((listener) => listener());
}

export function useStart(): Start {
  return useSyncExternalStore(subscribe, get, get);
}

// A friend's code typed on the first screen's way in (null: none, or given up).
export function setStartCode(code: string | null): void {
  set({ ...start, code });
}

export function takeStartCode(): string | null {
  const { code } = start;
  if (code) set({ ...start, code: null });
  return code;
}

// The name is done: the guest is made now. The name waits here until the guards save it.
export async function finishStart(name: string): Promise<void> {
  set({ ...start, name });
  try {
    await signInAsGuest();
  } catch (e) {
    set({ ...start, name: null });
    throw e;
  }
}

export function nameSaved(): void {
  set({ ...start, name: null });
}

export function resetStart(): void {
  set({ code: null, name: null });
}
