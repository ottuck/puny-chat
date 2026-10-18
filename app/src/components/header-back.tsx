import { type Href, router } from 'expo-router';
import { HeaderTitle } from 'expo-router/react-navigation';
import { type ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/auth-provider';
import { useColors } from '@/theme';

import { ChevronLeftIcon } from './icons';

// Back, or when there is nowhere to go back to (the web, opened by its address or reloaded; the
// stack starts at this screen), home: the chat, or the first screen before signing in. The route
// guards then pick the right place for a signed-in person without a room or a name.
export function goBack(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export function useHome(): Href {
  const { user } = useAuth();
  return user ? '/' : '/sign-in';
}

// The headers' back button, always there (the stack's own one hides without history).
export function HeaderBack() {
  const colors = useColors();
  const { t } = useTranslation();
  const home = useHome();
  return (
    <Pressable
      onPress={() => goBack(home)}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={12}
    >
      <ChevronLeftIcon color={colors.text} />
    </Pressable>
  );
}

// The web's header puts the title right after the arrow, so "‹ 설정" reads as one button: the title
// goes back too. The iPhone's title is centered on its own and stays only a title.
export function HeaderBackTitle(props: ComponentProps<typeof HeaderTitle>) {
  const home = useHome();
  return (
    <Pressable
      onPress={() => goBack(home)}
      accessibilityRole="button"
      hitSlop={{ top: 12, bottom: 12, right: 12 }}
    >
      <HeaderTitle {...props} />
    </Pressable>
  );
}
