import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WebFrame } from '@/components/web-frame';

type Props = {
  // The photo to show; null when closed.
  uri: string | null;
  onClose: () => void;
};

// A photo across the whole screen on black. A tap anywhere closes it: there is nothing else to do
// here (no zoom, no saving; docs/PROJECT.md, 사진).
export function PhotoViewer({ uri, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={uri !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <WebFrame transparent>
        <Pressable
          style={styles.screen}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.photo}
              resizeMode="contain"
              accessibilityLabel={t('chat.photoMessage')}
            />
          ) : null}
          <View style={[styles.close, { top: 12 + insets.top }]}>
            <Text style={styles.closeText}>✕</Text>
          </View>
        </Pressable>
      </WebFrame>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  // Only a sign: the tap anywhere closes.
  close: {
    pointerEvents: 'none',
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
