import * as AppleAuthentication from 'expo-apple-authentication';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/theme';

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

// Apple's own button, which its guidelines approve as is (title, logo, colours), sized like the
// app's buttons: "Continue with Apple" (signing in or linking alike), white, so the screen's own
// main button stays the one that stands out. Its own outline is black and cannot be recoloured, so
// the white style sits in the app's light outline instead, like the other secondary buttons. It
// cannot be disabled itself, so a busy screen blocks taps around it.
export function AppleButton({ onPress, disabled }: Props) {
  const colors = useColors();
  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      style={[styles.frame, { borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={25}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  button: {
    height: 50,
  },
});
