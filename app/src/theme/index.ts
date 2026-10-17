import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

import { usePreferences } from '@/lib/preferences';

const light = {
  background: '#F6F4F1',
  surface: '#FFFFFF',
  border: '#E7E2DC',
  switchTrack: '#B8B2AB',
  text: '#2B2622',
  textMuted: '#8A817A',
  accent: '#F07A4A',
  onAccent: '#FFFFFF',
  bubbleMine: '#FFE1D2',
  bubbleMineText: '#3A2A22',
  bubbleTheirs: '#FFFFFF',
  bubbleTheirsText: '#2B2622',
  online: '#3CC37A',
  fullness: '#F5B642',
  cleanliness: '#58B7E8',
  // The buddy's stage: a soft toy-screen tint, not a monochrome LCD.
  stage: '#EAF3E3',
  stageFloor: '#D6E6C8',
  stageLine: '#B8CFA4',
  // Floors that come with levels (docs/fun-improvements.md, 방 소품): boards, then tatami.
  stageWood: '#E7D2B2',
  stageWoodLine: '#CDAF88',
  stageTatami: '#DCDDB0',
  stageTatamiLine: '#C9CB97',
  stageTatamiEdge: '#6E7A55',
  // The hot spring: misty, with a stone floor.
  bath: '#D4E9F4',
  bathFloor: '#CCD7DC',
  bathLine: '#AEBDC4',
  // Over the bamboo fence: it stays in the back at night too.
  bathDim: 'rgba(0, 0, 0, 0)',
};

export type Colors = typeof light;

const dark: Colors = {
  background: '#16161A',
  surface: '#1F1F24',
  border: '#2E2E35',
  switchTrack: '#66616B',
  text: '#EDEAE6',
  textMuted: '#9A948E',
  accent: '#F07A4A',
  onAccent: '#FFFFFF',
  bubbleMine: '#5A3527',
  bubbleMineText: '#FFE9DE',
  bubbleTheirs: '#26262C',
  bubbleTheirsText: '#EDEAE6',
  online: '#3CC37A',
  fullness: '#F5B642',
  cleanliness: '#58B7E8',
  stage: '#1E2822',
  stageFloor: '#27352C',
  stageLine: '#36493C',
  stageWood: '#3B3229',
  stageWoodLine: '#4D4135',
  stageTatami: '#343A2B',
  stageTatamiLine: '#3F4634',
  stageTatamiEdge: '#1E2419',
  bath: '#1B2529',
  bathFloor: '#25323A',
  bathLine: '#37464F',
  bathDim: 'rgba(27, 37, 41, 0.5)',
};

// One subscription per component for its lifetime. react-native-web's useColorScheme subscribes
// again on every render, and a component that re-renders all the time (the buddy's stage) missed
// the change to dark mode.
function subscribe(onChange: () => void) {
  const subscription = Appearance.addChangeListener(onChange);
  return () => subscription.remove();
}

function scheme() {
  return Appearance.getColorScheme();
}

/** Light or dark as shown: the choice in settings, else the device's. */
export function useColorMode(): 'light' | 'dark' {
  const device = useSyncExternalStore(subscribe, scheme, scheme);
  const { theme } = usePreferences();
  if (theme !== 'system') return theme;
  return device === 'dark' ? 'dark' : 'light';
}

export function useColors(): Colors {
  return useColorMode() === 'dark' ? dark : light;
}

// Web shows the same mobile layout, centered and capped at this width (docs/PROJECT.md, 플랫폼).
export const MAX_CONTENT_WIDTH = 560;
