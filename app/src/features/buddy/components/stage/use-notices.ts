import { useCallback, useEffect, useRef, useState } from 'react';

import { type BuddyView, JOB_CHANGE_LEVELS, NEXT_STEP_AT } from '../../api';
import type { Reaction } from '../../reactions';
import { nextJobChange, type Notice } from './acts';
import { EVOLVE_MS, NOTICE_AFTER_MS, NOTICE_GAP_MS, NOTICE_MS } from './constants';

export function useStageNotices(reaction: Reaction | null, buddy: BuddyView): Notice | null {
  const job = buddy.job;
  // Notes over the stage, so there is always something ahead to look forward to: grown into a new
  // stage, the next one (a grown-up's is its job, until it has one); and now and then when the job
  // can be changed: the level before a chance, the chance itself, and after a change, the next one.
  // Worked out when shown, from the buddy as it is by then (its new state follows the event).
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latestBuddy = useRef(buddy);
  useEffect(() => {
    latestBuddy.current = buddy;
  });
  // `then`: another note right after this one.
  const showNotice = useCallback(
    (pick: (now: BuddyView) => Notice | null, after: number, then?: typeof pick) => {
      noticeTimers.current.forEach(clearTimeout);
      const show = (choose: typeof pick, rest?: typeof pick): void => {
        const next = choose(latestBuddy.current);
        if (!next) {
          if (rest) show(rest);
          return;
        }
        setNotice(next);
        noticeTimers.current.push(
          setTimeout(() => {
            setNotice(null);
            if (rest) noticeTimers.current.push(setTimeout(() => show(rest), NOTICE_GAP_MS));
          }, NOTICE_MS),
        );
      };
      noticeTimers.current = [setTimeout(() => show(pick, then), after)];
    },
    [],
  );
  useEffect(() => () => noticeTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (reaction?.kind === 'evolved') {
      showNotice(
        (now) =>
          now.stage === 'ADULT' && now.job
            ? null
            : { key: `nextStage.${now.stage}`, level: NEXT_STEP_AT[now.stage] },
        EVOLVE_MS,
      );
    } else if (reaction?.kind === 'jobChanged') {
      // A cheer for the new job as it settles, then when it can be changed next.
      showNotice(
        (now) => (now.job ? { key: 'notice.newJob', job: now.job } : null),
        EVOLVE_MS,
        nextJobChange,
      );
    } else if (reaction?.kind === 'levelUp' || reaction?.kind === 'maxLevel') {
      showNotice((now) => {
        if (!now.job) return null;
        // The top level's own notes say so (TopLevelNotes).
        if (reaction.kind === 'maxLevel') return null;
        if (now.canChangeJob && JOB_CHANGE_LEVELS.includes(now.level))
          return { key: 'notice.jobChangeOpen' };
        if (now.jobChangeAt === now.level + 1)
          return { key: 'notice.jobChangeSoon', level: now.jobChangeAt };
        return null;
      }, NOTICE_AFTER_MS);
    }
  }, [reaction, showNotice]);
  // The job settled while the stage is open: when it can be changed next. A change says so after its
  // own transformation ('jobChanged').
  const jobSeen = useRef(job);
  useEffect(() => {
    const before = jobSeen.current;
    if (job === before) return;
    jobSeen.current = job;
    if (!job || before) return;
    showNotice(nextJobChange, NOTICE_AFTER_MS + 1500);
  }, [job, showNotice]);
  return notice;
}
