import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/progress-bar';
import { WebFrame } from '@/components/web-frame';
import { errorMessage } from '@/features/room/error-message';
import { confirm } from '@/lib/confirm';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

import { type BuddyJob, type BuddyView, NEXT_STEP_AT, TOGETHER_EXP } from '../api';
import { isJob, JOB_ICON, JOB_ORDER } from '../jobs';
import { BuddyAvatar } from './buddy-avatar';
import { rewardIcon } from './buddy-guide';
import { nextReward } from './stage-decor';

const MAX_POOPS = 3; // server: BuddyRules.MAX_POOPS

type Props = {
  visible: boolean;
  buddy: BuddyView;
  onClose: () => void;
  // At the top level: the buddy goes into the album and a new egg with this name arrives.
  onGraduate?: (newName: string) => Promise<void>;
  // An adult's job, changed once at Lv.20, 30, 40 and 50 and any time from 60; none in the tour.
  onChangeJob?: (job: BuddyJob) => Promise<void>;
  // With a partner in the room: today's together bonus, and who has talked.
  together?: { myId: string; partnerId: string; partnerName: string };
};

const MAX_NAME_LENGTH = 12; // server: Buddy.MAX_NAME_LENGTH

// Buddy detail: stats, the together bonus, the job, and going its own way once grown (docs/PROJECT.md).
// Feeding, cleaning and work are on the stage itself (the bowl, the poops, the station), not here. The
// buddies gone their own way are in the memory album (album-gallery.tsx). A native page sheet on iOS, so it can be swiped down.
export function BuddySheet({ visible, buddy, onClose, onGraduate, onChangeJob, together }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const grownUp = buddy.stage === 'ADULT';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Web shows the sheet in the same frame as the app (components/web-frame.web.tsx). */}
      <WebFrame>
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.column, { paddingBottom: 16 + insets.bottom }]}
          >
            <View style={styles.topBar}>
              <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
                <Text style={[styles.close, { color: colors.accent }]}>{t('common.close')}</Text>
              </Pressable>
            </View>

            <View style={styles.hero}>
              <BuddyAvatar stage={buddy.stage} size={96} />
              <Text style={[styles.name, { color: colors.text }]}>{buddy.name}</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {t(`buddy.stage.${buddy.stage}`)} · {t('buddy.level', { level: buddy.level })}
              </Text>
            </View>

            {/* First thing in view once grown: easy to miss at the bottom. */}
            {buddy.grown && onGraduate ? (
              <GraduateCard buddyName={buddy.name} onGraduate={onGraduate} />
            ) : null}

            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Stat
                label={t('buddy.exp')}
                value={`${Math.round(buddy.levelProgress * 100)}%`}
                progress={buddy.levelProgress}
              />
              <Stat
                label={t('buddy.fullness')}
                value={
                  buddy.hungry
                    ? t('buddy.hungry')
                    : buddy.canFeed
                      ? t('buddy.peckish')
                      : t('buddy.full')
                }
                progress={buddy.fullness / 100}
                color={colors.fullness}
              />
              {/* A grown-up no longer poops: nothing to keep clean. */}
              {grownUp ? null : (
                <Stat
                  label={t('buddy.cleanliness')}
                  value={buddy.poops > 0 ? '💩'.repeat(buddy.poops) : t('buddy.clean')}
                  progress={1 - buddy.poops / MAX_POOPS}
                  color={colors.cleanliness}
                />
              )}
            </View>

            {together ? <TogetherCard buddy={buddy} {...together} /> : null}

            <ChatExpCard buddy={buddy} />

            <JobCard buddy={buddy} onChangeJob={onChangeJob} />

            <NextReward level={buddy.level} />

            <Text style={[styles.hint, { color: colors.textMuted }]}>{t('buddy.growthHint')}</Text>
          </ScrollView>
        </View>
      </WebFrame>
    </Modal>
  );
}

// The day's together bonus (docs/PROJECT.md, 둘이 함께): who has talked today, and what is left.
function TogetherCard({
  buddy,
  myId,
  partnerId,
  partnerName,
}: {
  buddy: BuddyView;
  myId: string;
  partnerId: string;
  partnerName: string;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const me = buddy.talkedToday.includes(myId);
  const partner = buddy.talkedToday.includes(partnerId);
  const state = buddy.togetherToday
    ? 'done'
    : me && !partner
      ? 'waitPartner'
      : partner && !me
        ? 'waitMe'
        : 'none';
  const mark = (talked: boolean) => (talked || buddy.togetherToday ? '✅' : '⏳');
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('buddy.together.title')}</Text>
      <Text style={[styles.body, { color: colors.text }]}>
        {t('buddy.together.me')} {mark(me)} · {partnerName} {mark(partner)}
      </Text>
      <Text lineBreakStrategyIOS="hangul-word" style={[styles.body, { color: colors.textMuted }]}>
        {t(`buddy.together.${state}`, { name: partnerName, exp: TOGETHER_EXP })}
      </Text>
    </View>
  );
}

