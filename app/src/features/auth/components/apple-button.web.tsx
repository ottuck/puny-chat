import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColorMode } from '@/theme';

type Props = {
  kind: 'signIn' | 'link';
  onPress: () => void;
  disabled?: boolean;
};

// The web has no Apple button of its own, so it follows Apple's guidelines for a custom one: the
// Apple logo and "Sign in with Apple" / "Continue with Apple", black (white in dark mode), sized
// like the app's buttons and like the iPhone's (apple-button.ios.tsx).
export function AppleButton({ kind, onPress, disabled }: Props) {
  const { t } = useTranslation();
  const dark = useColorMode() === 'dark';
  const foreground = dark ? '#000000' : '#ffffff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: dark ? '#ffffff' : '#000000' },
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path fill={foreground} d={APPLE_LOGO} />
      </Svg>
      <Text style={[styles.label, { color: foreground }]}>
        {t(kind === 'signIn' ? 'signIn.apple' : 'settings.linkApple')}
      </Text>
    </Pressable>
  );
}

const APPLE_LOGO =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
