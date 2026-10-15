import { randomUUID } from 'expo-crypto';
import { Redirect } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BuddyJob, BuddyStage, BuddyView } from '@/features/buddy/api';
import type { Mood } from '@/features/buddy/chat-words';
import { BuddyStage as Stage, type Cue } from '@/features/buddy/components/buddy-stage';
import { JOB_ICON, JOB_ORDER } from '@/features/buddy/jobs';
import { dressedFrame, type Season, SEASONS, seasonOn } from '@/features/buddy/pixel/looks';
import { PixelSprite } from '@/features/buddy/pixel/pixel-sprite';
import { BUDDY_PALETTE, POSES_IN_ORDER } from '@/features/buddy/pixel/sprites';
import type { Reaction, ReactionKind } from '@/features/buddy/reactions';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

// For making the buddy's art (docs/art-handover.md): the stage on its own, with a button for each
// thing it can do, so a new frame or prop can be seen at once instead of waiting for it to happen.
// Not part of the app: it only opens in development builds, and nothing links to it.

const STAGES: BuddyStage[] = ['EGG', 'BABY', 'CHILD', 'ADULT'];
const LEVEL: Record<BuddyStage, number> = { EGG: 1, BABY: 3, CHILD: 10, ADULT: 20 };
const HAPPENINGS = [
  'hiccup',
  'startle',
  'lookAround',
  'yawn',
  'butterfly',
  'rain',
  'snow',
  'shootingStar',
] as const;
const MOODS: Mood[] = ['laugh', 'love', 'cheer', 'comfort', 'goodnight', 'morning'];
const REACTIONS: ReactionKind[] = [
  'message',
  'fed',
  'cleaned',
  'pooped',
  'worked',
  'levelUp',
  'evolved',
  'together',
  'here',
];

function buddyOf(
  stage: BuddyStage,
  job: BuddyJob | null,
  hungry: boolean,
  poops: number,
): BuddyView {
  return {
    name: 'Preview',
    exp: 0,
    level: LEVEL[stage],
    stage,
    levelProgress: 0.4,
    fullness: hungry ? 10 : 100,
    poops,
    hungry,
    canFeed: hungry,
    canClean: poops > 0,
    grown: false,
    talkedToday: [],
    togetherToday: false,
    job: stage === 'ADULT' ? job : null,
    leaning: null,
    canChangeJob: false,
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

function Group({ title, children }: { title: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.group}>
      <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      <View style={styles.row}>{children}</View>
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
    <View style={styles.group}>
      <Text style={[styles.title, { color: colors.textMuted }]}>poses</Text>
      <View style={styles.row}>
        {POSES_IN_ORDER.map((pose) => (
          <View key={pose} style={[styles.pose, { backgroundColor: colors.stage }]}>
            <PixelSprite
              frame={dressedFrame(stage, pose, stage === 'ADULT' ? job : null, season)}
              palette={BUDDY_PALETTE}
              scale={stage === 'ADULT' ? 4 : 5}
            />
            <Text style={[styles.poseName, { color: colors.textMuted }]}>{pose}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Preview() {
  const colors = useColors();
  const { height: windowHeight } = useWindowDimensions();
  const [stage, setStage] = useState<BuddyStage>('ADULT');
  const [job, setJob] = useState<BuddyJob | null>('CHEF');
  const [hungry, setHungry] = useState(false);
  const [poops, setPoops] = useState(0);
  const [cue, setCue] = useState<Cue | null>(null);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [partnerPet, setPartnerPet] = useState<{ id: string } | null>(null);
  const [partnerHere, setPartnerHere] = useState(false);
  // undefined: by today's date, as in the app.
  const [season, setSeason] = useState<Season | null | undefined>(undefined);
  const shownSeason = season === undefined ? seasonOn(new Date()) : season;
  const stageHeight = Math.round(Math.min(280, Math.max(180, windowHeight * 0.3)));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.column} contentContainerStyle={styles.content}>
        <Stage
          buddy={buddyOf(stage, job, hungry, poops)}
          busy={false}
          height={stageHeight}
          onFeed={() => setHungry(false)}
          onClean={() => setPoops((n) => Math.max(0, n - 1))}
          onWork={() => {}}
          onOpenDetail={() => {}}
          reaction={reaction}
          cue={cue}
          greets={false}
          partnerPet={partnerPet}
          partnerHere={partnerHere}
          season={season}
        />
        <Group title="stage">
          {STAGES.map((s) => (
            <Chip key={s} label={s} onPress={() => setStage(s)} active={s === stage} />
          ))}
        </Group>
        <Group title="job (ADULT)">
          {JOB_ORDER.map((j) => (
            <Chip
              key={j}
              label={`${JOB_ICON[j]} ${j}`}
              onPress={() => setJob(j)}
              active={j === job}
            />
          ))}
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
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  content: { gap: 12, paddingBottom: 32 },
  group: { gap: 6, paddingHorizontal: 12 },
  title: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pose: { alignItems: 'center', justifyContent: 'flex-end', padding: 4, borderRadius: 6 },
  poseName: { fontSize: 10 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
});
