import type { BuddyJob } from '../../api';
import type { Pose } from '../../pixel/sprites';
import type { ReactionKind } from '../../reactions';
import { type Act, isGuest, isUse, jobPose, type StageMood } from './acts';

// The buddy's face and body this tick (buddy-stage.tsx), from what it is doing and feeling.
export function buddyPose({
  leaving,
  walking,
  tick,
  eating,
  active,
  act,
  acting,
  using,
  sitting,
  job,
  atWork,
  watching,
  changingJob,
  evolving,
  petted,
  sleeping,
  buddy,
  mood,
}: {
  leaving: boolean;
  walking: boolean;
  tick: number;
  eating: boolean;
  active: { kind: ReactionKind; phase: 'main' | 'after' } | null;
  act: Act | null;
  acting: boolean;
  using: boolean;
  sitting: boolean;
  job: BuddyJob | null;
  atWork: boolean;
  watching: boolean;
  changingJob: boolean;
  evolving: boolean;
  petted: boolean;
  sleeping: boolean;
  buddy: { hungry: boolean };
  mood: StageMood | null;
}): Pose {
  const basePose: Pose = leaving
    ? walking
      ? tick % 2 === 0
        ? 'step'
        : 'idle'
      : 'happy'
    : eating
      ? active?.phase === 'main'
        ? tick % 2 === 0
          ? 'eat'
          : 'idle'
        : 'happy'
      : active?.kind === 'pooped'
        ? 'strain'
        : act === 'dance'
          ? tick % 2 === 0
            ? 'happy'
            : 'step'
          : act === 'sing'
            ? tick % 2 === 0
              ? 'eat'
              : 'happy'
            : isUse(act)
              ? !using
                ? tick % 2 === 0
                  ? 'step'
                  : 'idle'
                : act === 'musicBox'
                  ? tick % 2 === 0
                    ? 'happy'
                    : 'step'
                  : act === 'watchFish'
                    ? 'happy'
                    : tick % 7 === 0
                      ? 'blink'
                      : 'idle'
              : act === 'sit'
                ? sitting
                  ? tick % 6 === 0
                    ? 'blink'
                    : 'happy'
                  : tick % 2 === 0
                    ? 'step'
                    : 'idle'
                : act === 'job' && job
                  ? atWork
                    ? jobPose(job, tick)
                    : tick % 2 === 0
                      ? 'step'
                      : 'idle'
                  : watching && walking
                    ? tick % 2 === 0
                      ? 'step'
                      : 'idle'
                    : act === 'yawn'
                      ? 'yawn'
                      : act === 'hiccup'
                        ? 'hiccup'
                        : act === 'startle' || act === 'shootingStar'
                          ? 'surprised'
                          : act === 'butterfly' || act === 'snow' || isGuest(act)
                            ? tick % 2 === 0
                              ? 'happy'
                              : 'idle'
                            : act === 'refuse' || act === 'lookAround'
                              ? 'idle'
                              : active?.kind === 'cleaned' ||
                                  active?.kind === 'levelUp' ||
                                  active?.kind === 'maxLevel' ||
                                  active?.kind === 'together' ||
                                  active?.kind === 'here' ||
                                  active?.kind === 'joined' ||
                                  ((active?.kind === 'evolved' || changingJob) && !evolving) ||
                                  petted
                                ? 'happy'
                                : sleeping
                                  ? 'sleep'
                                  : buddy.hungry
                                    ? 'hungry'
                                    : walking
                                      ? tick % 2 === 0
                                        ? 'step'
                                        : 'idle'
                                      : tick % 11 === 0
                                        ? 'blink'
                                        : 'idle';

  // A mood from the chat shows on the face unless something bigger (eating, straining) is going on.
  const moodPose: Pose | null =
    mood === 'laugh'
      ? tick % 2 === 0
        ? 'laugh'
        : 'happy'
      : mood === 'love' || mood === 'cheer' || mood === 'morning' || mood === 'coPet'
        ? 'happy'
        : mood === 'goodnight'
          ? 'sleep'
          : mood === 'comfort'
            ? 'worried'
            : null;
  const pose: Pose =
    moodPose && !eating && active?.kind !== 'pooped' && !acting ? moodPose : basePose;
  return pose;
}
