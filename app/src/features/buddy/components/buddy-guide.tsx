import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

import { TOGETHER_EXP } from '../api';
import { type Frame, type Palette, PixelSprite } from '../pixel/pixel-sprite';
import {
  CAT_TAIL,
  clockAt,
  CRATE,
  FIREFLY,
  LAMP_LIT,
  LAMP,
  MUSIC_BOX,
  ROOM_PALETTE,
  RUGS,
  SKY_PALETTES,
  SNAIL,
  SPARROW,
  TATAMI_SWATCH,
  TOY_BOX,
  TRAIN,
  WINDOW,
  WOOD_SWATCH,
} from '../pixel/room';
import {
  BEAR,
  BOOKS,
  BUNNY,
  CAT_FACE,
  cuckooAt,
  DRAGONFLY,
  fishBowl,
  FURIN,
  GOLD_PALETTE,
  GRAMOPHONE,
  HANGING_PLANT,
  KOTATSU,
  LADYBUG,
  LAMP_SHADE,
  MOCHI,
  OWL,
  PETALS_ICON,
  RADIO,
  RAINBOW,
  SILL_POT,
  SQUIRREL,
  SWALLOW,
  TEA,
  THINGS_PALETTE,
} from '../pixel/room-things';
import { bowl, PLANTS, PROP_PALETTE } from '../pixel/sprites';
import { type Reward, REWARDS } from './stage-decor';

// How the buddy grows and what comes with it (docs/PROJECT.md, 도움말): care, growth, the rewards
// every few levels, and going its own way. Opened from the chat header, settings, and once on
// arrival, so the goals are known from the start.

const prop = (frame: Frame) => ({ frame, palette: PROP_PALETTE });
const room = (frame: Frame) => ({ frame, palette: ROOM_PALETTE });
const thing = (frame: Frame) => ({ frame, palette: THINGS_PALETTE });

const REWARD_ICON: Record<Reward, { frame: Frame; palette: Palette }> = {
  plant1: prop(PLANTS[1][0]),
  crate: room(CRATE),
  bowl1: prop(bowl(true, 1)),
  toys: room(TOY_BOX),
  window: { frame: WINDOW, palette: SKY_PALETTES.day },
  // One of the kinds it may grow into.
  plant2: prop(PLANTS[2][0]),
  rug1: room(RUGS[1]),
  clock: room(clockAt(10, 10)),
  musicBox: room(MUSIC_BOX[0]),
  snail: room(SNAIL[0]),
  rug2: room(RUGS[2]),
  plant3: prop(PLANTS[3][0]),
  wood: room(WOOD_SWATCH),
  firefly: room(FIREFLY),
  bowl2: prop(bowl(true, 2)),
  rug3: room(RUGS[3]),
  plant4: prop(PLANTS[4][0]),
  train: room(TRAIN[0]),
  sparrow: room(SPARROW[0]),
  tatami: room(TATAMI_SWATCH),
  lamp: { frame: LAMP, palette: LAMP_LIT },
  catTail: room(CAT_TAIL[0]),
  plant5: prop(PLANTS[5][0]),
  bowl3: prop(bowl(true, 3)),
  hangingPlant: thing(HANGING_PLANT),
  ladybug: thing(LADYBUG[0]),
  radio: thing(RADIO[1]),
  sillPot: thing(SILL_POT[0]),
  fishbowl: thing(fishBowl(0, false)),
  furin: thing(FURIN[0]),
  dragonfly: thing(DRAGONFLY[0]),
  bear: thing(BEAR),
  cuckoo: thing(cuckooAt(10, 10, 0)),
  kotatsu: thing(KOTATSU),
  swallow: thing(SWALLOW[0]),
  sakura: thing(PETALS_ICON),
  goldMusicBox: { frame: MUSIC_BOX[0], palette: GOLD_PALETTE },
  tea: thing(TEA),
  owl: thing(OWL[0]),
  lampShade: { frame: [...LAMP_SHADE, ...LAMP.slice(LAMP_SHADE.length)], palette: LAMP_LIT },
  mochi: thing(MOCHI),
  rug4: room(RUGS[4]),
  books: thing(BOOKS),
  rainbow: thing(RAINBOW),
  squirrel: thing(SQUIRREL),
  gramophone: thing(GRAMOPHONE[0]),
  waterPlants: thing(fishBowl(1, true)),
  catFace: thing(CAT_FACE[0]),
  bunny: thing(BUNNY),
  sillFlower: thing(SILL_POT[1]),
};

export function rewardIcon(reward: Reward, size = 30) {
  const { frame, palette } = REWARD_ICON[reward];
  const scale = Math.min(size / frame[0].length, size / frame.length);
  return <PixelSprite frame={frame} palette={palette} scale={scale} />;
}

export function BuddyGuide() {
  const colors = useColors();
  const { t } = useTranslation();

  const section = (title: string, lines: string[]) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {lines.map((line) => (
        <Text
          key={line}
          lineBreakStrategyIOS="hangul-word"
          style={[styles.line, { color: colors.textMuted }]}
        >
          · {line}
        </Text>
      ))}
    </View>
  );

  return (
    <View style={styles.column}>
      {section(t('guide.care.title'), [
        t('guide.care.feed'),
        t('guide.care.clean'),
        t('guide.care.pet'),
        t('guide.care.words'),
      ])}
      {section(t('guide.grow.title'), [
        t('guide.grow.exp'),
        t('guide.grow.together', { exp: TOGETHER_EXP }),
        t('guide.grow.stages'),
        t('guide.grow.job'),
      ])}

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('guide.rewards.title')}</Text>
        <Text lineBreakStrategyIOS="hangul-word" style={[styles.line, { color: colors.textMuted }]}>
          {t('guide.rewards.body')}
        </Text>
        {REWARDS.map(({ level, reward }) => (
          <View key={reward} style={styles.reward}>
            <View style={styles.icon}>{rewardIcon(reward)}</View>
            <Text style={[styles.level, { color: colors.accent }]}>Lv.{level}</Text>
            <Text style={[styles.rewardName, { color: colors.text }]}>
              {t(`buddy.reward.${reward}`)}
            </Text>
          </View>
        ))}
      </View>

      {section(t('guide.graduate.title'), [
        t('guide.graduate.top'),
        t('guide.graduate.album'),
        t('guide.graduate.keep'),
      ])}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  line: {
    fontSize: 14,
    lineHeight: 21,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  level: {
    width: 44,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rewardName: {
    flex: 1,
    fontSize: 15,
  },
});
