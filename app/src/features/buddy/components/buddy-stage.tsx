import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import {} from '@/components/progress-bar';
import { useColorMode, useColors } from '@/theme';

import { type BuddyView } from '../api';
import {} from '../jobs';
import { isFullMoon } from '../moon';
import {
  butterflyAt,
  dressedFrame,
  type Layer,
  SEASON_CORNER,
  type Season,
  seasonBehind,
  seasonFront,
  umbrellaFor,
} from '../pixel/looks';
import { PixelSprite } from '../pixel/pixel-sprite';
import { skyAt } from '../pixel/room';
import { type FishStyle, OPEN_BOOK } from '../pixel/room-things';
import {
  BUDDY_PALETTE,
  buddyFrame,
  JOB_STATIONS,
  PROP_PALETTE,
  seated,
  SIT_ROWS,
  STAGE_ORDER,
} from '../pixel/sprites';
import type { Reaction } from '../reactions';
import { JOB_LINES, type Line, NEW_JOB_LINE, pick, useBuddyTalk } from '../use-buddy-talk';
import { RoomLight, roomHour } from './room-light';
import { SpeechBubble } from './speech-bubble';
import { Feathers, TopLevelLight, TopLevelNotes } from './top-level';
import { type Guest, isFloorPasser, RoomSparkle, Tappable, Passer, useNow } from './room-props';
import {
  decorFor,
  glassOf,
  lampShadeAt,
  Plant,
  plantRoom as plantRoomFor,
  type RoomProp,
  sideRoom,
  thingsAt,
  WallDecor,
} from './stage-decor';
import {
  type Act,
  ACT_LINE,
  ACT_MS,
  ACT_REPEATS,
  type Cue,
  isGuest,
  isHappening,
  isUse,
  MOOD_LINE,
  MOOD_MS,
  pickIdleAct,
  type StageMood,
  type Use,
  WEATHER,
  WINDOW_LINE,
} from './stage/acts';
import {
  BOOK_ABOVE_FEET,
  BUTTERFLY_FLY_MS,
  CO_PET_MS,
  EGG_ROOM,
  FAST_TICK_MS,
  FLOOR,
  gridScale,
  IDLE_ACT_MAX_MS,
  IDLE_ACT_MIN_MS,
  JOB_WALK_MAX_MS,
  JOB_WALK_MS,
  LEAVE_WALK_MS,
  LEAVE_WAVE_MS,
  NATIVE_DRIVER,
  PET_MS,
  PROP_SCALE,
  SHAKE_TICK_MS,
  STATION_LEFT,
  TABLE_AWAY_MS,
  THOUGHT_POP_MS,
  TICK_MS,
  WALL_TOP,
  WINDOW_WALK_MAX_MS,
} from './stage/constants';
import {
  useActiveReaction,
  usePresence,
  useQueuedReaction,
  useSeason,
  useSleeping,
  useTick,
  useEggRock,
} from './stage/hooks';
import {} from './stage/motion';
import { roomTime } from './stage/room-time';
import { BuddyFigure, BuddyMarks } from './stage/buddy-parts';
import { Bowl, MealTable, Poops, ThoughtTap } from './stage/care';
import { StageNotice } from './stage/notice';
import { buddyPose } from './stage/pose';
import { StageHeader } from './stage/stage-header';
import {
  stationLight,
  StationBehind,
  StationFront,
  StationHeld,
  StationTap,
} from './stage/station';
import { useBob, usePoopSlots, useRice } from './stage/use-care';
import { useStageNotices } from './stage/use-notices';
import { useReactionMotion } from './stage/use-reaction-motion';
import { useTopLevel } from './stage/use-top-level';

export type { Cue } from './stage/acts';
export { CORNER_SIZE, FLOOR, gridScale, LEAVE_WAVE_MS } from './stage/constants';
export { useSleeping } from './stage/hooks';

// The buddy's stage above the chat (docs/PROJECT.md, 핵심 경험): the buddy walks around, waits by
// an empty bowl when hungry, leaves poops on the floor and sleeps at night. Tapping the bowl or a
// poop takes care of it right there, and it reacts to what happens in the room: eating when fed,
// straining when it poops, sparkling when cleaned, hopping at a new message, and evolving. Left
// alone it dances or sings now and then, and once grown it talks (use-buddy-talk.ts). It keeps its
// size while typing and reading back: a stage that folds and unfolds moved the chat under the
// finger and broke scrolling.

type Props = {
  buddy: BuddyView;
  // A feed or clean request is in flight.
  busy: boolean;
  height: number;
  onFeed: () => void;
  onClean: () => void;
  // A grown-up's work at its station (EXP once an hour; the server decides).
  onWork: () => void;
  onOpenDetail: () => void;
  // The latest live event to react to.
  reaction: Reaction | null;
  // An egg resting at the far end: the tour's ending, "yours is next".
  companionEgg?: boolean;
  // Greets on opening ("good morning"); off in the tour.
  greets?: boolean;
  cue?: Cue | null;
  // When a text last came or went (ms): the buddy only starts a talk when it has been quiet.
  lastTalkAt?: number;
  // The partner petted the buddy just now (a new object each time), and this user did: to be
  // passed on to the partner.
  partnerPet?: { id: string } | null;
  onPet?: () => void;
  // The partner is connected too: the buddy is a little more lively.
  partnerHere?: boolean;
  // The season's look (pixel/looks.ts): by the date unless given (the art preview picks one).
  season?: Season | null;
  // Buttons in the top right corner (the hot spring, the album: buddy-scene.tsx), and how many.
  corner?: ReactNode;
  corners?: number;
  // Without its own margins and rounded frame: buddy-scene.tsx draws them around the scenes.
  bare?: boolean;
  // A cut of the dream (buddy-dream.tsx): no name or level, and the buddy stays in the middle.
  dream?: boolean;
  // Which kind of plant the pot shows, instead of the one the room drew (the art preview).
  plantKind?: number;
  // Told where the buddy's middle is across the stage as it walks (buddy-scene.tsx closes the iris
  // on it).
  onWalk?: (middle: number) => void;
  // Going its own way (buddy-scene.tsx): it waves goodbye with its things in a bundle on its back,
  // then walks off to the right.
  leaving?: boolean;
  // The hour the room's window, clock and lamp show instead of the device's (the art preview).
  hour?: number;
  // The day ("MM-DD") the room's seasonal things go by instead of today (the art preview).
  date?: string;
  // Opens the mailbox (the top level's note about the developer's letter).
  onOpenMail?: () => void;
  // Where the goldfish lives, being compared (the preview); the bowl on its table otherwise.
  fishStyle?: FishStyle;
};

