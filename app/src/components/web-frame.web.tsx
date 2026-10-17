import { type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

// On a wide browser window the app sits in a phone-sized frame on a quieter backdrop, so it reads
// as one app screen instead of a column lost in the page (docs/PROJECT.md, 플랫폼). Narrow
// windows (phones) get the app edge to edge. The frame itself is CSS in app/+html.tsx, keyed by
// these ids: a media query needs no window size in JavaScript, so the page rendered at build time
// already has it, and resizing the window never remounts the app.
// Transparent modals reuse the frame's bounds without covering the page behind them.
export function WebFrame({
  children,
  transparent = false,
}: PropsWithChildren<{ transparent?: boolean }>) {
  return (
    <View nativeID={transparent ? 'web-overlay-backdrop' : 'web-backdrop'} style={styles.fill}>
      <View nativeID={transparent ? 'web-overlay-frame' : 'web-frame'} style={styles.fill}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
