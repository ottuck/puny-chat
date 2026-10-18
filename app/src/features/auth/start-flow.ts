import { useSyncExternalStore } from 'react';

import { signInAsGuest } from './actions';

// Starting, before there is an account (docs/PROJECT.md, 게스트 우선). What someone fills in on the
// way is kept only here, in memory: a friend's code (optional), their name, and the egg's name. Until
// the last step nothing touches Firebase or the server, since they are not using the service yet and
// many look and leave. The last step (the egg's name, or the name when joining with a code) makes the
// guest; the route guards (_layout.tsx) then save the name, make the room or use the code. Going back
// on the way is just going back.
type Start = { code: string | null; name: string | null; buddyName: string | null };

const EMPTY: Start = { code: null, name: null, buddyName: null };
let start: Start = EMPTY;
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

// A friend's code typed on the first screen's way in.
export function setStartCode(code: string | null): void {
  set({ ...start, code });
}

export function takeStartCode(): string | null {
  const { code } = start;
  if (code) set({ ...start, code: null });
  return code;
}

export function setStartName(name: string): void {
  set({ ...start, name });
}

// The last step: the guest is made now, and what was filled in waits here for the guards. A failure
// keeps it, so trying again needs nothing typed again.
export async function finishStart(buddyName: string | null = null): Promise<void> {
  set({ ...start, buddyName });
  await signInAsGuest();
}

export function nameSaved(): void {
  set({ ...start, name: null });
}

export function roomMade(): void {
  set({ ...start, buddyName: null });
}

// From the first screen again, or another way in (Google, Apple): nothing from before carries over.
export function resetStart(): void {
  set(EMPTY);
}
