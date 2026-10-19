import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { batheBuddy, type BuddyView, cleanBuddy, feedBuddy, workBuddy } from './api';

// The room's buddy, kept current by care responses and the socket's `buddy` events. The timeline
// events (FED, CLEANED, …) arrive through the chat as messages.
//
// Feeding and cleaning show at once (docs/PROJECT.md, 돌보기 반응): the bowl fills and the poop goes
// on the tap, and the requests go to the server one after another behind it, so quick taps on
// several poops are not turned down as a clash. What the server says wins once they are all
// answered; a request that failed puts things back as they were.
export function useBuddy(initial: BuddyView) {
  const [server, setServer] = useState(initial);
  const [busy, setBusy] = useState(false);
  // Shown ahead of the server: fed, and the poops down to this many.
  const [feeding, setFeeding] = useState(false);
  const [poopsTo, setPoopsTo] = useState<number | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const waiting = useRef(0);
  // Taps faster than a render: each one counts.
  const shown = useRef({ fed: false, poops: initial.poops });

  const buddy = useMemo<BuddyView>(() => {
    let view = server;
    if (feeding) view = { ...view, hungry: false, canFeed: false };
    if (poopsTo !== null) {
      const poops = Math.min(view.poops, poopsTo);
      view = { ...view, poops, canClean: poops > 0 };
    }
    return view;
  }, [server, feeding, poopsTo]);
  useEffect(() => {
    shown.current = { fed: !buddy.canFeed, poops: buddy.poops };
  }, [buddy]);

  const send = useCallback((action: typeof feedBuddy) => {
    waiting.current += 1;
    queue.current = queue.current.then(async () => {
      try {
        setServer((await action()).buddy);
      } catch (e) {
        console.warn('buddy care failed', e);
      } finally {
        waiting.current -= 1;
        if (waiting.current === 0) {
          setFeeding(false);
          setPoopsTo(null);
        }
      }
    });
  }, []);

  // Work and the hot spring wait for the server: what they bring is the server's to say.
  const run = useCallback(async (action: typeof feedBuddy) => {
    setBusy(true);
    try {
      setServer((await action()).buddy);
    } catch (e) {
      console.warn('buddy care failed', e);
    } finally {
      setBusy(false);
    }
  }, []);

  // True when it went ahead (the caller shows the buddy's reaction right away).
  const feed = (): boolean => {
    if (shown.current.fed) return false;
    shown.current.fed = true;
    setFeeding(true);
    send(feedBuddy);
    return true;
  };
  const clean = (): boolean => {
    if (shown.current.poops <= 0) return false;
    shown.current.poops -= 1;
    setPoopsTo(shown.current.poops);
    send(cleanBuddy);
    return true;
  };

  return {
    buddy,
    busy,
    setBuddy: setServer,
    feed,
    clean,
    work: () => run(workBuddy),
    bathe: () => run(batheBuddy),
  };
}
