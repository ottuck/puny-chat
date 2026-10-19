import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { WebFrame } from '@/components/web-frame';
import { useColors } from '@/theme';

// Shown while mounted, so each opening starts again from the warning.
type Props = {
  // What the deletion takes and leaves depends on the room: none, alone, or with a partner.
  buddy?: string;
  partner?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

// Deleting an account cannot be undone, so it asks twice: first what goes and what stays, then a
// last yes. A card of its own rather than the system's alert, which is plain and on the web is the
// browser's confirm().
export function DeleteAccountDialog({ buddy, partner, onCancel, onConfirm }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const [step, setStep] = useState<'warning' | 'final'>('warning');

  const gone = [
    t('settings.deleteGoneAccount'),
    t('settings.deleteGoneMessages'),
    ...(buddy && !partner ? [t('settings.deleteGoneRoom', { buddy })] : []),
  ];
  const kept =
    buddy && partner
      ? [
          t('settings.deleteKeptBuddy', { buddy, partner }),
          t('settings.deleteKeptMessages', { partner }),
        ]
      : [];
  const final = step === 'final';

  return (
    <Modal
      visible
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'fade'}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <WebFrame transparent>
        <View style={styles.overlay}>
          <View
            role="alertdialog"
            aria-modal
            accessibilityLabel={final ? t('settings.deleteFinalTitle') : t('settings.deleteTitle')}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.badge, { backgroundColor: colors.bubbleMine }]}>
              <Text style={styles.badgeIcon}>{final ? '🗑️' : '⚠️'}</Text>
            </View>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
              {final ? t('settings.deleteFinalTitle') : t('settings.deleteTitle')}
            </Text>

            {final ? (
              <Text style={[styles.body, { color: colors.textMuted }]}>
                {t('settings.deleteFinalBody')}
              </Text>
            ) : (
              <>
                <Text style={[styles.body, { color: colors.textMuted }]}>
                  {t('settings.deleteLead')}
                </Text>
                <View style={[styles.box, { backgroundColor: colors.background }]}>
                  <Text style={[styles.boxLabel, { color: colors.accent }]}>
                    {t('settings.deleteGone')}
                  </Text>
                  {gone.map((line) => (
                    <Item key={line} mark="✕" markColor={colors.accent} text={line} />
                  ))}
                  {kept.length > 0 ? (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <Text style={[styles.boxLabel, { color: colors.textMuted }]}>
                        {t('settings.deleteKept')}
                      </Text>
                      {kept.map((line) => (
                        <Item key={line} mark="✓" markColor={colors.online} text={line} />
                      ))}
                    </>
                  ) : null}
                </View>
              </>
            )}

            <View style={styles.buttons}>
              <Pressable
                onPress={final ? onConfirm : () => setStep('final')}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.buttonLabel, { color: colors.onAccent }]}>
                  {final ? t('settings.deleteConfirm') : t('settings.deleteAgree')}
                </Text>
              </Pressable>
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.buttonLabel, { color: colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </WebFrame>
    </Modal>
  );
}

function Item({ mark, markColor, text }: { mark: string; markColor: string; text: string }) {
  const colors = useColors();
  return (
    <View style={styles.item}>
      <Text style={[styles.mark, { color: markColor }]}>{mark}</Text>
      <Text style={[styles.itemText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#00000066',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 14,
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badgeIcon: {
    fontSize: 28,
    lineHeight: 34,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  box: {
    alignSelf: 'stretch',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    marginTop: 16,
  },
  boxLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  item: {
    flexDirection: 'row',
    gap: 8,
  },
  mark: {
    width: 14,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttons: {
    alignSelf: 'stretch',
    gap: 4,
    marginTop: 20,
  },
  button: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
