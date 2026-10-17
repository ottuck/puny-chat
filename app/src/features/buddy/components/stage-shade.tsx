import { StyleSheet, View } from 'react-native';

// A soft shadow just under the stage, over the top of the chat: the room sits above and the
// messages pass beneath it, rather than being cut off by a flat line. Takes no height.
const STRIPS = [0.1, 0.06, 0.03];

export function StageShade() {
  return (
    <View style={styles.anchor} pointerEvents="none">
      {STRIPS.map((alpha) => (
        <View key={alpha} style={[styles.strip, { backgroundColor: `rgba(0, 0, 0, ${alpha})` }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    height: 0,
    zIndex: 1,
    overflow: 'visible',
  },
  strip: {
    height: 2,
  },
});
