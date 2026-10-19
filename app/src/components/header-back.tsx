import { type Href, router } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/theme';

import { ChevronLeftIcon } from './icons';

// Back, or when there is nowhere to go back to (the web, opened by its address or reloaded; the
// stack starts at this screen), the fallback: the app's home, which the screen passes in.
export function goBack(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

// The headers' back button, always there (the stack's own one hides without history). The iPhone
// puts it in its own round button; the web draws one like it in the same place, with the title
// centered as on the iPhone.
export function HeaderBack({ home }: { home: Href }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => goBack(home)}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={12}
      style={({ pressed }) =>
        Platform.OS === 'web' && [
          styles.round,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.6 : 1,
          },
        ]
      }
    >
      <ChevronLeftIcon color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    width: 44,
    height: 44,
    marginLeft: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
