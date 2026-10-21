import { randomUUID } from 'expo-crypto';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BuddyGift, BuddyJob, BuddyStage, BuddyView } from '@/features/buddy/api';
import type { Mood } from '@/features/buddy/chat-words';
import { BuddyDream, DREAM_CUTS } from '@/features/buddy/components/buddy-dream';
import { BuddyScene } from '@/features/buddy/components/buddy-scene';
import { BuddySheet } from '@/features/buddy/components/buddy-sheet';
import { rewardIcon } from '@/features/buddy/components/buddy-guide';
import { type Reward, REWARDS, SEASONAL } from '@/features/buddy/components/stage-decor';
import type { Cue } from '@/features/buddy/components/buddy-stage';
import { giftFor, ITEMS, LETTERS, RADIO } from '@/features/buddy/gifts';
import { JOB_ICON, JOB_ORDER } from '@/features/buddy/jobs';
import { nextFullMoon } from '@/features/buddy/moon';
import { dressedFrame, type Season, SEASONS, seasonOn } from '@/features/buddy/pixel/looks';
import { PixelSprite } from '@/features/buddy/pixel/pixel-sprite';
import { BUDDY_PALETTE, POSES_IN_ORDER } from '@/features/buddy/pixel/sprites';
import type { FishStyle } from '@/features/buddy/pixel/room-things';
import type { Reaction, ReactionKind } from '@/features/buddy/reactions';
import { BuddyGiftMessage } from '@/features/chat/components/buddy-gift-message';
import type { AlbumEntry } from '@/features/room/api';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

// For making the buddy's art (docs/fun-improvements.md, 그림 작업): the stage on its own, with a button for each
// thing it can do, so a new frame or prop can be seen at once instead of waiting for it to happen.
// Not part of the app: it only opens in development builds, and nothing links to it.

const STAGES: BuddyStage[] = ['EGG', 'BABY', 'CHILD', 'ADULT'];
const LEVEL: Record<BuddyStage, number> = { EGG: 1, BABY: 3, CHILD: 5, ADULT: 10 };
const HAPPENINGS = [
  'hiccup',
  'startle',
  'lookAround',
  'yawn',
  'butterfly',
  'rain',
  'snow',
  'shootingStar',
  'snail',
  'sparrow',
  'catTail',
  'train',
  'robot',
  'kitten',
  'vacuum',
  'ladybug',
  'dragonfly',
  'swallow',
  'owl',
  'squirrel',
  'sit',
  'musicBox',
  'waitGuest',
  'watchFish',
  'read',
] as const;
const MOODS: Mood[] = ['laugh', 'love', 'cheer', 'comfort', 'goodnight', 'morning'];
const REACTIONS: ReactionKind[] = [
  'message',
  'fed',
  'cleaned',
  'pooped',
  'worked',
  'levelUp',
  'maxLevel',
  'evolved',
  'jobChanged',
  'together',
  'here',
  'joined',
];

// The level grid: every level up to the top, and what comes at each besides the room's rewards
// (docs/PROJECT.md, 성장). server: BuddyRules.BABY_AT, CHILD_AT, ADULT_AT, JOB_AT, JOB_CHANGE_FROM, MAX_LEVEL
const MAX_LEVEL = 60;
const MILESTONES: Record<number, string> = {
  3: '🐣 BABY',
  5: '🌱 CHILD',
  10: '🌸 ADULT',
  12: '💼 job settled',
  20: '🔄 job change',
  30: '🔄 job change',
  40: '🔄 job change',
  50: '🔄 job change',
  60: '🎓 top · own way',
};
const REWARD_AT = new Map(REWARDS.map((entry) => [entry.level, entry.reward]));
// Each stage's band on the grid.
const STAGE_TINT: Record<BuddyStage, string> = {
  EGG: '#F4ECDC',
  BABY: '#FBE4D8',
  CHILD: '#E4F0DD',
  ADULT: '#E1EBF4',
};
const stageAt = (level: number): BuddyStage =>
  level >= LEVEL.ADULT
    ? 'ADULT'
    : level >= LEVEL.CHILD
      ? 'CHILD'
      : level >= LEVEL.BABY
        ? 'BABY'
        : 'EGG';

