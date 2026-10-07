type Props = {
  kind: 'signIn' | 'link';
  onPress: () => void;
  disabled?: boolean;
};

// Apple's button exists only on iPhone (apple-button.ios.tsx).
export function AppleButton(_props: Props) {
  return null;
}
