import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useColors } from '@/theme';

import type { AppSwitchProps } from './app-switch';

const WIDTH = 51;
const HEIGHT = 31;
const INSET = 2;
const THUMB = HEIGHT - 2 * INSET;
const TRAVEL = WIDTH - THUMB - 2 * INSET;

// The iPhone's switch drawn on the web, where react-native-web's own is Android's (a thin track under
// a colored knob). A white knob sliding in a full track, the app's accent when on.
export function AppSwitch({ value, onValueChange, disabled, accessibilityLabel }: AppSwitchProps) {
  const colors = useColors();
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [position, value]);

  return (
    <Pressable
      role="switch"
      aria-checked={value}
      aria-label={accessibilityLabel}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        { backgroundColor: value ? colors.accent : colors.switchTrack },
        disabled && styles.disabled,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [
              {
                translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] }),
              },
            ],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    padding: INSET,
  },
  disabled: {
    opacity: 0.5,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 1px rgba(0, 0, 0, 0.06)',
  },
});
