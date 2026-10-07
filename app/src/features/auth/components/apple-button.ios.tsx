import * as AppleAuthentication from 'expo-apple-authentication';
import { StyleSheet, View } from 'react-native';

import { useColorMode } from '@/theme';

type Props = {
  kind: 'signIn' | 'link';
  onPress: () => void;
  disabled?: boolean;
};

// Apple's own button, which its guidelines approve as is (title, logo, colours), sized like the
// app's buttons. It cannot be disabled itself, so a busy screen blocks taps around it.
export function AppleButton({ kind, onPress, disabled }: Props) {
  const mode = useColorMode();
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={{ opacity: disabled ? 0.5 : 1 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={
          kind === 'signIn'
            ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
        }
        buttonStyle={
          mode === 'dark'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
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
