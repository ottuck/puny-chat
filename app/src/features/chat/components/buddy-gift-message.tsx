import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Gift, itemKey, openerKey } from '@/features/buddy/gifts';
import { GIFT_PALETTE, giftArt } from '@/features/buddy/pixel/gifts';
import { dressedFrame } from '@/features/buddy/pixel/looks';
import { PixelSprite } from '@/features/buddy/pixel/pixel-sprite';
import { BUDDY_PALETTE } from '@/features/buddy/pixel/sprites';
import { useColors } from '@/theme';

// The buddy talking in the chat when it does something for one of us at work (docs/fun-improvements.md,
// 직업 선물), the way a member's messages look but smaller: its face, its name and who it is for, then
// a few short bubbles. A barista, a cook or a gardener hands over what it made, its picture under the
// words; a DJ goes on air; a writer says a letter is in the mailbox, and for the one it is for that
// bubble opens it.
const FACE = 22;
const PICTURE_SCALE = 1.5;

export function BuddyGiftMessage({
  gift,
  buddyName,
  toName,
  onOpenMail,
}: {
  gift: Gift;
  buddyName: string;
  toName: string;
  onOpenMail?: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const lines =
    gift.kind === 'item'
      ? [t(openerKey(gift)), t(itemKey(gift, 'offer'))]
      : gift.kind === 'radio'
        ? t(`buddy.radio.${gift.show}`, { buddy: buddyName, to: toName }).split('\n')
        : t('chat.letterSent').split('\n');
  const face = dressedFrame('ADULT', 'happy', gift.job, null);
  const bubble = [
    styles.bubble,
    {
      backgroundColor: colors.bubbleTheirs,
      borderColor: colors.border,
    },
  ];
  const text = [styles.text, { color: colors.bubbleTheirsText }];

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <PixelSprite frame={face} palette={BUDDY_PALETTE} scale={FACE / face[0].length} smooth />
        <Text style={[styles.name, { color: colors.textMuted }]}>
          {t('chat.buddyTo', { buddy: buddyName, to: toName })}
        </Text>
      </View>
      <View style={styles.body}>
        {lines.map((line, i) =>
          gift.kind === 'letter' && onOpenMail ? (
            <Pressable
              key={i}
              onPress={onOpenMail}
              accessibilityRole="button"
              style={({ pressed }) => [...bubble, pressed && styles.pressed]}
            >
              <Text style={text}>{line}</Text>
            </Pressable>
          ) : (
            <View key={i} style={bubble}>
              <Text style={text}>{line}</Text>
            </View>
          ),
        )}
        {gift.kind === 'item' ? (
          <View accessible accessibilityLabel={t(itemKey(gift, 'name'))} style={styles.picture}>
            <PixelSprite frame={giftArt(gift)} palette={GIFT_PALETTE} scale={PICTURE_SCALE} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    maxWidth: '75%',
    alignItems: 'flex-start',
    gap: 4,
    paddingLeft: FACE + 6,
  },
  bubble: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  picture: {
    marginTop: 2,
  },
});
