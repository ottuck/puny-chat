import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { WebFrame } from '@/components/web-frame';
import { errorMessage } from '@/features/room/error-message';
import { confirm } from '@/lib/confirm';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

import { removePartner } from '../api';

export function PartnerSheet({
  visible,
  onClose,
  roomId,
  targetId,
  partnerName,
  onRemoved,
}: {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  targetId: string;
  partnerName: string;
  onRemoved: () => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const requestId = useRef<string | null>(null);
  const removing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (removing.current) return;
    removing.current = true;
    setBusy(true);
    try {
      const ok = await confirm({
        title: t('support.removeTitle'),
        message: t('support.removeConfirm', { name: partnerName }),
        confirmLabel: t('support.remove'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      requestId.current ??= randomUUID();
      setError(null);
      await removePartner({
        requestId: requestId.current,
        roomId,
        targetId,
        report: false,
        description: t('support.remove'),
      });
      await onRemoved();
      onClose();
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      removing.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !busy && onClose()}
    >
      <WebFrame>
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
          <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              accessibilityRole="button"
              style={styles.close}
            >
              <Text style={{ color: colors.accent }}>{t('common.close')}</Text>
            </Pressable>
            <Text style={[styles.name, { color: colors.text }]}>{partnerName}</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              {t('support.partnerHelp')}
            </Text>
            <Button
              label={t('support.reportAndRemove')}
              disabled={busy}
              onPress={() => {
                onClose();
                router.push({ pathname: '/support', params: { type: 'report', roomId, targetId } });
              }}
            />
            <Button
              label={t('support.remove')}
              disabled={busy}
              variant="secondary"
              onPress={remove}
            />
            {busy ? <ActivityIndicator color={colors.accent} /> : null}
            {error ? (
              <Text accessibilityRole="alert" style={{ color: colors.accent }}>
                {error}
              </Text>
            ) : null}
          </View>
        </View>
      </WebFrame>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, padding: 24, gap: 16 },
  close: { alignSelf: 'flex-end', padding: 8 },
  name: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 23 },
});