// Once it has its job, a day's messages earn only so much EXP (docs/PROJECT.md, 돌봄): whether today's is
// full. Said only as full or not, the count is not shown.
function ChatExpCard({ buddy }: { buddy: BuddyView }) {
  const colors = useColors();
  const { t } = useTranslation();
  if (buddy.chatExpFull === undefined || buddy.level < NEXT_STEP_AT.ADULT) return null;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('buddy.chatExp.title')}</Text>
      <Text lineBreakStrategyIOS="hangul-word" style={[styles.body, { color: colors.textMuted }]}>
        {t(buddy.chatExpFull ? 'buddy.chatExp.full' : 'buddy.chatExp.open')}
      </Text>
    </View>
  );
}

// What it grows up to be (docs/fun-improvements.md, 직업): the job once an adult, and before that where
// it is heading, so the way they raise it shows. The server says when it can be changed; while it
// cannot, the button stays, greyed with a lock, and a press says when it opens.
function JobCard({
  buddy,
  onChangeJob,
}: {
  buddy: BuddyView;
  onChangeJob?: (job: BuddyJob) => Promise<void>;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [choosing, setChoosing] = useState(false);
  // A press on the locked button: why, and when it opens.
  const [explaining, setExplaining] = useState(false);
  // Just changed here: the stage shows it once this closes.
  const [changedTo, setChangedTo] = useState<BuddyJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const job = buddy.job ?? buddy.leaning;
  const changeable = buddy.stage === 'ADULT' && !!onChangeJob;
  if (!job && !changeable) return null;
  const nameOf = (value: BuddyJob) => t(`buddy.job.${value}`, { defaultValue: value });

  const choose = async (next: BuddyJob) => {
    if (!onChangeJob || next === buddy.job) return;
    const ok = await confirm({
      title: t('buddy.jobCard.confirmTitle'),
      message: t('buddy.jobCard.confirmMessage', { icon: JOB_ICON[next], job: nameOf(next) }),
      confirmLabel: t('buddy.jobCard.confirm'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await onChangeJob(next);
      setChoosing(false);
      setChangedTo(next);
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('buddy.jobCard.title')}</Text>
      {buddy.job && isJob(buddy.job) ? (
        <>
          <Text style={[styles.body, { color: colors.text }]}>
            {JOB_ICON[buddy.job]} {nameOf(buddy.job)}
          </Text>
          <Text
            lineBreakStrategyIOS="hangul-word"
            style={[styles.body, { color: colors.textMuted }]}
          >
            {t(`buddy.jobPerk.${buddy.job}`, { defaultValue: '' })}
          </Text>
        </>
      ) : buddy.leaning && isJob(buddy.leaning) ? (
        <>
          <Text lineBreakStrategyIOS="hangul-word" style={[styles.body, { color: colors.text }]}>
            {t('buddy.jobCard.leaning', {
              icon: JOB_ICON[buddy.leaning],
              job: nameOf(buddy.leaning),
            })}
          </Text>
          <Text
            lineBreakStrategyIOS="hangul-word"
            style={[styles.body, { color: colors.textMuted }]}
          >
            {t('buddy.jobCard.hint')}
          </Text>
        </>
      ) : (
        // Nothing to lean on yet: just when and how the job comes.
        <Text lineBreakStrategyIOS="hangul-word" style={[styles.body, { color: colors.textMuted }]}>
          {t('buddy.jobCard.hint')}
        </Text>
      )}

      {changeable ? (
        buddy.canChangeJob ? (
          <>
            <Pressable
              onPress={() => setChoosing((open) => !open)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.jobButton,
                { borderColor: colors.accent, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.careLabel, { color: colors.accent }]}>
                {t('buddy.jobCard.change')}
              </Text>
            </Pressable>
            {choosing ? (
              <View style={{ gap: 8 }}>
                <Text style={[styles.body, { color: colors.textMuted }]}>
                  {t('buddy.jobCard.changeTitle')}
                </Text>
                {JOB_ORDER.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => choose(option)}
                    disabled={busy || option === buddy.job}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.jobOption,
                      {
                        borderColor: option === buddy.job ? colors.accent : colors.border,
                        opacity: busy ? 0.5 : pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.statLabel, { color: colors.text }]}>
                      {JOB_ICON[option]} {nameOf(option)}
                      {option === buddy.job ? ` · ${t('buddy.jobCard.current')}` : ''}
                    </Text>
                    <Text
                      lineBreakStrategyIOS="hangul-word"
                      style={[styles.statValue, { color: colors.textMuted }]}
                    >
                      {t(`buddy.jobPerk.${option}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : buddy.jobChangeAt ? (
          // Still a button, so a press says why it is locked instead of nothing happening.
          <>
            <Pressable
              onPress={() => setExplaining((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              style={({ pressed }) => [
                styles.jobButton,
                { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.careLabel, { color: colors.textMuted }]}>
                {t('buddy.jobCard.locked', { level: buddy.jobChangeAt })}
              </Text>
            </Pressable>
            {explaining ? (
              <View style={[styles.jobNote, { backgroundColor: colors.background }]}>
                <Text
                  lineBreakStrategyIOS="hangul-word"
                  style={[styles.body, { color: colors.text }]}
                >
                  {t('buddy.jobCard.lockedWhy', { level: buddy.jobChangeAt })}
                </Text>
              </View>
            ) : null}
          </>
        ) : null
      ) : null}
      {changedTo && buddy.job === changedTo ? (
        <View style={[styles.jobNote, { backgroundColor: colors.bubbleMine }]}>
          <Text lineBreakStrategyIOS="hangul-word" style={[styles.body, { color: colors.text }]}>
            {t('buddy.jobCard.changed', { icon: JOB_ICON[changedTo], job: nameOf(changedTo) })}
          </Text>
        </View>
      ) : null}
      {error ? <Text style={[styles.body, { color: colors.accent }]}>{error}</Text> : null}
    </View>
  );
}

// Something to look forward to: the next reward and how far it is.
function NextReward({ level }: { level: number }) {
  const colors = useColors();
  const { t } = useTranslation();
  const next = nextReward(level);
  if (!next) return null;
  return (
    <View style={[styles.card, styles.nextReward, { backgroundColor: colors.surface }]}>
      {rewardIcon(next.reward)}
      <Text style={[styles.body, styles.nextText, { color: colors.text }]}>
        {t('buddy.nextReward', {
          level: next.level,
          reward: t(`buddy.reward.${next.reward}`),
          count: next.level - level,
        })}
      </Text>
    </View>
  );
}

function GraduateCard({
  buddyName,
  onGraduate,
}: {
  buddyName: string;
  onGraduate: (newName: string) => Promise<void>;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newName = name.trim();

  const graduate = async () => {
    const ok = await confirm({
      title: t('buddy.graduate.confirmTitle', { buddy: buddyName }),
      message: t('buddy.graduate.confirmMessage', { buddy: buddyName, name: newName }),
      confirmLabel: t('buddy.graduate.confirm'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await onGraduate(newName);
    } catch (e) {
      setError(errorMessage(t, e));
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        🎓 {t('buddy.graduate.title')}
      </Text>
      <Text lineBreakStrategyIOS="hangul-word" style={[styles.body, { color: colors.textMuted }]}>
        {t('buddy.graduate.body', { buddy: buddyName })}
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('buddy.graduate.namePlaceholder')}
        placeholderTextColor={colors.textMuted}
        maxLength={MAX_NAME_LENGTH}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
        ]}
      />
      {busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Pressable
          onPress={graduate}
          disabled={!newName}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.careButton,
            { backgroundColor: colors.accent, opacity: !newName ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.careLabel, { color: colors.onAccent }]}>
            {t('buddy.graduate.button')}
          </Text>
        </Pressable>
      )}
      {error ? <Text style={[styles.body, { color: colors.accent }]}>{error}</Text> : null}
    </View>
  );
}

function Stat(props: { label: string; value: string; progress: number; color?: string }) {
  const colors = useColors();
  return (
    <View style={styles.stat}>
      <View style={styles.statHeader}>
        <Text style={[styles.statLabel, { color: colors.text }]}>{props.label}</Text>
        <Text style={[styles.statValue, { color: colors.textMuted }]}>{props.value}</Text>
      </View>
      <View style={styles.statBar}>
        <ProgressBar progress={props.progress} color={props.color} height={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  scroll: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  column: {
    paddingHorizontal: 20,
    gap: 20,
  },
  nextReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
  },
  close: {
    fontSize: 16,
    fontWeight: '600',
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  jobOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  jobNote: {
    borderRadius: 12,
    padding: 12,
  },
  jobButton: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  stat: {
    gap: 6,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
  },
  statBar: {
    flexDirection: 'row',
  },
  careButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
  },
});
