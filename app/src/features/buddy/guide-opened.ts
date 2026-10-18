import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

// Whether the guide (app/guide.tsx) has been opened on this device. Until it has, the chat header's
// "?" calls for attention: people learn late what levels bring (docs/PROJECT.md, 도움말). Kept on
// the device only; null until read.
const OPENED_KEY = 'buddy-guide-opened';

let opened: boolean | null = null;
let reading = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  opened = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function get() {
  return opened;
}

export function useGuideOpened(): boolean | null {
  useEffect(() => {
    if (opened !== null || reading) return;
    reading = true;
    AsyncStorage.getItem(OPENED_KEY)
      .then((value) => opened === null && set(!!value))
      .catch(() => opened === null && set(true));
  }, []);
  return useSyncExternalStore(subscribe, get, () => null);
}

export function markGuideOpened(): void {
  if (opened !== true) set(true);
  AsyncStorage.setItem(OPENED_KEY, '1').catch(() => {});
}
