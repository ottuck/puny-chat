import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

type Props = {
  buddyName: string;
  // null in a solo room: the way forward is inviting a friend, with the header's button.
  partnerName: string | null;
};

// A timeline with nothing in it yet: a room just created, or a friend who just joined. The buddy
// itself is on the stage above.
export function EmptyChat({ buddyName, partnerName }: Props) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text lineBreakStrategyIOS="hangul-word" style={[styles.text, { color: colors.textMuted }]}>
        {partnerName === null
          ? t('chat.emptySolo', { buddy: buddyName })
          : t('chat.emptyDuo', { partner: partnerName || t('chat.guestName') })}
      </Text>
      {/* No invite button here: the header's is always on screen. Most first visitors come alone;
          the buddy grows from their own messages too. */}
      {partnerName === null ? (
        <Text lineBreakStrategyIOS="hangul-word" style={[styles.hint, { color: colors.textMuted }]}>
          {t('chat.emptySoloHint', { buddy: buddyName })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
