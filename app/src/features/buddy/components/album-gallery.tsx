import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WebFrame } from '@/components/web-frame';
import type { AlbumEntry } from '@/features/room/api';
import { useColors } from '@/theme';

import { isJob, JOB_ICON } from '../jobs';
import { dressedFrame } from '../pixel/looks';
import { PixelSprite } from '../pixel/pixel-sprite';
import { BUDDY_PALETTE, HEART, PROP_PALETTE } from '../pixel/sprites';

// The memory album (docs/fun-improvements.md, 추억 앨범): the buddies gone their own way, each a
// photo in a frame on a little gallery wall, newest first. Opened from the button beside the hot
// spring's (buddy-scene.tsx); the stage itself keeps no portraits.

// The frames take turns in these pastels, and lean a little one way or the other.
const FRAME_COLORS = ['#FF9EB5', '#8FD3B6', '#B9A4EC', '#FFC86B'] as const;
const TILTS = ['-2.5deg', '2deg', '1.5deg', '-2deg'] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
// The buddy in a photo, standing on its bit of floor.
const PHOTO_SCALE = 2.5;

export function AlbumGallery({
  visible,
  album,
  onClose,
}: {
  visible: boolean;
  album: AlbumEntry[];
  onClose: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const newestFirst = [...album].reverse();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <WebFrame>
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={[styles.column, { paddingBottom: 24 + insets.bottom }]}
          >
            <View style={styles.topBar}>
              <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
                <Text style={[styles.close, { color: colors.accent }]}>{t('common.close')}</Text>
              </Pressable>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t('buddy.album.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('buddy.album.count', { count: album.length })}
            </Text>
            <View style={[styles.wall, { backgroundColor: colors.stage }]}>
              {newestFirst.map((entry, i) => (
                <Photo key={entry.graduatedAt} entry={entry} turn={album.length - 1 - i} />
              ))}
            </View>
          </ScrollView>
        </View>
      </WebFrame>
    </Modal>
  );
}

// One buddy: in its job's look, smiling, on a bit of floor, under washi tape; its name and the days
// it was here below, like a caption written on the mat.
function Photo({ entry, turn }: { entry: AlbumEntry; turn: number }) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric' });
  const jobName = entry.job ?? undefined;
  const job = isJob(jobName) ? jobName : null;
  const born = new Date(entry.bornAt);
  const left = new Date(entry.graduatedAt);
  const days = Math.max(1, Math.ceil((left.getTime() - born.getTime()) / DAY_MS));
  const color = FRAME_COLORS[turn % FRAME_COLORS.length];
  return (
    <View
      style={[styles.photo, { transform: [{ rotate: TILTS[turn % TILTS.length] }] }]}
      accessible
      accessibilityLabel={`${entry.name}, ${t('buddy.album.together', {
        from: date.format(born),
        to: date.format(left),
        count: days,
      })}`}
    >
      <View style={[styles.frame, { borderColor: color }]}>
        <View style={[styles.picture, { backgroundColor: colors.stage }]}>
          <View style={[styles.floor, { backgroundColor: colors.stageFloor }]} />
          {/* Over the floor, which is laid absolutely (on the web it would otherwise cover it). */}
          <View style={styles.standing}>
            <PixelSprite
              frame={dressedFrame('ADULT', 'happy', job, null)}
              palette={BUDDY_PALETTE}
              scale={PHOTO_SCALE}
            />
          </View>
        </View>
        <Text style={[styles.name, { color: '#3A2E2A' }]} numberOfLines={1}>
          {entry.name}
          {job ? ` ${JOB_ICON[job]}` : ''}
        </Text>
        <Text style={styles.caption}>
          {t('buddy.album.together', {
            from: date.format(born),
            to: date.format(left),
            count: days,
          })}
        </Text>
      </View>
      <View style={[styles.tape, { backgroundColor: color }]} />
      <View style={styles.heart}>
        <PixelSprite frame={HEART} palette={PROP_PALETTE} scale={2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 16,
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  // A soft wall the photos hang on, two to a row.
  wall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 28,
    borderRadius: 20,
    marginTop: 16,
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  photo: {
    width: '44%',
    alignItems: 'center',
  },
  frame: {
    width: '100%',
    borderWidth: 6,
    borderRadius: 6,
    backgroundColor: '#FFFDF8',
    padding: 8,
    paddingBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  picture: {
    width: '100%',
    height: 112,
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '22%',
  },
  standing: {
    zIndex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  caption: {
    fontSize: 11,
    color: '#8A7F78',
    marginTop: 2,
    textAlign: 'center',
  },
  // A strip of washi tape holding the photo up.
  tape: {
    position: 'absolute',
    top: -9,
    width: 46,
    height: 16,
    opacity: 0.55,
    transform: [{ rotate: '-4deg' }],
  },
  heart: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
});