export function BuddyStage({
  buddy,
  busy,
  height,
  onFeed,
  onClean,
  onWork,
  onOpenDetail,
  reaction: latest,
  companionEgg,
  greets = true,
  cue: latestCue,
  lastTalkAt = 0,
  partnerPet: latestPartnerPet,
  onPet,
  partnerHere = false,
  season: chosenSeason,
  corner: cornerButton,
  corners = 1,
  bare = false,
  dream = false,
  plantKind,
  onWalk,
  leaving = false,
  hour,
  date,
  onOpenMail,
  fishStyle,
}: Props) {
  const colors = useColors();
  const colorMode = useColorMode();
  const { t } = useTranslation();
  // The stage mounts again each time it unfolds; what happened before that is not news. Without
  // this, focusing the composer and leaving it replayed the last evolution every time.
  const [mountedAfter] = useState(latest?.id);
  const reaction = useQueuedReaction(latest && latest.id !== mountedAfter ? latest : null);
  const active = useActiveReaction(reaction);
  const [cueMountedAfter] = useState(latestCue?.id);
  const cue = latestCue && latestCue.id !== cueMountedAfter ? latestCue : null;
  // Transforming: into the next stage, or into a new job.
  const changingJob = active?.kind === 'jobChanged';
  const evolving = (active?.kind === 'evolved' || changingJob) && active.phase === 'main';
  const [act, setAct] = useState<Act | null>(null);
  const [actRun, setActRun] = useState(0);
  const actTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useTick(evolving ? FAST_TICK_MS : act === 'refuse' ? SHAKE_TICK_MS : TICK_MS);
  const job = buddy.job;
  // The job before the latest change, for the change's old and new looks in turn.
  const [jobs, setJobs] = useState({ now: job, before: job });
  if (job !== jobs.now) setJobs({ now: job, before: jobs.now });
  const night = useSleeping(job, hour);
  const season = useSeason(chosenSeason);
  const [width, setWidth] = useState(0);
  const [walking, setWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [petted, setPetted] = useState(false);
  const petTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mood, setMood] = useState<StageMood | null>(null);
  const myPetAt = useRef(0);
  const partnerPetAt = useRef(0);
  const [petMountedAfter] = useState(latestPartnerPet?.id);
  const partnerPet =
    latestPartnerPet && latestPartnerPet.id !== petMountedAfter ? latestPartnerPet : null;
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placed = useRef(false);
  const [x] = useState(() => new Animated.Value(0));
  const [hop] = useState(() => new Animated.Value(0));
  const [note] = useState(() => new Animated.Value(0));
  const [flutter] = useState(() => new Animated.Value(0));
  // How many showers have ended (the window shows a rainbow after one).
  const [rainEnded, setRainEnded] = useState(0);
  // Which half of the stage the buddy is heading to, so its speech bubble opens toward the middle.
  const [onRightHalf, setOnRightHalf] = useState(false);

  const egg = buddy.stage === 'EGG';
  // A reaction wakes a sleeping buddy for a moment, "good night" puts it to sleep by day too.
  const sleeping = ((night && !mood) || mood === 'goodnight') && !active && !petted && !leaving;
  const idleFrame = buddyFrame(buddy.stage, 'idle');
  const scale = gridScale(height, idleFrame.length);
  const spriteWidth = idleFrame[0].length * scale;
  const spriteHeight = idleFrame.length * scale;
  const glowSize = Math.round(spriteWidth * 1.5);
  const bowlWidth = 12 * PROP_SCALE;
  // A child or grown-up has hands: no bowl stands about, a table comes out for the meal.
  const atTable = buddy.stage === 'CHILD' || buddy.stage === 'ADULT';
  const clock = useNow();
  const now = roomTime(clock, hour, date);
  const roomDecor = decorFor(buddy.level, buddy.name, plantKind, now);
  const decor = fishStyle ? { ...roomDecor, fishStyle } : roomDecor;
  // The lamp, lit in the evening and at night unless switched (until the stage opens again).
  const [lampOn, setLampOn] = useState<boolean | null>(null);
  // The tree fruits while the stage is open (Lv.45): its oranges pop out one by one, and the buddy
  // says so. Counted, so the tree is drawn again for each time (the preview goes back and forth).
  const [plantNow, setPlantNow] = useState(decor.plant);
  const [fruiting, setFruiting] = useState(0);
  if (decor.plant !== plantNow) {
    if (decor.plant === 5 && plantNow === 4) setFruiting(fruiting + 1);
    setPlantNow(decor.plant);
  }
  // Evening and night: the lamp is lit, and a shooting star may cross the sky.
  const darkSky = skyAt(now.getHours()) !== 'day';
  const lampLit = lampOn ?? darkSky;
  // The season's corner stands in for the plant that week.
  const corner = season ? SEASON_CORNER[season] : undefined;
  const plantRoom = corner
    ? Math.ceil(corner.frame[0].length * corner.size * scale) + 8
    : plantRoomFor(decor);
  // The bowl stands by the plant (and the lamp and the side table) on the right; the poops land
  // left of it.
  const bowlRight = 16 + plantRoom + sideRoom(decor);
  const guests = decor.guests.join(',');
  // The guests that come to the window (not along the floor).
  const windowGuests = decor.guests.filter((guest) => !isFloorPasser(guest));
  // What a child or grown-up can go over and use (USES): the music box, the window once guests come
  // to it, the goldfish, the books.
  const uses = (
    atTable
      ? [
          decor.musicBox && 'musicBox',
          decor.window && windowGuests.length > 0 && 'waitGuest',
          decor.fish > 0 && 'watchFish',
          decor.books > 0 && 'read',
        ]
      : []
  )
    .filter((use): use is Use => typeof use === 'string')
    .join(',');
  const poopRight = atTable ? bowlRight : bowlRight + bowlWidth + 12;
  // The walkable strip: from the left (in front of a job's station) up to the bowl.
  // Wings stick out on both sides: the walk keeps them on the stage and off the bowl.
  const behind = seasonBehind(buddy.stage, season);
  const reach = behind ? Math.max(0, -behind.col) * scale : 0;
  const minX = 16 + reach;
  const maxX = Math.max(
    minX,
    width -
      spriteWidth -
      reach -
      bowlRight -
      (atTable ? 0 : bowlWidth) -
      8 -
      (companionEgg ? EGG_ROOM : 0),
  );
  // A grown-up's station on the left, where it goes to work.
  const station = buddy.stage === 'ADULT' && job ? JOB_STATIONS[job] : null;
  // A station that comes while the stage is open (the job settled at Lv.10, or changed) pops in.
  const [jobAtMount] = useState(job);
  // The station's cell: the buddy's pixel, or finer.
  const cell = scale * (station?.fine ?? 1);
  const stationX = station ? STATION_LEFT + station.standAt * cell : 0;
  // Its right end, past what stands behind the buddy too, so the buddy walks clear of it.
  const stationRight = station
    ? STATION_LEFT +
      Math.max(
        station.frames[0][0].length,
        station.behind ? station.behind.col + station.behind.frame[0].length : 0,
      ) *
        cell
    : 0;
  const eating = active?.kind === 'fed';
  const settled = sleeping || buddy.hungry || egg || eating || evolving || dream || leaving;
  const acting = act !== null;
  const { line, say, hush } = useBuddyTalk({
    stage: buddy.stage,
    quiet: sleeping || !!active || acting || !!mood,
    greets,
    lastTalkAt,
    job,
  });
  // The evolution has the stage to itself: what was being said ("배고파…") goes, and nothing is
  // shown over the growing and shrinking body until it settles.
  useEffect(() => {
    if (evolving) hush();
  }, [evolving, hush]);
  // Fed: no more "배고파…" over the meal.
  const fedNow = !buddy.hungry;
  useEffect(() => {
    if (fedNow && line === 'hungry') hush();
  }, [fedNow, line, hush]);

  useEffect(() => {
    if (!onWalk) return;
    const id = x.addListener(({ value }) => onWalk(value + spriteWidth / 2));
    return () => x.removeListener(id);
  }, [onWalk, x, spriteWidth]);

  const perform = useCallback(
    (next: Act, replaceCurrent = false, spoken?: Line) => {
      // Only explicit cues replace an action. A queued idle callback must respect the tap lock.
      if (!replaceCurrent && (actTimer.current || petTimer.current)) return;
      if (actTimer.current) clearTimeout(actTimer.current);
      if (petTimer.current) clearTimeout(petTimer.current);
      petTimer.current = null;
      setPetted(false);
      setAct(next);
      // The same cue must restart the finite animation even when its kind has not changed.
      setActRun((run) => run + 1);
      const line = spoken ?? (next === 'job' && job ? pick(JOB_LINES[job]) : ACT_LINE[next]);
      if (line) say(line);
      actTimer.current = setTimeout(
        () => {
          actTimer.current = null;
          setAct(null);
        },
        // Work starts on arrival (see below), which restarts this; the walk is the most it waits.
        next === 'job' || next === 'sit' || isUse(next)
          ? JOB_WALK_MAX_MS + ACT_MS[next]
          : ACT_MS[next],
      );
    },
    [say, job],
  );

  // A word from the chat that moves it: for a moment it shows how it feels, and says so once grown.
  const startMood = useCallback(
    (next: StageMood) => {
      if (actTimer.current) clearTimeout(actTimer.current);
      if (petTimer.current) clearTimeout(petTimer.current);
      if (moodTimer.current) clearTimeout(moodTimer.current);
      actTimer.current = null;
      petTimer.current = null;
      setAct(null);
      setPetted(false);
      setMood(next);
      // A writer answers "love" in its own words.
      say(job === 'WRITER' && next === 'love' ? 'writerLove' : MOOD_LINE[next]);
      moodTimer.current = setTimeout(() => {
        moodTimer.current = null;
        setMood(null);
      }, MOOD_MS[next]);
    },
    [say, job],
  );

  // Wander: walk to a random spot, look around, repeat. A hungry or eating buddy stays by the bowl,
  // a sleeping one stays put, and an egg only wobbles.
  useEffect(() => {
    if (width === 0 || leaving) return;
    // Dancing, singing or feeling something on the spot.
    if (acting || mood) {
      // Stopped short of where it was heading: what it says opens toward the middle from here.
      x.stopAnimation((at) => setOnRightHalf(at + spriteWidth / 2 > width / 2));
      return;
    }
    let stopped = false;
    let current: Animated.CompositeAnimation | null = null;
    // The egg rests in the middle of the stage, on the rug, not of the strip it could walk.
    const middle = Math.min(maxX, Math.max(minX, (width - spriteWidth) / 2));
    const home = buddy.hungry || eating ? maxX : egg ? middle : (minX + maxX) / 2;
    // At the table it eats where it is, and a hungry one waits where it is, thinking of food.
    const stay = atTable && (buddy.hungry || eating);
    const leg = (from: number) => {
      if (stopped) return;
      const to = settled ? (stay ? from : home) : minX + Math.random() * (maxX - minX);
      const distance = Math.abs(to - from);
      if (distance > 2) {
        setFacingLeft(to < from);
        setWalking(true);
      } else if (buddy.hungry || eating) {
        setFacingLeft(false); // looking at the bowl
      }
      // By the stage itself: the walkable strip is lopsided with a station and a corner.
      setOnRightHalf(to + spriteWidth / 2 > width / 2);
      current = Animated.sequence([
        Animated.timing(x, {
          toValue: to,
          duration: distance * (eating ? 12 : 28),
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.delay(settled ? 60_000 : 1500 + Math.random() * 3500),
      ]);
      current.start(({ finished }) => {
        if (finished) leg(to);
      });
      // The walk part ends before the pause; stop stepping then.
      setTimeout(() => !stopped && setWalking(false), distance * (eating ? 12 : 28));
    };
    x.stopAnimation((value) => {
      // The first time, appear where the buddy belongs instead of walking in from the edge.
      if (!placed.current) {
        placed.current = true;
        x.setValue(home);
        leg(home);
      } else {
        leg(value);
      }
    });
    return () => {
      stopped = true;
      current?.stop();
    };
  }, [
    width,
    spriteWidth,
    settled,
    acting,
    mood,
    eating,
    buddy.hungry,
    atTable,
    egg,
    minX,
    maxX,
    x,
    leaving,
  ]);

  // Leaving home: a wave and a goodbye where it stands, then off to the right and out of the room.
  useEffect(() => {
    if (!leaving || width === 0) return;
    let stopped = false;
    let walk: Animated.CompositeAnimation | null = null;
    say('farewell');
    const timer = setTimeout(() => {
      x.stopAnimation((from) => {
        if (stopped) return;
        setFacingLeft(false);
        setWalking(true);
        walk = Animated.timing(x, {
          toValue: width + 10,
          duration: Math.max(600, (width + 10 - from) * LEAVE_WALK_MS),
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        });
        walk.start();
      });
    }, LEAVE_WAVE_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
      walk?.stop();
    };
    // Once, as it sets off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving, width]);

  // Work: walk over to the station, then work there for a while. Without one (not grown up yet,
  // or no job) it works where it stands.
  const [arrivedRun, setArrivedRun] = useState(-1);
  const atWork = act === 'job' && arrivedRun === actRun;
  useEffect(() => {
    if (act !== 'job' || width === 0) return;
    let stopped = false;
    const startWork = () => {
      if (stopped) return;
      setWalking(false);
      setArrivedRun(actRun);
      if (actTimer.current) clearTimeout(actTimer.current);
      actTimer.current = setTimeout(() => {
        actTimer.current = null;
        setAct(null);
      }, ACT_MS.job);
    };
    if (!station) {
      startWork();
      return () => {
        stopped = true;
      };
    }
    x.stopAnimation((from) => {
      if (stopped) return;
      const distance = Math.abs(stationX - from);
      // The plant is watered from its right, looking left.
      setFacingLeft(station.held ? true : stationX < from);
      setOnRightHalf(false);
      setWalking(distance > 2);
      Animated.timing(x, {
        toValue: stationX,
        duration: Math.min(JOB_WALK_MAX_MS - 200, distance * JOB_WALK_MS),
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) startWork();
      });
    });
    return () => {
      stopped = true;
    };
    // A new walk for each piece of work, not for every change of the stage's size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, actRun]);

  // Sitting: walk over to the middle of the rug, then sit there a while. Only with legs to fold
  // (a child or grown-up); otherwise it does not.
  const [seatedRun, setSeatedRun] = useState(-1);
  const measured = width > 0;
  // Arrived at a thing to use (below).
  const [usingRun, setUsingRun] = useState(-1);
  const sitting =
    (act === 'sit' && seatedRun === actRun) ||
    ((act === 'read' || act === 'watchFish') && usingRun === actRun);
  useEffect(() => {
    if (act !== 'sit' || width === 0) return;
    let stopped = false;
    const done = (after: number) => {
      if (actTimer.current) clearTimeout(actTimer.current);
      actTimer.current = setTimeout(() => {
        actTimer.current = null;
        setAct(null);
      }, after);
    };
    if (!atTable) {
      done(0);
      return () => {
        stopped = true;
      };
    }
    const rug = Math.min(maxX, Math.max(minX, (width - spriteWidth) / 2));
    x.stopAnimation((from) => {
      if (stopped) return;
      const distance = Math.abs(rug - from);
      setFacingLeft(rug < from);
      setOnRightHalf(false);
      setWalking(distance > 2);
      Animated.timing(x, {
        toValue: rug,
        duration: Math.min(JOB_WALK_MAX_MS - 200, distance * JOB_WALK_MS),
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (!finished || stopped) return;
        setWalking(false);
        setSeatedRun(actRun);
        done(ACT_MS.sit);
      });
    });
    return () => {
      stopped = true;
    };
    // A new walk for each sit, not for every change of the stage's size (but once it has one: a cue
    // can come before the stage is measured).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, actRun, measured]);

  // A one-word message: dance or sing; for "밥" when full or "청소" with nothing to clean, an
  // answer instead of nothing (the care itself, when needed, comes from the server as an event).
  const canFeed = buddy.canFeed;
  const poops = buddy.poops;
  useEffect(() => {
    if (!cue || egg) return;
    const timer = setTimeout(() => {
      if (
        cue.kind === 'dance' ||
        cue.kind === 'sing' ||
        cue.kind === 'job' ||
        isHappening(cue.kind)
      )
        perform(cue.kind, true);
      else if (cue.kind !== 'feed' && cue.kind !== 'clean' && cue.kind !== 'work')
        startMood(cue.kind);
      else if (cue.kind === 'feed' && !canFeed) {
        perform('refuse', true);
        say('full');
      } else if (cue.kind === 'clean' && poops === 0 && !station) say('alreadyClean');
      else if (cue.kind === 'work' && station) perform('job', true);
    }, 0);
    return () => clearTimeout(timer);
    // Answer each cue once, with the state as it was when it came.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue]);

  // Care or growth takes priority over petting, dancing or singing. A new message does not:
  // "노래" from the other one is a message too, and asks for the song. Nor a new level after the
  // care that earned it: the work that care started goes on.
  useEffect(() => {
    if (!reaction || reaction.kind === 'message' || reaction.follows) return;
    const timer = setTimeout(() => {
      if (actTimer.current) clearTimeout(actTimer.current);
      actTimer.current = null;
      if (petTimer.current) clearTimeout(petTimer.current);
      petTimer.current = null;
      setAct(null);
      setPetted(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [reaction]);

  // The partner petted the buddy: it glows, and if this user did too just now, more so.
  useEffect(() => {
    if (!partnerPet || egg) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      partnerPetAt.current = now;
      startMood(now - myPetAt.current < CO_PET_MS ? 'coPet' : 'love');
    }, 0);
    return () => clearTimeout(timer);
    // One reaction per pet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerPet]);

  // A hiccup is three small hops, a start one big one.
  useEffect(() => {
    if (act !== 'hiccup' && act !== 'startle') return;
    const jump = (h: number, ms: number) =>
      Animated.sequence([
        Animated.timing(hop, { toValue: -h, duration: ms, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(hop, { toValue: 0, duration: ms, useNativeDriver: NATIVE_DRIVER }),
      ]);
    const move =
      act === 'startle'
        ? jump(18, 200)
        : Animated.sequence([jump(5, 110), jump(5, 110), jump(5, 110)]);
    move.start();
    return () => {
      move.stop();
      hop.setValue(0);
    };
  }, [act, actRun, hop]);

  // Little hops for a mood; a good night sleeps instead.
  useEffect(() => {
    if (!mood) return;
    const jump = (h: number, ms = 140) =>
      Animated.sequence([
        Animated.timing(hop, { toValue: -h, duration: ms, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(hop, { toValue: 0, duration: ms, useNativeDriver: NATIVE_DRIVER }),
      ]);
    const moves: Record<StageMood, Animated.CompositeAnimation | null> = {
      coPet: Animated.sequence([jump(16), jump(16)]),
      laugh: Animated.sequence(Array.from({ length: 4 }, () => jump(6, 90))),
      love: Animated.sequence([jump(10), jump(6)]),
      goodnight: null,
      cheer: Animated.sequence([jump(16), jump(16)]),
      comfort: jump(4, 220),
      morning: jump(12),
    };
    const move = moves[mood];
    move?.start();
    return () => {
      move?.stop();
      hop.setValue(0);
    };
  }, [mood, job, hop]);

  // Left alone, now and then a dance or a song.
  useEffect(() => {
    if (egg || settled || active || acting || petted || mood) return;
    // With the partner here too it is livelier: twice as often.
    const pace = partnerHere ? 0.5 : 1;
    const timer = setTimeout(
      () =>
        perform(
          pickIdleAct(
            job,
            guests ? (guests.split(',') as Guest[]) : [],
            atTable,
            darkSky,
            decor.window,
            uses ? (uses.split(',') as Use[]) : [],
          ),
        ),
      pace * (IDLE_ACT_MIN_MS + Math.random() * (IDLE_ACT_MAX_MS - IDLE_ACT_MIN_MS)),
    );
    return () => clearTimeout(timer);
  }, [
    egg,
    settled,
    active,
    acting,
    petted,
    mood,
    partnerHere,
    job,
    guests,
    atTable,
    darkSky,
    decor.window,
    uses,
    perform,
  ]);

  // Little hops while dancing, notes rising while singing.
  useEffect(() => {
    if (act !== 'dance' && act !== 'sing') return;
    const move =
      act === 'dance'
        ? Animated.loop(
            Animated.sequence([
              Animated.timing(hop, { toValue: -6, duration: 150, useNativeDriver: NATIVE_DRIVER }),
              Animated.timing(hop, { toValue: 0, duration: 150, useNativeDriver: NATIVE_DRIVER }),
            ]),
            { iterations: ACT_REPEATS },
          )
        : Animated.loop(
            Animated.sequence([
              Animated.timing(note, { toValue: 0, duration: 0, useNativeDriver: NATIVE_DRIVER }),
              Animated.timing(note, {
                toValue: 1,
                duration: ACT_MS.sing / ACT_REPEATS,
                useNativeDriver: NATIVE_DRIVER,
              }),
            ]),
            { iterations: ACT_REPEATS },
          );
    move.start();
    return () => {
      move.stop();
      hop.setValue(0);
      note.setValue(0);
    };
  }, [act, actRun, hop, note]);

  // A butterfly comes down onto the head and flies off again.
  useEffect(() => {
    if (act !== 'butterfly') return;
    const to = (toValue: number, easing: (value: number) => number) =>
      Animated.timing(flutter, {
        toValue,
        duration: BUTTERFLY_FLY_MS,
        easing,
        useNativeDriver: NATIVE_DRIVER,
      });
    const move = Animated.sequence([
      to(1, Easing.out(Easing.quad)),
      Animated.delay(ACT_MS.butterfly - 2 * BUTTERFLY_FLY_MS),
      to(2, Easing.in(Easing.quad)),
    ]);
    move.start();
    return () => {
      move.stop();
      flutter.setValue(0);
    };
  }, [act, actRun, flutter]);
  // A shower over: the window may show a rainbow after it.
  useEffect(() => {
    if (act !== 'rain') return;
    return () => setRainEnded((n) => n + 1);
  }, [act, actRun]);

  // Rain, snow or a shooting star outside: it goes over beside the window and turns to watch, under
  // its umbrella in the rain (the weather itself is drawn in the glass, weather.tsx). Beside, not in
  // front: a grown-up's head and umbrella would hide the glass.
  const glass = glassOf(decor, width, height, WALL_TOP);
  const watching = act !== null && WEATHER.includes(act);
  // Beside the window, on the side with more room: right of a window left of the middle, else left
  // of it. `onRight`: it stands right of the window (and turns left to look).
  const besideWindow = (window: NonNullable<typeof glass>) => {
    const onRight = window.left + window.width / 2 < width / 2;
    const beside = onRight ? window.left + window.width + 4 : window.left - spriteWidth - 4;
    return { onRight, spot: Math.min(maxX, Math.max(minX, beside)) };
  };
  useEffect(() => {
    if (!watching || !glass) return;
    let stopped = false;
    const { onRight, spot } = besideWindow(glass);
    x.stopAnimation((from) => {
      if (stopped) return;
      const distance = Math.abs(spot - from);
      setFacingLeft(spot < from);
      setOnRightHalf(spot + spriteWidth / 2 > width / 2);
      setWalking(distance > 2);
      Animated.timing(x, {
        toValue: spot,
        duration: Math.min(WINDOW_WALK_MAX_MS, distance * JOB_WALK_MS),
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (!finished || stopped) return;
        setWalking(false);
        // Turned to the window.
        setFacingLeft(onRight);
      });
    });
    return () => {
      stopped = true;
    };
    // A new walk for each shower or star, not for every change of the stage's size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, actRun]);

  // Using a thing in the room: walk over (under the shelf, beside the window, up to the goldfish),
  // turn to it, and use it for a while. At the window a guest comes after the wait. Without the
  // thing (cued by the art preview) or legs to walk on (a baby), it does not.
  const using = isUse(act) && usingRun === actRun;
  // A new run of bubbles each time it starts watching the goldfish.
  const [fishRun, setFishRun] = useState(0);
  useEffect(() => {
    if (!isUse(act) || width === 0) return;
    let stopped = false;
    const done = (after: number, then?: () => void) => {
      if (actTimer.current) clearTimeout(actTimer.current);
      actTimer.current = setTimeout(() => {
        actTimer.current = null;
        setAct(null);
        then?.();
      }, after);
    };
    const at = thingsAt(decor, width, height, plantRoom);
    const window = act === 'waitGuest' && glass ? besideWindow(glass) : null;
    // Where it stands, and which way it looks once there.
    const target =
      act === 'waitGuest'
        ? windowGuests.length > 0 && window
          ? { spot: window.spot, left: window.onRight }
          : null
        : act === 'musicBox' && decor.musicBox
          ? at.musicBox
          : act === 'read' && decor.books
            ? at.books
            : act === 'watchFish' && decor.fish
              ? at.fish
              : null;
    if (!atTable || target === null) {
      done(0);
      return () => {
        stopped = true;
      };
    }
    const place =
      typeof target === 'number'
        ? {
            spot: Math.min(maxX, Math.max(minX, target - spriteWidth / 2)),
            left: target < width / 2,
          }
        : target;
    x.stopAnimation((from) => {
      if (stopped) return;
      const distance = Math.abs(place.spot - from);
      setFacingLeft(place.spot < from);
      setOnRightHalf(place.spot + spriteWidth / 2 > width / 2);
      setWalking(distance > 2);
      Animated.timing(x, {
        toValue: place.spot,
        duration: Math.min(JOB_WALK_MAX_MS - 200, distance * JOB_WALK_MS),
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (!finished || stopped) return;
        setWalking(false);
        setFacingLeft(place.left);
        setUsingRun(actRun);
        if (act === 'watchFish') setFishRun((n) => n + 1);
        // At the window, one of the room's guests comes along.
        done(
          ACT_MS[act],
          act === 'waitGuest' ? () => perform(pick(windowGuests), true) : undefined,
        );
      });
    });
    return () => {
      stopped = true;
    };
    // A new walk for each use, not for every change of the stage's size (once it has one).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, actRun, measured]);
  // Dancing to the music box once it plays.
  const musicDance = act === 'musicBox' && using;
  useEffect(() => {
    if (!musicDance) return;
    const move = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: -6, duration: 150, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(hop, { toValue: 0, duration: 150, useNativeDriver: NATIVE_DRIVER }),
        Animated.delay(150),
      ]),
    );
    move.start();
    return () => {
      move.stop();
      hop.setValue(0);
    };
  }, [musicDance, hop]);

  // Work done (by either of them) is shown at the station; the gardener likes the tidy plant.
  useEffect(() => {
    // Already off to work (this side's own tap): no need to start again.
    if (reaction?.kind !== 'worked' || !station || act === 'job') return;
    const timer = setTimeout(
      () => perform('job', true, job === 'GARDENER' ? 'gardenerCleaned' : undefined),
      0,
    );
    return () => clearTimeout(timer);
    // Once per piece of work done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction?.id]);

  const wantsFood = buddy.hungry && !eating;
  // Hungry, it thinks of food over its head from the egg on (no words needed), and a tap on it
  // feeds it. Asleep, it dreams of it (DREAM_FOOD) with its zzz beside, so a sleeping buddy can be
  // seen to be hungry and fed too.
  const thinking = wantsFood;
  const thought = usePresence(thinking, THOUGHT_POP_MS);
  const hasPoop = buddy.poops > 0;
  const nudge = useBob(wantsFood, hasPoop);

  // A word back for care, once grown.
  useEffect(() => {
    let next: Line | null = null;
    if (active?.kind === 'fed' && active.phase === 'after')
      next = job === 'CHEF' ? 'chefFed' : pick(['thanks', 'yummy'] as const);
    else if (active?.kind === 'cleaned')
      next = job === 'GARDENER' ? 'gardenerCleaned' : pick(['refreshed', 'digestion'] as const);
    else if (active?.kind === 'together') next = 'together';
    else if (active?.kind === 'here') next = 'bothHere';
    else if (active?.kind === 'joined') next = 'friendCame';
    else if (active?.kind === 'jobChanged' && active.phase === 'after' && job)
      next = NEW_JOB_LINE[job];
    if (!next) return;
    const say_ = next;
    const timer = setTimeout(() => say(say_), 0);
    return () => clearTimeout(timer);
  }, [active, job, say]);

  // Its oranges out, a word about them.
  useEffect(() => {
    if (fruiting === 0) return;
    const timer = setTimeout(() => say('oranges'), 1400);
    return () => clearTimeout(timer);
  }, [fruiting, say]);

  useEffect(() => {
    if (!buddy.hungry || sleeping) return;
    const timer = setTimeout(() => say('hungry'), 600);
    return () => clearTimeout(timer);
  }, [buddy.hungry, sleeping, say]);

  // The egg rocks in small, stepped moves now and then.
  const tilt = useEggRock(egg);

  // Movement that goes with a reaction (use-reaction-motion.ts).
  const { leap, flash, glow, burst } = useReactionMotion(reaction);
  const [rise] = useState(() => Animated.add(hop, leap));

  // Notes over the stage: the next goal after growing, and when the job can be changed.
  const notice = useStageNotices(reaction, buddy);
  const noticeShown = notice && !dream && !leaving ? notice : null;
  // Reaching the top level (top-level.tsx): once for each such reaction, over after the notes.
  const { topOn, topId, topNotes, topMs } = useTopLevel(reaction, job, onOpenMail);

  useEffect(
    () => () => {
      if (petTimer.current) clearTimeout(petTimer.current);
      if (actTimer.current) clearTimeout(actTimer.current);
      if (moodTimer.current) clearTimeout(moodTimer.current);
    },
    [],
  );

  // Petting: glad (and a thank-you once grown), or a dance, or a song.
  const pet = () => {
    // Timer refs lock immediately, including taps before React renders the new pose. The glow of
    // the partner's pet does not lock: petting along with them is the point.
    const glowing = mood === 'love';
    if (
      egg ||
      busy ||
      active ||
      acting ||
      petted ||
      (mood && !glowing) ||
      actTimer.current ||
      petTimer.current
    )
      return;
    const now = Date.now();
    myPetAt.current = now;
    onPet?.();
    if (now - partnerPetAt.current < CO_PET_MS) return startMood('coPet');
    if (glowing) return;
    const roll = Math.random();
    if (roll < 0.3) return perform('dance');
    if (roll < 0.6) return perform('sing');
    setPetted(true);
    say('thanks');
    petTimer.current = setTimeout(() => {
      petTimer.current = null;
      setPetted(false);
    }, PET_MS);
  };

  const pose = buddyPose({
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
  });

  // While evolving, the old and new looks take turns quickly.
  const previousStage = STAGE_ORDER[Math.max(0, STAGE_ORDER.indexOf(buddy.stage) - 1)];
  // Dressed for the season or its job, but not in the middle of growing. Changing jobs, the old
  // job's look and the new one's take turns the same way.
  const dressed = evolving
    ? changingJob
      ? dressedFrame(
          buddy.stage,
          tick % 2 === 0 ? 'idle' : pose,
          tick % 2 === 0 ? jobs.before : job,
          null,
        )
      : buddyFrame(tick % 2 === 0 ? previousStage : buddy.stage, tick % 2 === 0 ? 'idle' : pose)
    : dressedFrame(buddy.stage, pose, job, season);
  const frame = sitting ? seated(buddy.stage, dressed) : dressed;

  const gridWidth = frame[0].length;
  // Resting on the head while it is there.
  const butterfly = act === 'butterfly' && buddy.stage !== 'EGG' ? butterflyAt(buddy.stage) : null;

  // A writer's love, love in Valentine's week, and a pet shared by both show a big heart.
  const bigHeart =
    mood === 'coPet' ||
    (mood === 'love' && (job === 'WRITER' || season === 'VALENTINE')) ||
    active?.kind === 'joined';
  const showHeart =
    petted ||
    (act === 'job' && job === 'WRITER') ||
    mood === 'love' ||
    mood === 'coPet' ||
    (eating && active?.phase === 'after') ||
    active?.kind === 'together' ||
    active?.kind === 'here' ||
    active?.kind === 'joined';
  const sparkling = active?.kind === 'cleaned';
  const bursting = (active?.kind === 'evolved' || changingJob) && active.phase === 'after';
  const levelingUp = active?.kind === 'levelUp' || active?.kind === 'maxLevel';

  const bowlFull = !buddy.hungry || eating;
  const table = usePresence(atTable && eating, TABLE_AWAY_MS);
  // While the table sinks away it shows the empty bowl, as at the end of the meal.
  const [tableFull, setTableFull] = useState(active?.phase === 'main');
  if (eating && tableFull !== (active?.phase === 'main')) setTableFull(active?.phase === 'main');
  const { rice, riceSparkle } = useRice(bowlFull);

  // Each poop keeps its spot on the floor (use-care.ts).
  const { slots, flyingOff, tapSlot, doneLeaving } = usePoopSlots(buddy.poops);
  // At work the cook sways to the pot and the DJ nods.
  const workSway = atWork && job === 'CHEF' ? (tick % 2 === 0 ? -scale : 0) : 0;
  const workNod = atWork && job === 'DJ' && tick % 2 === 0 ? scale : 0;
  // Shaking its head at a full bowl, it sways a pixel each way.
  const headShake = act === 'refuse' ? (tick % 2 === 0 ? -scale : scale) : 0;
  // Dancing and looking around turn the buddy left and right.
  const flipped =
    act === 'dance' || act === 'lookAround' || musicDance ? tick % 2 === 0 : facingLeft;

  // The book from the shelf, open in front of it as it reads.
  const book: Layer | null =
    act === 'read' && using
      ? {
          frame: OPEN_BOOK,
          row: frame.length - BOOK_ABOVE_FEET,
          col: Math.floor((gridWidth - OPEN_BOOK[0].length) / 2),
        }
      : null;
  // The umbrella over it as it watches the rain at the window.
  const umbrella = act === 'rain' && buddy.stage !== 'EGG' ? umbrellaFor(buddy.stage) : null;
  const front = evolving ? null : seasonFront(buddy.stage, season);

  const feed = () => {
    if (busy) return;
    if (!buddy.canFeed) {
      // Not hungry: a shake of the head.
      if (!egg) perform('refuse');
      say('full');
      return;
    }
    onFeed();
  };
  const clean = (slot: number) => {
    if (!buddy.canClean || busy) return;
    tapSlot(slot);
    onClean();
  };
  // The room's toys: the ball bounces out and it dances; the music box plays and it sings along.
  const play = (next: 'dance' | 'sing') => {
    if (egg || leaving || active) return;
    perform(next, true);
  };
  // A tap on a thing in the room (stage-decor.tsx): the buddy notices. At the window a guest drops
  // by, if the room has grown any, or it looks out at the sky; the clock gives it a start; on the rug
  // a child or grown-up comes and sits down (a baby has no legs to fold); a plant or a portrait gets a
  // word (from a child up, like every word).
  const touchProp = (prop: RoomProp) => {
    if (egg || leaving || active || dream) return;
    if (prop === 'window') {
      if (isGuest(act)) return say(act);
      const atWindow = decor.guests.filter((guest) => !isFloorPasser(guest));
      if (atWindow.length > 0) return perform(pick(atWindow), true);
      const sky = skyAt(now.getHours());
      // Around the full moon the night sky has a round one.
      return perform(
        'lookAround',
        true,
        sky === 'night' && isFullMoon(now) ? 'windowFullMoon' : WINDOW_LINE[sky],
      );
    }
    if (prop === 'clock') return perform('startle', true, 'clock');
    if (prop === 'rug') {
      // Already there: it stays sitting.
      if (atTable && act !== 'sit') perform('sit', true);
      return;
    }
    say(prop);
  };
  // A grown-up's station: a tap sends it off to work there (EXP once an hour, the server decides).
  const work = () => {
    if (busy) return;
    onWork();
    perform('job', true);
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[
        bare ? null : [styles.stage, { borderColor: colors.stageLine }],
        { height, backgroundColor: colors.stage },
      ]}
    >
      <StageHeader
        buddy={buddy}
        levelingUp={levelingUp}
        dream={dream}
        cornerButton={cornerButton}
        corners={corners}
        onOpenDetail={onOpenDetail}
      />

      <View
        style={[
          styles.floor,
          { height: FLOOR, backgroundColor: colors.stageFloor, borderTopColor: colors.stageLine },
        ]}
      />

      <WallDecor
        decor={decor}
        floor={FLOOR}
        top={WALL_TOP}
        width={width}
        height={height}
        stationRight={stationRight}
        plantRoom={plantRoom}
        guest={isGuest(act) ? act : null}
        run={actRun}
        tick={tick}
        singing={act === 'sing' || musicDance}
        dancing={act === 'dance'}
        reading={book !== null}
        fishRun={fishRun}
        rainEnded={rainEnded}
        weather={watching ? (act as 'rain' | 'snow' | 'shootingStar') : null}
        weatherMs={act ? ACT_MS[act] : 0}
        onToy={() => play('dance')}
        onMusic={() => play('sing')}
        onProp={touchProp}
        now={now}
        lit={lampLit}
        onLamp={setLampOn}
      />
      {station?.behind ? (
        <StationBehind behind={station.behind} job={job} cell={cell} jobAtMount={jobAtMount} />
      ) : null}
      {corner ? (
        <View
          style={[
            styles.poop,
            { bottom: FLOOR - 2 - (corner.sink ?? 0) * scale * corner.size, right: 8 },
          ]}
        >
          <Tappable kind="sway" shine label={t('buddy.room.corner')}>
            <PixelSprite
              frame={corner.frame}
              palette={corner.palette ?? PROP_PALETTE}
              scale={scale * corner.size}
            />
          </Tappable>
        </View>
      ) : decor.plant ? (
        <View style={[styles.poop, { bottom: FLOOR - 2, right: 8 }]}>
          <Tappable
            kind="sway"
            shine
            label={t('buddy.room.plant')}
            onTap={() => touchProp('plant')}
          >
            <Plant
              key={fruiting}
              tier={decor.plant}
              kind={decor.plantKind}
              scale={decor.plantScale}
              sprout={fruiting > 0}
            />
          </Tappable>
        </View>
      ) : null}

      {atTable ? null : (
        <Bowl
          bowlRight={bowlRight}
          wantsFood={wantsFood}
          nudge={nudge}
          riceSparkle={riceSparkle}
          feed={feed}
          busy={busy}
          kind={decor.bowl}
          rice={rice}
        />
      )}

      {companionEgg ? (
        <View style={[styles.poop, { bottom: FLOOR - 2, right: poopRight + 4 }]}>
          <PixelSprite frame={buddyFrame('EGG', 'idle')} palette={BUDDY_PALETTE} scale={3} smooth />
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.buddy,
          {
            bottom: FLOOR - scale - workNod - (sitting ? SIT_ROWS * scale : 0),
            left: workSway + headShake,
            transform: [
              { translateX: x },
              { translateY: rise },
              {
                rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }),
              },
            ],
          },
        ]}
      >
        {topOn ? (
          <TopLevelLight
            key={topId}
            width={spriteWidth}
            height={spriteHeight}
            stageHeight={height}
            ms={topMs}
          />
        ) : null}
        <BuddyMarks
          evolving={evolving}
          glowSize={glowSize}
          spriteWidth={spriteWidth}
          spriteHeight={spriteHeight}
          glow={glow}
          levelingUp={levelingUp}
          showHeart={showHeart}
          bigHeart={bigHeart}
          thought={thought}
          thinking={thinking}
          onRightHalf={onRightHalf}
          nudge={nudge}
          sleeping={sleeping}
          active={active}
          act={act}
          tick={tick}
          sparkling={sparkling}
          note={note}
          bursting={bursting}
          burst={burst}
        />
        <BuddyFigure
          leaving={leaving}
          gridWidth={gridWidth}
          scale={scale}
          flipped={flipped}
          behind={behind}
          evolving={evolving}
          thinking={thinking}
          feed={feed}
          pet={pet}
          buddyName={buddy.name}
          frame={frame}
          front={front}
          umbrella={umbrella}
          book={book}
          butterfly={butterfly}
          flutter={flutter}
          spriteWidth={spriteWidth}
          spriteHeight={spriteHeight}
          tick={tick}
        />
        {/* In front of everything with the buddy, the umbrella too. */}
        {line && !evolving ? (
          <SpeechBubble
            text={t(`buddy.say.${line}`)}
            side={onRightHalf ? 'left' : 'right'}
            above={spriteHeight * 0.85}
          />
        ) : null}
      </Animated.View>
      {station ? (
        <StationFront
          station={station}
          job={job}
          cell={cell}
          jobAtMount={jobAtMount}
          atWork={atWork}
          tick={tick}
        />
      ) : null}
      {atWork && station?.held ? (
        <StationHeld
          held={station.held}
          scale={scale}
          workSway={workSway}
          spriteWidth={spriteWidth}
          spriteHeight={spriteHeight}
          x={x}
          rise={rise}
          tick={tick}
        />
      ) : null}

      {thinking ? (
        <ThoughtTap
          scale={scale}
          workNod={workNod}
          sitting={sitting}
          frame={frame}
          onRightHalf={onRightHalf}
          workSway={workSway}
          x={x}
          feed={feed}
        />
      ) : null}

      {table.present ? (
        <MealTable
          workSway={workSway}
          spriteWidth={spriteWidth}
          table={table}
          eating={eating}
          x={x}
          full={eating ? active?.phase === 'main' : tableFull}
          kind={decor.bowl}
        />
      ) : null}

      {station ? (
        <StationTap station={station} cell={cell} work={work} busy={busy} buddyName={buddy.name} />
      ) : null}

      {isGuest(act) && isFloorPasser(act) && width > 0 ? (
        <Passer key={actRun} kind={act} width={width} scale={3} tick={tick} />
      ) : null}
      {active?.kind === 'maxLevel' && width > 0 ? (
        <RoomSparkle width={width} height={height - FLOOR} tick={tick} />
      ) : null}

      {/* In front of the buddy, so one by its feet can still be tapped away. */}
      <Poops
        slots={slots}
        poopRight={poopRight}
        nudge={nudge}
        clean={clean}
        busy={busy}
        flyingOff={flyingOff}
        doneLeaving={doneLeaving}
      />

      {/* The light of the hour over the room and the buddy (room-light.tsx). */}
      {!dream ? (
        <RoomLight
          hour={roomHour(now.getHours())}
          width={width}
          height={height}
          floorTop={height - FLOOR}
          glass={glass}
          lamp={decor.lamp && lampLit ? lampShadeAt(width, height, FLOOR, plantRoom) : null}
          fullMoon={isFullMoon(now)}
          station={station ? stationLight(station, cell, height) : null}
          dark={colorMode === 'dark'}
        />
      ) : null}
      {topOn && width > 0 ? <Feathers key={`f${topId}`} width={width} height={height} /> : null}
      {topOn ? <TopLevelNotes key={`n${topId}`} notes={topNotes} /> : null}
      {noticeShown ? <StageNotice notice={noticeShown} /> : null}

      {/* The evolution's quick flash as the new look settles, over the whole stage. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
      {cornerButton ? <View style={styles.corner}>{cornerButton}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Same as BuddyScene's frame (the demo uses the stage alone).
  stage: {
    borderBottomWidth: 2,
    overflow: 'hidden',
  },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
  },
  poop: {
    position: 'absolute',
  },
  buddy: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    top: 4,
    right: 6,
    zIndex: 2,
  },
  flash: {
    backgroundColor: '#FFFFFF',
    pointerEvents: 'none',
  },
});