// As the server has it (BuddyRules.canChangeJob, jobChangeAt): once in each of 20–29, 30–39, 40–49 and
// 50–59 (`changedAt`: the level of the last change), any time from the top, and a first job any time.
function jobChange(level: number, job: BuddyJob | null, changedAt: number | null) {
  const window = (l: number) => Math.floor(l / 10);
  const can =
    level >= 12 &&
    (!job ||
      level >= MAX_LEVEL ||
      (level >= 20 && (changedAt === null || window(changedAt) < window(level))));
  const at =
    level >= 12 && !can ? Math.min(MAX_LEVEL, Math.max(20, (window(level) + 1) * 10)) : null;
  return { canChangeJob: can, jobChangeAt: at };
}
// The room's window, lamp and light by the hour: morning, day, dusk, night.
const HOURS = [7, 12, 18, 22];
// Days for the room's seasonal things (stage-decor.tsx, SEASONAL): the New Year (kotatsu, mochi),
// spring (petals), summer (wind chime), autumn (dragonflies).
const DATES = ['01-01', '04-01', '08-01', '10-01'];
// The coming full moon's date, with its year (moon.ts): the window's moon is round then, at night.
function fullMoonDate(): string {
  const full = nextFullMoon(new Date());
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${full.getFullYear()}-${pad(full.getMonth() + 1)}-${pad(full.getDate())}`;
}

function buddyOf(
  stage: BuddyStage,
  job: BuddyJob | null,
  hungry: boolean,
  poops: number,
  level: number | null,
  jobChangedAt: number | null = null,
): BuddyView {
  const shown = level ?? LEVEL[stage];
  const adultJob = stage === 'ADULT' ? job : null;
  return {
    name: 'Preview',
    exp: 0,
    level: shown,
    stage,
    levelProgress: 0.4,
    fullness: hungry ? 10 : 100,
    poops,
    hungry,
    canFeed: hungry,
    canClean: poops > 0,
    // As the server would have it (BuddyRules.GRADUATE_AT): the details and the top level's letter
    // offer going its own way.
    grown: shown >= MAX_LEVEL,
    talkedToday: [],
    togetherToday: false,
    job: adultJob,
    leaning: null,
    ...jobChange(shown, adultJob, jobChangedAt),
  };
}

export default function PreviewRoute() {
  // Never in a release build.
  if (!__DEV__) return <Redirect href="/" />;
  return <Preview />;
}

function Chip({
  label,
  onPress,
  active = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.chip,
        { borderColor: active ? colors.accent : colors.border, backgroundColor: colors.surface },
      ]}
    >
      <Text style={{ color: colors.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// "open all" / "fold all" under the stage: every group follows the latest press (a new `run`).
const FoldAll = createContext({ open: false, run: 0 });

// What the buddy says and hands over in the chat at work (docs/fun-improvements.md, 직업 이벤트): every
// thing a barista, a cook or a gardener makes (each with another opening word), every DJ show, and
// a writer's word about its letter (the letters themselves are in the mailbox with &gifts=all).
const GIFT_SAMPLES = [
  ...(['BARISTA', 'CHEF', 'GARDENER'] as const).flatMap((job) =>
    ITEMS[job].map((_, i) => giftFor(job, i * (ITEMS[job].length + 1))),
  ),
  ...RADIO.map((_, i) => giftFor('DJ', i)),
  giftFor('WRITER', 0),
];

function GiftMessages() {
  const { t } = useTranslation();
  return (
    <View style={styles.giftMessages}>
      {GIFT_SAMPLES.map((gift, i) => (
        <BuddyGiftMessage
          key={i}
          gift={gift}
          buddyName="Preview"
          toName={t('chat.guestName')}
          onOpenMail={() => {}}
        />
      ))}
    </View>
  );
}

// Folded until its title is tapped, so the stage above stays in view.
function Group({
  title,
  startOpen = false,
  children,
}: {
  title: string;
  startOpen?: boolean;
  children: ReactNode;
}) {
  const colors = useColors();
  const all = useContext(FoldAll);
  const [open, setOpen] = useState(all.open || startOpen);
  const [run, setRun] = useState(all.run);
  if (all.run !== run) {
    setRun(all.run);
    setOpen(all.open);
  }
  return (
    <View style={styles.group}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" hitSlop={6}>
        <Text style={[styles.title, { color: colors.textMuted }]}>
          {open ? '▾' : '▸'} {title}
        </Text>
      </Pressable>
      {open ? <View style={styles.row}>{children}</View> : null}
    </View>
  );
}

// Every level up to the top, ten to a row and tinted by stage: a ring where something happens (a new
// stage, the job, a chance to change it, the top), a dot where the room gets a reward. Under it, what
// the chosen level brings, and a step either way.
function LevelGrid({ level, onChoose }: { level: number; onChoose: (level: number) => void }) {
  const colors = useColors();
  const reward = REWARD_AT.get(level);
  const notes = [MILESTONES[level], reward ? `🎁 ${reward}` : null].filter(Boolean);
  return (
    <View style={styles.levels}>
      <View style={styles.grid}>
        {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((l) => {
          const chosen = l === level;
          return (
            <View key={l} style={styles.slot}>
              <Pressable
                onPress={() => onChoose(l)}
                accessibilityRole="button"
                accessibilityLabel={`Lv.${l}`}
                style={[
                  styles.cell,
                  {
                    backgroundColor: chosen ? colors.accent : STAGE_TINT[stageAt(l)],
                    borderColor: MILESTONES[l] ? colors.accent : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.cellText, { color: chosen ? colors.onAccent : '#4A3B33' }]}>
                  {l}
                </Text>
                {REWARD_AT.has(l) ? (
                  <View
                    style={[styles.dot, { backgroundColor: chosen ? colors.onAccent : '#B9A48F' }]}
                  />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={styles.levelBar}>
        <Chip label="‹" onPress={() => onChoose(Math.max(1, level - 1))} />
        <Text style={[styles.levelNote, { color: colors.text }]} numberOfLines={2}>
          <Text style={styles.levelName}>Lv.{level}</Text> {stageAt(level)}
          {notes.length > 0 ? ` · ${notes.join(' · ')}` : ''}
        </Text>
        <Chip label="›" onPress={() => onChoose(Math.min(MAX_LEVEL, level + 1))} />
      </View>
      <Text style={[styles.legend, { color: colors.textMuted }]}>
        ring: stage · job · job change · top — dot: reward — tint: EGG / BABY / CHILD / ADULT
      </Text>
    </View>
  );
}

// Only in their season, or only at night (stage-decor.tsx, SEASONAL and decorFor).
const NIGHT_ONLY: readonly Reward[] = ['firefly', 'owl'];
const pad = (n: number) => String(n).padStart(2, '0');
function whenShown(reward: Reward): string | null {
  if (reward in SEASONAL) {
    const [[fm, fd], [tm, td]] = SEASONAL[reward as keyof typeof SEASONAL];
    return `🗓 ${pad(fm)}/${pad(fd)}–${pad(tm)}/${pad(td)}`;
  }
  return NIGHT_ONLY.includes(reward) ? '🌙 night' : null;
}

// The guide's list of the room's rewards, but for every level: what comes at each (with its picture,
// as in the guide), which levels bring no thing (a new stage, the job and its chances, the top), and
// which come only in their season or at night. The buddy's level is marked; a tap goes there.
function RewardTable({ level, onChoose }: { level: number; onChoose: (level: number) => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={styles.rewards}>
      <Text style={[styles.legend, { color: colors.textMuted }]}>
        {REWARDS.length} rewards · {MAX_LEVEL - REWARDS.length} levels without one · dimmed: not
        reached yet
      </Text>
      {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((l) => {
        const reward = REWARD_AT.get(l);
        const when = reward ? whenShown(reward) : null;
        const here = l === level;
        return (
          <Pressable
            key={l}
            onPress={() => onChoose(l)}
            accessibilityRole="button"
            style={[
              styles.rewardRow,
              {
                backgroundColor: here ? colors.bubbleMine : 'transparent',
                borderColor: here ? colors.accent : colors.border,
                opacity: l > level ? 0.45 : 1,
              },
            ]}
          >
            <Text style={[styles.rewardLevel, { color: colors.text }]}>Lv.{l}</Text>
            <View style={styles.rewardIcon}>{reward ? rewardIcon(reward, 24) : null}</View>
            <Text style={[styles.rewardName, { color: reward ? colors.text : colors.textMuted }]}>
              {reward ? t(`buddy.reward.${reward}`) : (MILESTONES[l] ?? '—')}
            </Text>
            {when ? (
              <Text style={[styles.rewardWhen, { color: colors.accent }]}>{when}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Every pose of the chosen stage side by side, still and large, so the faces can be compared at a
// glance, dressed as on the stage (the job's or the season's look).
function PoseSheet({
  stage,
  job,
  season,
}: {
  stage: BuddyStage;
  job: BuddyJob | null;
  season: Season | null;
}) {
  const colors = useColors();
  return (
    <Group title="poses">
      {POSES_IN_ORDER.map((pose) => (
        <View key={pose} style={[styles.pose, { backgroundColor: colors.stage }]}>
          <PixelSprite
            frame={dressedFrame(stage, pose, stage === 'ADULT' ? job : null, season)}
            palette={BUDDY_PALETTE}
            scale={stage === 'ADULT' ? 4 : 5}
            smooth
          />
          <Text style={[styles.poseName, { color: colors.textMuted }]}>{pose}</Text>
        </View>
      ))}
    </Group>
  );
}

// Buddies gone their own way, for the memory album (&album=): two with jobs, one without.
const PAST_BUDDIES: AlbumEntry[] = (
  [
    ['Mochi', 'GARDENER'],
    ['Dango', 'BARISTA'],
    ['Kinako', null],
  ] as const
).map(([name, job], i) => ({
  name,
  bornAt: `2026-0${i + 1}-01T00:00:00Z`,
  graduatedAt: `2026-0${i + 2}-0${i + 3}T00:00:00Z`,
  job,
}));

// Whose gifts the preview's are: mine.
const PREVIEW_ME = 'preview-me';
const EVERY_LETTER: BuddyGift[] = LETTERS.map((_, pick) => ({
  id: `letter-${pick}`,
  to: PREVIEW_ME,
  job: 'WRITER',
  pick,
  at: new Date().toISOString(),
}));

// A link can open it on a scene, for taking pictures of it (README):
// /preview?scene=bath, ?scene=bath&season=CHRISTMAS (snowing), ?scene=cut2 (a cut of the dream),
// ?stage=CHILD&level=8 (the room at that level), &hour=22 (the room at night), &job=none (a grown-up
// before its job), &detail=1 (its details open, as from its name), &album=2 (that many buddies gone
// their own way, in the memory album by the hot spring's button), &date=01-01 (the seasonal things
// of that day), &cue=owl (a happening or a guest, two seconds in), &leave=1 (it goes its own way,
// two seconds in), &guest=7 (a guest with that many days left: the mailbox's letters for it),
// &push=off or needsInstall (web: notifications not on, a letter about it), &gifts=all (every letter a
// writer writes, in the mailbox; otherwise a writer's station brings one, as in the room).
function Preview() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    scene?: string;
    season?: string;
    stage?: string;
    level?: string;
    hour?: string;
    job?: string;
    detail?: string;
    album?: string;
    guest?: string;
    push?: string;
    date?: string;
    cue?: string;
    leave?: string;
    gifts?: string;
  }>();
  const linkedCut = params.scene?.startsWith('cut') ? Number(params.scene.slice(3)) - 1 : null;
  const linkedSeason = SEASONS.find((s) => s === params.season);
  const { height: windowHeight } = useWindowDimensions();
  const [stage, setStage] = useState<BuddyStage>(
    STAGES.find((s) => s === params.stage) ??
      (params.level ? stageAt(Number(params.level)) : 'ADULT'),
  );
  // Overrides the level the stage implies (null: the stage's first level).
  const [level, setLevel] = useState<number | null>(params.level ? Number(params.level) : null);
  const [job, setJob] = useState<BuddyJob | null>(
    params.job === 'none' ? null : (JOB_ORDER.find((j) => j === params.job) ?? 'CHEF'),
  );
  // The level its job was last changed at, for when it may be changed again (null: never).
  const [jobChangedAt, setJobChangedAt] = useState<number | null>(null);
  // The memory album: the link's (&album=), and each buddy that goes its own way here.
  const [album, setAlbum] = useState(() => PAST_BUDDIES.slice(0, Number(params.album ?? 0)));
  const shownLevel = level ?? LEVEL[stage];
  const goTo = (next: number) => {
    setStage(stageAt(next));
    setLevel(next);
  };
  const leave = () => {
    // Only a hatched buddy goes its own way (an egg has nothing to take along).
    if (stage !== 'EGG') {
      const now = new Date().toISOString();
      setAlbum((list) => [
        ...list,
        { name: 'Preview', bornAt: now, graduatedAt: now, job: stage === 'ADULT' ? job : null },
      ]);
    }
    setStage('EGG');
    setLevel(null);
    setJobChangedAt(null);
  };
  const [hungry, setHungry] = useState(false);
  const [poops, setPoops] = useState(0);
  const [cue, setCue] = useState<Cue | null>(null);
  // A happening named in the link (&cue=owl), shortly after the stage is up: it ignores what was
  // asked before it mounted.
  const linkedCue = HAPPENINGS.find((h) => h === params.cue);
  useEffect(() => {
    if (!linkedCue) return;
    const timer = setTimeout(() => setCue({ id: randomUUID(), kind: linkedCue }), 2000);
    return () => clearTimeout(timer);
  }, [linkedCue]);
  // &leave=1: the buddy goes its own way two seconds in (moving out, then the new egg).
  const leaves = params.leave === '1';
  const leaving = useRef(leave);
  useEffect(() => {
    leaving.current = leave;
  });
  useEffect(() => {
    if (!leaves) return;
    const timer = setTimeout(() => leaving.current(), 2000);
    return () => clearTimeout(timer);
  }, [leaves]);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [partnerPet, setPartnerPet] = useState<{ id: string } | null>(null);
  const [partnerHere, setPartnerHere] = useState(false);
  // undefined: by today's date, as in the app.
  const [season, setSeason] = useState<Season | null | undefined>(linkedSeason);
  const shownSeason = season === undefined ? seasonOn(new Date()) : season;
  const stageHeight = Math.round(Math.min(280, Math.max(180, windowHeight * 0.3)));
  // Each press plays the dream again (a new scene).
  const [dreamRun, setDreamRun] = useState(0);
  // One cut of the dream held still, to look at.
  const [dreamCut, setDreamCut] = useState<number | null>(linkedCut);
  // The kind of plant in the pot (undefined: the one the room drew).
  const [plantKind, setPlantKind] = useState<number | undefined>(undefined);
  // The buddy's details, opened from its name as in the app (the job's choices, the next reward).
  const [detail, setDetail] = useState(params.detail === '1');
  // The hour of the room (undefined: the device's).
  const [hour, setHour] = useState<number | undefined>(
    params.hour ? Number(params.hour) : undefined,
  );

  // The day of the room's seasonal things (undefined: today).
  const [date, setDate] = useState<string | undefined>(params.date);
  const [gifts, setGifts] = useState<BuddyGift[]>(() =>
    params.gifts === 'all' ? EVERY_LETTER : [],
  );

  // A job changed in the details plays on the stage once they close, as in the app.
  const [jobCheer, setJobCheer] = useState<Reaction | null>(null);
  const [foldAll, setFoldAll] = useState({ open: false, run: 0 });
  // The hot spring: each press opens the stage there again; snow on it by the season, or on or off.
  const [bathRun, setBathRun] = useState(0);
  const [bathSnow, setBathSnow] = useState<boolean | undefined>(undefined);
  // Where the goldfish lives, to compare before deciding (from Lv.42).
  const [fishStyle, setFishStyle] = useState<FishStyle>('table');

  return (
    <FoldAll.Provider value={foldAll}>
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        {/* The stage stays at the top while the buttons below scroll under it. */}
        <ScrollView
          style={styles.column}
          contentContainerStyle={styles.content}
          stickyHeaderIndices={[0]}
        >
          <View style={[styles.sticky, { backgroundColor: colors.background }]}>
            {dreamCut !== null ? (
              <View style={styles.held}>
                <BuddyDream
                  buddy={buddyOf('EGG', null, false, 0, null)}
                  height={stageHeight}
                  onEnd={() => {}}
                  hold={dreamCut}
                />
              </View>
            ) : null}
            {/* The bath is the button in the corner, as in the app. */}
            <BuddyScene
              key={`${dreamRun}-${bathRun}`}
              dreams={dreamRun > 0 ? 'always' : false}
              startInBath={params.scene === 'bath' || bathRun > 0}
              bathSnow={bathSnow}
              fishStyle={fishStyle}
              buddy={{ ...buddyOf(stage, job, hungry, poops, level, jobChangedAt), gifts }}
              myId={PREVIEW_ME}
              busy={false}
              height={stageHeight}
              // As in the room: the change at once, and the buddy's reaction with it (use-buddy.ts).
              onFeed={() => {
                setHungry(false);
                setReaction({ id: randomUUID(), kind: 'fed' });
              }}
              onClean={() => {
                setPoops((n) => Math.max(0, n - 1));
                setReaction({ id: randomUUID(), kind: 'cleaned' });
              }}
              onWork={() => {
                if (!job) return;
                const gift = {
                  id: randomUUID(),
                  to: PREVIEW_ME,
                  job,
                  pick: Math.floor(Math.random() * 1000),
                  at: new Date().toISOString(),
                };
                setGifts((all) => [gift, ...all]);
              }}
              onOpenDetail={() => setDetail(true)}
              reaction={reaction}
              cue={cue}
              greets={false}
              partnerPet={partnerPet}
              partnerHere={partnerHere}
              season={season}
              plantKind={plantKind}
              hour={hour}
              date={date}
              album={album}
              situation={{
                guestDaysLeft: params.guest ? Number(params.guest) : null,
                push: params.push === 'off' || params.push === 'needsInstall' ? params.push : null,
              }}
              onTurnOnPush={async () => 'on'}
            />
            <View style={styles.foldRow}>
              <Chip
                label="open all"
                onPress={() => setFoldAll({ open: true, run: foldAll.run + 1 })}
              />
              <Chip
                label="fold all"
                onPress={() => setFoldAll({ open: false, run: foldAll.run + 1 })}
              />
            </View>
          </View>
          <BuddySheet
            visible={detail}
            buddy={buddyOf(stage, job, hungry, poops, level, jobChangedAt)}
            onClose={() => {
              setDetail(false);
              if (jobCheer) setReaction(jobCheer);
              setJobCheer(null);
            }}
            onChangeJob={async (next) => {
              // A first job does not count, as on the server.
              if (job && stage === 'ADULT') setJobChangedAt(shownLevel);
              setJob(next);
              setJobCheer({ id: randomUUID(), kind: 'jobChanged' });
            }}
            onGraduate={async () => {
              setDetail(false);
              leave();
            }}
          />
          <Group title="scene">
            <Chip label="dream" onPress={() => setDreamRun((n) => n + 1)} />
            {[...Array(DREAM_CUTS)].map((_, i) => (
              <Chip
                key={i}
                label={`cut ${i + 1}`}
                onPress={() => setDreamCut(dreamCut === i ? null : i)}
                active={dreamCut === i}
              />
            ))}
          </Group>
          <Group title="goldfish (compare, from Lv.42)" startOpen>
            {(['table', 'wall', 'floor'] as const).map((style) => (
              <Chip
                key={style}
                label={
                  {
                    table: 'bowl on a table',
                    wall: 'built into the wall',
                    floor: 'tank on the floor',
                  }[style]
                }
                onPress={() => setFishStyle(style)}
                active={fishStyle === style}
              />
            ))}
          </Group>
          <Group title="hot spring (snow lies on the fence and floor)">
            <Chip label="go to the bath" onPress={() => setBathRun((n) => n + 1)} />
            <Chip
              label="snow by season"
              onPress={() => setBathSnow(undefined)}
              active={bathSnow === undefined}
            />
            <Chip label="snow on" onPress={() => setBathSnow(true)} active={bathSnow === true} />
            <Chip label="snow off" onPress={() => setBathSnow(false)} active={bathSnow === false} />
          </Group>
          <Group title="moving out (from a hatched buddy)">
            <Chip label="go its own way" onPress={leave} />
          </Group>
          <Group title="hour (window, clock, lamp, fireflies)">
            <Chip label="now" onPress={() => setHour(undefined)} active={hour === undefined} />
            {HOURS.map((h) => (
              <Chip key={h} label={`${h}:10`} onPress={() => setHour(h)} active={h === hour} />
            ))}
          </Group>
          <Group title="day (seasonal things)">
            <Chip label="today" onPress={() => setDate(undefined)} active={date === undefined} />
            {DATES.map((d) => (
              <Chip key={d} label={d} onPress={() => setDate(d)} active={d === date} />
            ))}
            <Chip
              label="🌕 full moon"
              onPress={() => {
                setDate(fullMoonDate());
                setHour(22);
              }}
              active={date === fullMoonDate()}
            />
          </Group>
          <Group title="plant kind (Lv.13–18)">
            <Chip
              label="drawn"
              onPress={() => setPlantKind(undefined)}
              active={plantKind === undefined}
            />
            {['cactus', 'rubber', 'snake', 'round'].map((name, i) => (
              <Chip
                key={name}
                label={name}
                onPress={() => setPlantKind(i)}
                active={plantKind === i}
              />
            ))}
          </Group>
          <Group title={`level · Lv.${shownLevel} ${stage}`} startOpen>
            <LevelGrid level={shownLevel} onChoose={goTo} />
          </Group>
          <Group title="room rewards (the guide's list, every level)">
            <RewardTable level={shownLevel} onChoose={goTo} />
          </Group>
          <Group title="job (ADULT)">
            <Chip
              label="none"
              onPress={() => {
                setJob(null);
                setJobChangedAt(null);
              }}
              active={job === null}
            />
            {JOB_ORDER.map((j) => (
              <Chip
                key={j}
                label={`${JOB_ICON[j]} ${j}`}
                onPress={() => {
                  setJob(j);
                  setJobChangedAt(null);
                }}
                active={j === job}
              />
            ))}
          </Group>
          <Group title="gifts (what it says in the chat at work)">
            <GiftMessages />
          </Group>
          <Group title="season">
            <Chip
              label="by date"
              onPress={() => setSeason(undefined)}
              active={season === undefined}
            />
            <Chip label="none" onPress={() => setSeason(null)} active={season === null} />
            {SEASONS.map((s) => (
              <Chip key={s} label={s} onPress={() => setSeason(s)} active={s === season} />
            ))}
          </Group>
          {/* A new id for every press, or the stage takes it for the one it already played. */}
          <Group title="does">
            <Chip label="job work" onPress={() => setCue({ id: randomUUID(), kind: 'job' })} />
            <Chip label="dance" onPress={() => setCue({ id: randomUUID(), kind: 'dance' })} />
            <Chip label="sing" onPress={() => setCue({ id: randomUUID(), kind: 'sing' })} />
            {HAPPENINGS.map((h) => (
              <Chip key={h} label={h} onPress={() => setCue({ id: randomUUID(), kind: h })} />
            ))}
          </Group>
          <Group title="chat words">
            {MOODS.map((m) => (
              <Chip key={m} label={m} onPress={() => setCue({ id: randomUUID(), kind: m })} />
            ))}
          </Group>
          <Group title="room events">
            {REACTIONS.map((r) => (
              <Chip key={r} label={r} onPress={() => setReaction({ id: randomUUID(), kind: r })} />
            ))}
            {/* A meal that earns a new level: its event a moment later, or both at once. */}
            <Chip
              label="fed → levelUp"
              onPress={() => {
                const fed = { id: randomUUID(), kind: 'fed' } as const;
                setReaction(fed);
                setTimeout(
                  () => setReaction({ id: randomUUID(), kind: 'levelUp', follows: fed }),
                  300,
                );
              }}
            />
            <Chip
              label="fed + levelUp"
              onPress={() =>
                setReaction({
                  id: randomUUID(),
                  kind: 'levelUp',
                  follows: { id: randomUUID(), kind: 'fed' },
                })
              }
            />
          </Group>
          <Group title="state">
            <Chip label="hungry" onPress={() => setHungry((h) => !h)} active={hungry} />
            <Chip label="+ poop" onPress={() => setPoops((n) => Math.min(3, n + 1))} />
            <Chip
              label="partner here"
              onPress={() => setPartnerHere((h) => !h)}
              active={partnerHere}
            />
            <Chip label="partner pets" onPress={() => setPartnerPet({ id: randomUUID() })} />
          </Group>
          {stage !== 'EGG' && <PoseSheet stage={stage} job={job} season={shownSeason} />}
        </ScrollView>
      </SafeAreaView>
    </FoldAll.Provider>
  );
}

const styles = StyleSheet.create({
  giftMessages: {
    gap: 12,
    width: '100%',
  },
  screen: { flex: 1, alignItems: 'center' },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  content: { gap: 12, paddingBottom: 32 },
  sticky: { gap: 12, paddingBottom: 8, zIndex: 1 },
  foldRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  group: { gap: 6, paddingHorizontal: 12 },
  title: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pose: { alignItems: 'center', justifyContent: 'flex-end', padding: 4, borderRadius: 6 },
  poseName: { fontSize: 10 },
  held: { marginHorizontal: 12, borderRadius: 20, overflow: 'hidden' },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  levels: { flex: 1, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 },
  // Ten to a row, so each row ends on a ten (the job's chances, the top).
  slot: { width: '10%', padding: 2 },
  cell: {
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2 },
  levelBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelNote: { flex: 1, fontSize: 13, textAlign: 'center' },
  levelName: { fontWeight: '700' },
  legend: { fontSize: 11 },
  rewards: { flex: 1, gap: 2 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rewardLevel: { width: 40, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rewardIcon: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  rewardName: { flex: 1, fontSize: 13 },
  rewardWhen: { fontSize: 11, fontWeight: '600' },
});
