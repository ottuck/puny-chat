import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { apiUrl } from '@/lib/api-url';

// How far new devices get through the start (docs/PROJECT.md, 이용 통계): the first screen, the
// tour, its start button, the name, the buddy woken. Each step is counted once per device, mostly
// before any account exists, so it goes without a token and carries only the step and platform.
// Development builds count nothing, so trying the app does not move the numbers.

export type StartStep = 'welcome' | 'demo' | 'start' | 'name' | 'wake';

const KEY = 'startSteps';
let sent: Promise<Set<string>> | null = null;

function load() {
  sent ??= AsyncStorage.getItem(KEY)
    .then((value) => new Set<string>(value ? (JSON.parse(value) as string[]) : []))
    .catch(() => new Set<string>());
  return sent;
}

/** Counts the step if this device has not reached it before. Never fails. */
export function countStartStep(step: StartStep) {
  if (__DEV__) return;
  void (async () => {
    const done = await load();
    if (done.has(step)) return;
    done.add(step); // before sending, so a step reached twice in a row goes once
    try {
      const response = await fetch(`${apiUrl()}/api/stats/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, platform: Platform.OS }),
      });
      if (!response.ok) throw new Error(String(response.status));
      await AsyncStorage.setItem(KEY, JSON.stringify([...done]));
    } catch {
      done.delete(step); // offline: counted the next time the step is reached
    }
  })();
}
