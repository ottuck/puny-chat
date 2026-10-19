import { Platform, Switch } from 'react-native';

import { useColors } from '@/theme';

export type AppSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

// The system switch in the app's colors. The web draws the iPhone's instead (app-switch.web.tsx).
export function AppSwitch({ value, onValueChange, disabled, accessibilityLabel }: AppSwitchProps) {
  const colors = useColors();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.switchTrack, true: colors.accent }}
      ios_backgroundColor={colors.switchTrack}
      thumbColor={Platform.OS === 'ios' ? undefined : colors.onAccent}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
