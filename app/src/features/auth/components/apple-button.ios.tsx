import * as AppleAuthentication from 'expo-apple-authentication';
import { StyleSheet, View } from 'react-native';

import { useColorMode } from '@/theme';

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

// Apple's own button, which its guidelines approve as is (title, logo, colours), sized like the
// app's buttons: "Continue with Apple" (signing in or linking alike), white with an outline so the
// screen's own main button stays the one that stands out (white on dark). It cannot be disabled
// itself, so a busy screen blocks taps around it.
export function AppleButton({ onPress, disabled }: Props) {
  const mode = useColorMode();
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={{ opacity: disabled ? 0.5 : 1 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          mode === 'dark'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
        }
        cornerRadius={26}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
  },
});
